# GitHub翻訳Chrome拡張機能 引き継ぎ文書（最新版）

## プロジェクト概要

GitHubリポジトリーに保存された翻訳データを用いて、Webサイト（主にGitHub）の翻訳を行うChrome拡張機能です。翻訳定義はYAML形式で管理され、ドメインごとに異なる翻訳設定を適用します。

## ファイル構造

```bash
Multillingual-Website-Translation/
│
├── manifest.json               # 拡張機能の設定ファイル
├── background.js               # バックグラウンド処理
├── content.js                  # ページ内容の翻訳処理
├── popup/
│   ├── popup.html              # ポップアップUI
│   ├── popup.css               # ポップアップスタイル
│   └── popup.js                # ポップアップロジック
│
├── options/
│   ├── options.html            # 設定画面UI
│   ├── options.css             # 設定画面スタイル
│   └── options.js              # 設定画面ロジック
│
├── lib/
│   ├── js-yaml.min.js          # YAMLパーサーライブラリ (外部から取得)
│   └── simple-yaml.js          # 簡易YAMLパーサー (開発用)
│
├── config/
│   ├── domain-settings.yml     # ドメイン設定サンプル
│   └── translation-config-github.yml  # GitHub翻訳設定サンプル
│
└── icons/
    ├── icon48.png              # 48x48アイコン
    ├── icon128.png             # 128x128アイコン
    └── icon250.png             # 250x250アイコン
```

## 主要ファイルの説明

### manifest.json

Chrome拡張機能の設定ファイル。Manifest V3形式で作成されています。コンテンツスクリプト、バックグラウンドスクリプト、パーミッションなどを定義しています。

```json
{
  "manifest_version": 3,
  "name": "GitHub翻訳エクステンション",
  "version": "0.2.0",
  "description": "GitHubリポジトリに保存された翻訳データを使用してウェブページを翻訳します",
  "permissions": [
    "storage",
    "tabs",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://github.com/*",
    "https://api.github.com/*",
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "48": "icons/icon48.png",
      "128": "icons/icon128.png",
      "250": "icons/icon250.png"
    }
  },
  "options_ui": {
    "page": "options/options.html",
    "open_in_tab": true
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["lib/js-yaml.min.js", "content.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
    "250": "icons/icon250.png"
  },
  "web_accessible_resources": [
    {
      "resources": ["lib/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### 翻訳ファイル形式 (YAML)

翻訳データはYAML形式で定義されます。正規表現対応を追加しました。例:

```yaml
# GitHub翻訳設定ファイル
site: "github.com"
language: "日本語"
description: "GitHub UIの日本語翻訳"
version: "0.3.0"
author: "開発者"
last_updated: "2025-03-09"

# 翻訳エントリー
translations:
  # ナビゲーション
  - original: "Pull requests"
    translated: "プルリクエスト"
    context: "メインナビゲーション"
    
  - original: "Issues"
    translated: "課題"
    context: "メインナビゲーション"
    
  # リポジトリページタブ
  - original: "Code"
    translated: "コード"
    context: "リポジトリタブ"
    
  # 正規表現パターンによる翻訳（新機能）
  - original: "Issue #(\\d+)"
    translated: "課題 #$1"
    context: "課題表示"
    regex: true
    
  - original: "(\\d+) commits?"
    translated: "$1 コミット"
    context: "コミット数"
    regex: true
```

### ドメイン設定ファイル形式 (YAML)

拡張機能内で管理されるドメイン設定もYAML形式です:

```yaml
# ドメイン翻訳設定
domains:
  - domain: "github.com"
    name: "GitHub UI 翻訳"
    repository: "https://raw.githubusercontent.com/223n-tech/Multillingual-Website-Translation/refs/heads/master/config/translation-config-github.yml"
    enabled: true
    description: "GitHub UI の日本語翻訳"
