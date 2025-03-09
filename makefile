# GitHub翻訳エクステンション ビルド用Makefile

# 設定変数
EXTENSION_NAME = github-translation-extension
VERSION := $(shell grep '"version"' manifest.json | sed -E 's/.*"version": "([^"]+)".*/\1/')
BUILD_DIR = ./build
DIST_DIR = ./dist
ZIP_FILE = $(DIST_DIR)/$(EXTENSION_NAME)-$(VERSION).zip
BETA_BUILD_DIR = ./build-beta
BETA_ZIP_FILE = $(DIST_DIR)/$(EXTENSION_NAME)-$(VERSION)-BETA.zip

# 含めるファイルとディレクトリ
INCLUDE_FILES = manifest.json background.js content.js popup options lib config icons LICENSE README.md

# デフォルトターゲット
.PHONY: all
all: clean build package

# ビルドディレクトリの作成
.PHONY: build
build:
	@echo "ビルドを開始します..."
	@mkdir -p $(BUILD_DIR)
	@mkdir -p $(DIST_DIR)
	@cp manifest.json $(BUILD_DIR)/
	@cp background.js $(BUILD_DIR)/
	@cp content.js $(BUILD_DIR)/
	@cp -r popup $(BUILD_DIR)/
	@cp -r options $(BUILD_DIR)/
	@cp -r lib $(BUILD_DIR)/
	@cp -r config $(BUILD_DIR)/
	@cp -r icons $(BUILD_DIR)/
	@cp LICENSE $(BUILD_DIR)/ 2>/dev/null || true
	@cp README.md $(BUILD_DIR)/ 2>/dev/null || true
	@echo "ビルド完了!"

# パッケージング（zip生成）
.PHONY: package
package:
	@echo "パッケージングを開始します... バージョン: $(VERSION)"
	@cd $(BUILD_DIR) && zip -r ../$(ZIP_FILE) ./* -x "*.DS_Store" "*__MACOSX*" "*.git*"
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
	@echo "すべてのクリーンアップが完了しました!"

# ヘルプを表示
.PHONY: help
help:
	@echo "利用可能なコマンド:"
	@echo "  make            : 拡張機能をビルドしてzipファイルを生成します"
	@echo "  make build      : ビルドディレクトリに必要なファイルをコピーします"
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
	@mkdir -p $(BETA_BUILD_DIR)
	@mkdir -p $(DIST_DIR)
	@cp manifest.json $(BETA_BUILD_DIR)/
	@cp background.js $(BETA_BUILD_DIR)/
	@cp content.js $(BETA_BUILD_DIR)/
	@cp -r popup $(BETA_BUILD_DIR)/
	@cp -r options $(BETA_BUILD_DIR)/
	@cp -r lib $(BETA_BUILD_DIR)/
	@cp -r config $(BETA_BUILD_DIR)/
	@cp -r icons $(BETA_BUILD_DIR)/
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
	@cd $(BETA_BUILD_DIR) && zip -r ../$(BETA_ZIP_FILE) ./* -x "*.DS_Store" "*__MACOSX*" "*.git*"
	@echo "ベータ版パッケージング完了! $(BETA_ZIP_FILE) を生成しました"
	@echo "このファイルをChrome Web Storeにアップロードしてください"
