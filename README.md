# GitHub Translator Extension

## プロジェクト概要

GitHubのリポジトリーに保存された翻訳データを用いて、Webサイト（主にGitHub）の翻訳を行うChrome拡張機能です。
翻訳定義はYAML形式で管理されており、ドメインごとに異なる翻訳設定を適用できます。

## 特徴

このプロジェクトは以前のバージョンをTypeScriptで完全に書き直したものです。機能を強化し、コードの保守性を向上させています。

## 主な機能

1. **複数ドメインの管理**:
   - 異なるWebサイトに対して異なる翻訳設定を適用可能
   - 各ドメインごとに有効/無効の切り替えが可能
   
2. **GitHubリポジトリとの連携**:
   - 翻訳データはGitHubリポジトリに保存した内容を読み込み
   - チームでの翻訳データの共有・編集が容易

3. **翻訳設定のインポート/エクスポート**:
   - YAML形式での設定のインポート/エクスポートをサポート

4. **動的DOM変更への対応**:
   - MutationObserverを使用して動的に変更されるコンテンツも翻訳
   
5. **GitHubの特殊UI構造への対応**:
   - GitHubの特殊なDOM構造（data-content属性など）に対応した翻訳処理
   
6. **コンテキスト対応翻訳**:
   - UI要素のコンテキストに応じた適切な翻訳を適用
   - 同じテキストでも表示場所によって異なる翻訳が可能

7. **正規表現対応**:
   - 正規表現パターンを用いた柔軟な翻訳
   - 数値を含むテキストなど可変部分を含む文字列にも対応

## ファイル構成

```
src/
  ├── background/     # バックグラウンドスクリプト
  ├── content/        # コンテンツスクリプト（翻訳処理の本体）
  ├── options/        # 設定画面関連
  ├── popup/          # ポップアップUI関連
  ├── types/          # TypeScript型定義
  └── utils/          # ユーティリティ関数

```

## 翻訳ファイル形式 (YAML)

翻訳データはYAML形式で定義されています。

```yaml
# GitHub翻訳設定ファイル
site: "github.com"                      # 対象のサイトドメイン
language: "日本語"                      # 翻訳後の言語
description: "GitHub UIの日本語翻訳"    # 翻訳ファイルの説明
version: "1.0.0"                        # 翻訳ファイルのバージョン
author: "223n"                          # 作成者の名前
last_updated: "2025-03-11"              # 最終更新日

# 翻訳エントリー
translations:
  # ナビゲーション
  - original: "Pull requests"           # オリジナルの文字列
    translated: "プルリクエスト"        # 翻訳後の文字列
    context: "メインナビゲーション"     # オリジナルの配置場所
    
  - original: "Issues"
    translated: "課題"
    context: "メインナビゲーション"
    
  # リポジトリページタブ
  - original: "Code"
    translated: "コード"
    context: "リポジトリタブ"
    
  # 正規表現パターン例
  - original: "Issue #(\\d+)"
    translated: "課題 #$1"
    context: "課題表示"
    regex: true
```

### コンテキストマッピング形式 (YAML)

UI要素のコンテキストを特定するためのマッピング設定もYAML形式で定義されています。

```yaml
# コンテキストマッピング設定
settings:
  unknown_context: "ignore"      # 未知のコンテキスト処理方法
  empty_context: "global"        # 空コンテキスト処理方法

# コンテキスト定義
contexts:
  メインナビゲーション:
    selectors:
      - ".AppHeader-globalBar a"
      - ".header-nav-item"
    description: "ヘッダー部分のナビゲーションメニュー"
  
  リポジトリタブ:
    selectors:
      - ".UnderlineNav-item"
      - ".js-selected-navigation-item"
    description: "リポジトリページのタブメニュー"

# 正規表現コンテキスト
regex_contexts:
  課題表示:
    apply_to:
      - ".js-issue-title"
      - ".issue-link"
```

## ビルド方法

このプロジェクトはTypeScriptとWebpackを使用しています。

### 必要環境

- Node.js v22以上
- npm v11以上

### 開発環境のセットアップ

```bash
# リポジトリのクローン
git clone https://github.com/223n-tech/GitHub-Translator-Extension.git
cd GitHub-Translator-Extension

# 依存パッケージのインストール
npm install

# 開発ビルド（ウォッチモード）
npm run start

# 本番ビルド
npm run build
```

### makeコマンドによるビルド

より詳細なビルドオプションはmakeコマンドで提供されています：

```bash
利用可能なコマンド:
  make            : 拡張機能をビルドしてzipファイルを生成します
  make build      : TypeScriptコードをビルドします
  make dev        : 開発用ビルドを実行します（ソースマップあり）
  make typecheck  : 型チェックを実行します
  make lint       : ESLintでコードスタイルをチェックします
  make lint-fix   : ESLintでコードスタイルを自動修正します
  make package    : ビルドディレクトリからzipファイルを生成します
  make beta       : ベータ版の拡張機能をビルドしてzipファイルを生成します
  make clean      : ビルドディレクトリを削除します
  make clean-all  : ビルドとdistディレクトリを削除します
  make help       : このヘルプを表示します
  make version    : 現在のバージョン情報を表示します
  make bump-patch : パッチバージョンを更新します
  make bump-minor : マイナーバージョンを更新します
  make bump-major : メジャーバージョンを更新します
```

### Chromeウェブストアへの公開

Chromeウェブストアに公開する場合は、まずベータ版として公開し、問題がなければ正式版を公開することが推奨されています。

```bash
# ベータ版ビルド
make beta

# ベータ版テスト後、正式版ビルド
make
```

## ブラウザへのインストール

開発版を直接ブラウザにインストールする方法：

1. Chromeで `chrome://extensions/` を開きます
2. 右上の「デベロッパーモード」を有効にします
3. 「パッケージ化されていない拡張機能を読み込む」をクリックします
4. プロジェクトの `dist` ディレクトリを選択します

## 注意点

1. GitHubの仕様変更によってDOM構造が変わる可能性があるため、定期的なメンテナンスが必要です
2. 翻訳データはGitHubリポジトリ経由で取得するため、適切なアクセス権限の設定が必要です
3. コンテンツスクリプトのCSP（Content Security Policy）制約に注意してください
4. Chrome拡張機能APIの仕様変更に追従する必要があります

## ライセンス

MIT License - 詳細は [LICENSE](./LICENSE) ファイルを参照してください。

## 開発環境

```bash
# node.jsのバージョン切り替え (nvmを使用)
nvm use 22

# 必要なnpmバージョン
npm install -g npm@11.2.0
```