```

## 主要機能

1. **複数ドメインの管理**:
   - 異なるWebサイトに対して異なる翻訳設定を適用可能
   - 各ドメインごとに有効/無効の切り替えが可能

2. **GitHubリポジトリとの連携**:
   - 翻訳データはGitHubリポジトリに保存し、読み込む
   - チームでの翻訳データの共有・編集が容易

3. **翻訳設定のインポート/エクスポート**:
   - YAML形式での設定のインポート/エクスポートをサポート

4. **動的DOM変更への対応**:
   - MutationObserverを使用して動的に変更されるコンテンツも翻訳

5. **GitHubの特殊UI構造への対応**:
   - GitHubの特殊なDOM構造（data-content属性など）に対応した翻訳処理

6. **正規表現マッチング（新機能）**:
   - 正規表現パターンによる柔軟なテキストマッチングと置換
   - 可変部分を含むテキスト（数字やIDなど）の翻訳が可能

7. **翻訳エントリー管理UI（新機能）**:
   - ドメインごとの翻訳エントリーの追加・編集・削除機能
   - 正規表現テストツールによる動作確認機能

## 技術的な実装詳細

### 翻訳の流れ

1. ページが読み込まれたとき、または更新されたとき、現在のドメインの翻訳設定を確認
2. 設定が有効であれば、GitHubリポジトリから翻訳データを取得
3. ページ内のテキストノードを走査し、翻訳対象のテキストを置換
4. DOMの変更を監視して、新たに追加された要素も翻訳対象に

### 翻訳処理の最適化

1. **処理済み要素の追跡**:
   - WeakSetを使用して処理済みの要素を追跡し、重複処理を防止

2. **翻訳マップの事前構築**:
   - 通常の完全一致用と正規表現パターン用に分かれた2階層のマップ構造
   - 検索効率を高めるために翻訳エントリーをマップ形式で保持

3. **テキスト正規化**:
   - スペースの揺らぎなどに対応するためのテキスト正規化処理

4. **属性値の翻訳**:
   - aria-label, alt, placeholder, title, data-contentなどの属性値も翻訳対象

### 正規表現マッチングの実装（新機能）

```javascript
// 翻訳マップの作成（正規表現対応版）
function createTranslationMap(translationsList) {
  const map = {
    exact: {},     // 通常の完全一致用マップ
    regex: []      // 正規表現パターン用配列
  };
  
  translationsList.forEach(entry => {
    // 正規表現パターンの場合
    if (entry.regex) {
      try {
        // 正規表現オブジェクトを作成して保存
        const regexPattern = new RegExp(entry.original, 'g');
        map.regex.push({
          pattern: regexPattern,
          replacement: entry.translated,
          context: entry.context
        });
      } catch (error) {
        console.error(`無効な正規表現: ${entry.original}`, error);
      }
    } 
    // 通常のテキスト（完全一致）の場合
    else {
      // 元のテキストをキーとして使用
      const key = entry.original.trim();
      map.exact[key] = entry.translated;
      
      // スペースの有無による揺らぎに対応
      const keyNoExtraSpaces = key.replace(/\s+/g, ' ');
      if (keyNoExtraSpaces !== key) {
        map.exact[keyNoExtraSpaces] = entry.translated;
      }
    }
  });
  
  return map;
}

