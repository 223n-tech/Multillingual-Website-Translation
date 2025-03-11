# Multillingual-Website-Translation

## プロジェクト概要

GitHubのリポジトリーに保存された翻訳データを用いて、Webサイト（主にGitHub）の翻訳を行うChrome拡張機能です。
翻訳定義はYAML形式で管理されており、ドメインごとに異なる翻訳設定を適用します。

## TypeScript版について

現在、TypeScript版を試験開発中です。
まだ、エラーなどの解消ができていない可能性が高いため、
developブランチにマージされるまで使用しないことを推奨します。

## 主な機能

1. **複数ドメインの管理**:
   - 異なるWebサイトに対して異なる翻訳設定を適用可能！
   - 各ドメインごとに有効/無効の切り替えが可能！
2. **GitHubリポジトリとの連携**:
   - 翻訳データはGitHubリポジトリに保存した内容を読み込みます
   - チームでの翻訳データの共有・編集が容易！
3. **翻訳設定のインポート/エクスポート**:
   - YAML形式での設定のインポート/エクスポートをサポート！
4. **動的DOM変更への対応**:
   - MutationObserverを使用して動的に変更されるコンテンツも翻訳！
5. **GitHubの特殊UI構造への対応**:
   - GitHubの特殊なDOM構造（data-content属性など）に対応した翻訳処理！

## 主なファイルの説明

### 翻訳ファイル形式 (YAML)

翻訳データはYAML形式で定義されています。

```yaml
# GitHub翻訳設定ファイル
site: "github.com"                      # 対象のサイトドメイン
language: "日本語"                      # 翻訳後の言語
description: "GitHub UIの日本語翻訳"    # 翻訳ファイルの説明
version: "1.0.0"                        # 翻訳ファイルのバージョン
author: "223n"                          # 作成者の名前
last_updated: "2025-03-09"              # 最終更新日

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
```

### ドメイン設定ファイル形式 (YAML)

拡張機能内で管理されるドメイン設定もYAML形式で定義されています。
この設定は、拡張機能でインポートすることもできます。
また、拡張機能で設定した内容をエクスポートすることも可能です。

```yaml
# ドメイン翻訳設定
domains:
  - domain: "github.com"                    # 翻訳対象のサイトドメイン
    name: "GitHub UI 翻訳"                  # 説明
    repository: "https://raw.githubusercontent.com/223n-tech/Multillingual-Website-Translation/refs/heads/master/config/translation-config-github.yml"
                                            # リポジトリーに保存してある設定ファイルのURL
    enabled: true                           # 有効・無効
    description: "GitHub UI の日本語翻訳"   # 説明
```

## ビルド方法

ビルドは、makeコマンドを使います。

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

### ベータ版について

Chromeウェブストアには、ベータ版を公開したあと、本番を公開するように注意書きがあります。
そのため、`make beta`でベータ版のパッケージを生成してベータ版を公開したあと、公開版を公開するようにしてください。

## 注意点

1. GitHubの仕様変更によってDOM構造が変わる可能性があるため、定期的なメンテナンスが必要です。
2. 翻訳データはGitHubリポジトリ経由で取得するため、適切なアクセス権限の設定が必要です。

## node.jsのバージョン変更

```bash
# node.js v.22とv.23のインストール
nvm install 22
nvm install 23

# node.js v.22を適用
nvm use 22
```
