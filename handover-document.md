# GitHub翻訳Chrome拡張機能 引き継ぎ文書

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
└── icons/
    ├── icon48.png              # 48x48アイコン
    ├── icon128.png              # 128x128アイコン
    └── icon250.png             # 250x250アイコン
```

## 主要ファイルの説明

### manifest.json

Chrome拡張機能の設定ファイル。Manifest V3形式で作成されています。コンテンツスクリプト、バックグラウンドスクリプト、パーミッションなどを定義しています。

```json
{
  "manifest_version": 3,
  "name": "GitHub翻訳エクステンション",
  "version": "1.0.0",
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
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
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
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
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

翻訳データはYAML形式で定義されます。例:

```yaml
# GitHub翻訳設定ファイル
site: "github.com"
language: "日本語"
description: "GitHub UIの日本語翻訳"
version: "1.0.0"
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
```

### ドメイン設定ファイル形式 (YAML)

拡張機能内で管理されるドメイン設定もYAML形式です:

```yaml
# ドメイン翻訳設定
domains:
  - domain: "github.com"
    name: "GitHub UI 翻訳"
    repository: "https://raw.githubusercontent.com/username/translations/main/github-translations.yml"
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
   - 検索効率を高めるために翻訳エントリーをマップ形式で保持

3. **テキスト正規化**:
   - スペースの揺らぎなどに対応するためのテキスト正規化処理

4. **属性値の翻訳**:
   - aria-label, alt, placeholder, title, data-contentなどの属性値も翻訳対象

### GitHubの特殊要素への対応

GitHubのUIはReactベースで特殊なDOM構造を持つため、標準的なテキストノード処理だけでは十分ではありません。以下の特殊処理を追加しています:

1. **data-content属性の処理**:
   - `<span data-content="Actions">Actions</span>` のような構造に対応

2. **特定クラス名要素の処理**:
   - `.UnderlineNav-item`, `.js-selected-navigation-item` などの特殊クラスに対応

3. **動的属性変更の監視**:
   - data-content属性の変更を監視して、動的に更新される要素も翻訳

## デバッグ・開発

1. **デバッグログ**:
   - content.jsとbackground.jsにデバッグログ機能を実装
   - DEBUG変数をtrueに設定するとコンソールに詳細なログが出力される

2. **開発モード**:
   - リポジトリが設定されていない場合は開発用のサンプル翻訳データを使用

3. **Chrome拡張機能の開発方法**:
   - chrome://extensions/ を開き、デベロッパーモードを有効にする
   - 「パッケージ化されていない拡張機能を読み込む」でプロジェクトフォルダーを選択

## 今後の拡張可能性

1. **より柔軟なマッチング**:
   - 正規表現による部分一致や曖昧マッチングの実装

2. **複数言語対応**:
   - 複数の言語への翻訳を切り替え可能に

3. **UI改善**:
   - 翻訳エントリーの直接編集機能の追加
   - 翻訳漏れの報告機能

4. **GitHubとの連携強化**:
   - GitHubのAPIを使用した翻訳データの更新・プルリクエスト作成

5. **翻訳統計**:
   - 翻訳されたテキストの数やカバレッジなどの統計情報表示

## ライセンスおよび依存ライブラリ

- **js-yaml**: YAMLパーサーライブラリ（MIT License）
- **simple-yaml.js**: 簡易YAMLパーサー（開発用、独自実装）

## 注意点

- GitHubの仕様変更によってDOM構造が変わる可能性があるため、定期的なメンテナンスが必要です
- 翻訳データはGitHubリポジトリ経由で取得するため、適切なアクセス権限の設定が必要です