// テキストノードの翻訳処理（正規表現対応）
function translateTextNode(node, translationMap) {
  // 1. 完全一致での翻訳を試みる
  // 2. 正規表現での翻訳を試みる
  for (const regexEntry of translationMap.regex) {
    regexEntry.pattern.lastIndex = 0; // 毎回検索位置をリセット
    if (regexEntry.pattern.test(text)) {
      regexEntry.pattern.lastIndex = 0;
      text = text.replace(regexEntry.pattern, regexEntry.replacement);
      translated = true;
      break; // 最初にマッチしたパターンで翻訳を終了
    }
  }
}
```

### GitHubの特殊要素への対応

GitHubのUIはReactベースで特殊なDOM構造を持つため、標準的なテキストノード処理だけでは十分ではありません。以下の特殊処理を追加しています:

1. **data-content属性の処理**:
   - `<span data-content="Actions">Actions</span>` のような構造に対応

2. **特定クラス名要素の処理**:
   - `.UnderlineNav-item`, `.js-selected-navigation-item` などの特殊クラスに対応

3. **動的属性変更の監視**:
   - data-content属性の変更を監視して、動的に更新される要素も翻訳

## UI改善（新機能）

### 電灯スイッチ風トグルボタン

オン・オフ状態が一目でわかる電灯スイッチのような凹凸感のあるトグルボタンを実装:

```css
/* 電灯スイッチ風のトグルスタイル */
.switch {
  position: relative;
  display: inline-block;
  width: 70px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 15px;
  background: #e1e4e8;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.2);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* オンとオフのラベル部分 */
.slider:before, .slider:after {
  content: "";
  position: absolute;
  width: 50%;
  height: 100%;
  top: 0;
  border-radius: 13px;
  font-size: 12px;
  font-weight: bold;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* オフ状態のボタン部分 */
.slider:before {
  content: "無効";
  left: 0;
}

/* オン状態のボタン部分 */
.slider:after {
  content: "有効";
  right: 0;
}

/* チェックされていない状態では無効ボタンが沈む */
input:not(:checked) + .slider:before {
  transform: translateY(2px);
  box-shadow: 0 0 1px rgba(0, 0, 0, 0.1);
  background-color: #e1e4e8;
  color: #24292e;
}

/* チェックされた状態では有効ボタンが沈む */
input:checked + .slider:after {
  transform: translateY(2px);
  box-shadow: 0 0 1px rgba(0, 0, 0, 0.1);
  background-color: #2ea44f;
  color: white;
}
```

### モーダルダイアログの改善

翻訳エントリー管理モーダルのスクロール問題を修正:

```css
/* モーダルの内容をスクロール可能にする */
.modal-content {
  max-height: 90vh; /* 画面の90%の高さを上限に */
  overflow-y: auto; /* 縦方向のスクロールを許可 */
}

/* エントリーリストアクションのスタイル調整 */
.entry-list-actions {
  position: sticky;
  top: 0;
  background-color: white;
  z-index: 10;
}

/* 保存・閉じるボタン領域を固定 */
.entry-modal-buttons {
  position: sticky;
  bottom: 0;
  background-color: white;
  z-index: 10;
}
```

## デバッグ・開発

1. **デバッグログ**:
   - content.jsとbackground.jsにデバッグログ機能を実装
   - DEBUG変数をtrueに設定するとコンソールに詳細なログが出力される

2. **開発モード**:
   - リポジトリが設定されていない場合は開発用のサンプル翻訳データを使用

3. **Chrome拡張機能の開発方法**:
   - chrome://extensions/ を開き、デベロッパーモードを有効にする
   - 「パッケージ化されていない拡張機能を読み込む」でプロジェクトフォルダーを選択

4. **正規表現テストツール**（新機能）:
   - 設定画面内で正規表現パターンのテストが可能
   - マッチング結果と置換結果のプレビュー表示

## 今後の拡張可能性

1. **さらに柔軟なマッチング**:
   - 曖昧マッチングや近似マッチングの実装
   - 文脈を考慮した翻訳精度の向上

2. **複数言語対応**:
   - 複数の言語への翻訳を切り替え可能に

3. **UI改善の継続**:
   - 翻訳漏れの報告機能
   - 統計情報の可視化

4. **GitHubとの連携強化**:
   - GitHubのAPIを使用した翻訳データの更新・プルリクエスト作成
   - 現在はファイルダウンロード方式のため、自動的にリポジトリに反映されない

5. **翻訳統計**:
   - 翻訳されたテキストの数やカバレッジなどの統計情報表示

6. **パフォーマンス最適化**:
   - 大量の翻訳エントリーを扱う場合の処理速度向上
   - 正規表現パターンのキャッシュや最適化

## ライセンスおよび依存ライブラリ

- **js-yaml**: YAMLパーサーライブラリ（MIT License）
- **simple-yaml.js**: 簡易YAMLパーサー（開発用、独自実装）

## 注意事項

- GitHubの仕様変更によってDOM構造が変わる可能性があるため、定期的なメンテナンスが必要です
- 翻訳データはGitHubリポジトリ経由で取得するため、適切なアクセス権限の設定が必要です
- 正規表現のパフォーマンスには注意が必要です（過度に複雑なパターンは避ける）
- スイッチボタンのデザインはデバイスやブラウザによって若干の表示差異がある可能性があります