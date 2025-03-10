# GitHub翻訳エクステンション TypeScript版 ビルド用Makefile

# 設定変数
EXTENSION_NAME = github-translation-extension
VERSION := $(shell grep '"version"' src/manifest.json | sed -E 's/.*"version": "([^"]+)".*/\1/')
DIST_DIR = ./dist
BUILD_DIR = ./build
ZIP_FILE = $(BUILD_DIR)/$(EXTENSION_NAME)-$(VERSION).zip
BETA_BUILD_DIR = ./build-beta
BETA_ZIP_FILE = $(BUILD_DIR)/$(EXTENSION_NAME)-$(VERSION)-BETA.zip

# デフォルトターゲット
.PHONY: all
all: clean build package

# TypeScript用ビルドプロセス (webpackを使用)
.PHONY: build
build:
	@echo "TypeScriptビルドを開始します..."
	@npm run build
	@mkdir -p $(BUILD_DIR)
	@cp -r $(DIST_DIR)/* $(BUILD_DIR)
	@cp LICENSE $(BUILD_DIR)/ 2>/dev/null || true
	@cp README.md $(BUILD_DIR)/ 2>/dev/null || true
	@echo "ビルド完了!"

# 開発用ビルド (ソースマップあり)
.PHONY: dev
dev:
	@echo "開発用ビルドを開始します..."
	@npm run dev
	@echo "開発用ビルド完了!"

# 型チェック
.PHONY: typecheck
typecheck:
	@echo "型チェックを実行しています..."
	@npx tsc --noEmit
	@echo "型チェック完了!"

# コードスタイルチェック (ESLint)
.PHONY: lint
lint:
	@echo "ESLintを実行しています..."
	@npx eslint --ext .ts src/
	@echo "Lintチェック完了!"

# コードスタイル自動修正
.PHONY: lint-fix
lint-fix:
	@echo "ESLintの自動修正を実行しています..."
	@npx eslint --fix --ext .ts src/
	@echo "Lint自動修正完了!"

# パッケージング（zip生成）
.PHONY: package
package:
	@echo "パッケージングを開始します... バージョン: $(VERSION)"
	@mkdir -p $(BUILD_DIR)
	@cd $(BUILD_DIR) && zip -r $(ZIP_FILE) ./* -x "*.DS_Store" "*__MACOSX*" "*.git*" "*.map"
	@echo "パッケージング完了! $(ZIP_FILE) を生成しました"
	@echo "このファイルをChrome Web Storeにアップロードしてください"

# 一時ファイルやビルドファイルを削除
.PHONY: clean
clean:
	@echo "クリーンアップを開始します..."
	@rm -rf $(BUILD_DIR)
	@rm -rf $(BETA_BUILD_DIR)
	@echo "クリーンアップ完了!"

# 配布ファイルを含めてすべてのビルドファイルを削除
.PHONY: clean-all
clean-all: clean
	@echo "配布ファイルを削除します..."
	@rm -rf $(DIST_DIR)
	@rm -rf node_modules
	@echo "すべてのクリーンアップが完了しました!"

# ヘルプを表示
.PHONY: help
help:
	@echo "利用可能なコマンド:"
	@echo "  make            : 拡張機能をビルドしてzipファイルを生成します"
	@echo "  make build      : TypeScriptコードをビルドします"
	@echo "  make dev        : 開発用ビルドを実行します（ソースマップあり）"
	@echo "  make typecheck  : 型チェックを実行します"
	@echo "  make lint       : ESLintでコードスタイルをチェックします"
	@echo "  make lint-fix   : ESLintでコードスタイルを自動修正します"
	@echo "  make package    : ビルドディレクトリからzipファイルを生成します"
	@echo "  make beta       : ベータ版の拡張機能をビルドしてzipファイルを生成します"
	@echo "  make clean      : ビルドディレクトリを削除します"
	@echo "  make clean-all  : ビルドとdistディレクトリを削除します"
	@echo "  make help       : このヘルプを表示します"
	@echo ""
	@echo "現在のバージョン: $(VERSION)"

# バージョン情報を表示
.PHONY: version
version:
	@echo "現在のバージョン: $(VERSION)"

# ベータ版ビルドとパッケージング
.PHONY: beta
beta: clean beta-build beta-package

# ベータ版ビルド
.PHONY: beta-build
beta-build:
	@echo "ベータ版ビルドを開始します..."
	@npm run build
	@mkdir -p $(BETA_BUILD_DIR)
	@cp -r $(DIST_DIR)/* $(BETA_BUILD_DIR)
	@cp LICENSE $(BETA_BUILD_DIR)/ 2>/dev/null || true
	@cp README.md $(BETA_BUILD_DIR)/ 2>/dev/null || true
	
	@# manifest.jsonが存在するか確認
	@if [ ! -f "$(BETA_BUILD_DIR)/manifest.json" ]; then \
		echo "エラー: $(BETA_BUILD_DIR)/manifest.json が見つかりません"; \
		exit 1; \
	fi
	
	@# ベータ版用に manifest.json を修正（GNU sed と BSD sed の両方に対応）
	@if [ "$(shell uname)" = "Darwin" ]; then \
		sed -i '' 's/"name": "GitHub翻訳エクステンション"/"name": "GitHub翻訳エクステンション BETA"/' $(BETA_BUILD_DIR)/manifest.json; \
		sed -i '' 's/"description": "GitHubリポジトリに保存された翻訳データを使用してウェブページを翻訳します"/"description": "THIS EXTENSION IS FOR BETA TESTING（この拡張機能はベータ版テスト用です） GitHubリポジトリに保存された翻訳データを使用してウェブページを翻訳します"/' $(BETA_BUILD_DIR)/manifest.json; \
	else \
		sed -i 's/"name": "GitHub翻訳エクステンション"/"name": "GitHub翻訳エクステンション BETA"/' $(BETA_BUILD_DIR)/manifest.json; \
		sed -i 's/"description": "GitHubリポジトリに保存された翻訳データを使用してウェブページを翻訳します"/"description": "THIS EXTENSION IS FOR BETA TESTING（この拡張機能はベータ版テスト用です） GitHubリポジトリに保存された翻訳データを使用してウェブページを翻訳します"/' $(BETA_BUILD_DIR)/manifest.json; \
	fi
	
	@echo "ベータ版ビルド完了!"

# ベータ版パッケージング
.PHONY: beta-package
beta-package:
	@echo "ベータ版パッケージングを開始します... バージョン: $(VERSION)-BETA"
	@mkdir -p $(BUILD_DIR)
	@cd $(BETA_BUILD_DIR) && zip -r ../$(BETA_ZIP_FILE) ./* -x "*.DS_Store" "*__MACOSX*" "*.git*" "*.map"
	@echo "ベータ版パッケージング完了! $(BETA_ZIP_FILE) を生成しました"
	@echo "このファイルをChrome Web Storeにアップロードしてください"

# 一から全部ビルド
.PHONY: rebuild
rebuild: clean-all install build package

# npm依存関係インストール
.PHONY: install
install:
	@echo "npm依存関係をインストールしています..."
	@npm install
	@echo "インストール完了!"
