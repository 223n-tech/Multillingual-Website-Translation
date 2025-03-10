// バックグラウンドスクリプト
// ドメイン設定の初期化とイベントリスナーの設定

// デバッグフラグ
const DEBUG = true;

// デバッグログ関数
function debugLog(...args) {
  if (DEBUG) {
    console.log('[翻訳拡張 BG]', ...args);
  }
}

// 初期設定の読み込み
chrome.runtime.onInstalled.addListener(async () => {
  // デフォルトの設定を保存
  const defaultSettings = {
    active: true,
    domains: [
      // GitHub用のデフォルト設定を追加
      {
        domain: "github.com",
        name: "GitHub UI 翻訳",
        repository: "https://raw.githubusercontent.com/223n-tech/github-translation/refs/heads/master/translation-config-github.yml",
        contextMapping: "https://raw.githubusercontent.com/223n-tech/github-translation/refs/heads/master/context-mapping.yml",
        enabled: true,
        description: "GitHub UI の日本語翻訳"
      }
    ]
  };
  
  await chrome.storage.local.set({ settings: defaultSettings });
  debugLog('拡張機能インストール完了、デフォルト設定適用:', defaultSettings);
});

// コンテンツスクリプトからのメッセージ処理
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog('メッセージ受信:', message, 'from:', sender.tab ? sender.tab.url : 'ポップアップ');
  
  // 後方互換性のための処理
  if (message.action === 'getTranslations') {
    // ドメインに基づいて翻訳データを取得
    debugLog('翻訳データ取得リクエスト (旧形式):', message.domain);
    
    fetchTranslationsForDomain(message.domain)
      .then(translations => {
        debugLog('翻訳データ取得成功 (旧形式)');
        sendResponse({ success: true, translations });
      })
      .catch(error => {
        console.error('翻訳データの取得に失敗しました:', error);
        debugLog('翻訳データ取得失敗:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // 非同期レスポンスのため true を返す
  }
  
  // 新形式: 翻訳データとコンテキストマッピングの両方を取得
  if (message.action === 'getTranslationsAndMapping') {
    // ドメインに基づいて翻訳データとコンテキストマッピングを取得
    debugLog('翻訳データとマッピング取得リクエスト:', message.domain);
    
    fetchTranslationsAndMappingForDomain(message.domain)
      .then(data => {
        debugLog('翻訳データとマッピング取得成功');
        sendResponse({ 
          success: true, 
          translations: data.translations,
          contextMapping: data.contextMapping
        });
      })
      .catch(error => {
        console.error('翻訳データとマッピングの取得に失敗しました:', error);
        debugLog('取得失敗:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // 非同期レスポンスのため true を返す
  }
  
  if (message.action === 'toggleTranslation') {
    debugLog('翻訳トグル:', message.active);
    
    toggleTranslationState(message.active)
      .then(() => {
        debugLog('翻訳トグル成功');
        sendResponse({ success: true });
      })
      .catch(error => {
        debugLog('翻訳トグル失敗:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }
});

// 現在のタブのURLが変更されたとき
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const domain = new URL(tab.url).hostname;
    debugLog('タブ更新検出:', domain, tabId);
    
    // タブが完全に読み込まれたときに、そのドメインの翻訳設定を確認
    chrome.storage.local.get('settings', (data) => {
      debugLog('設定読み込み:', data.settings);
      
      if (data.settings && data.settings.active) {
        const domainSettings = data.settings.domains.find(d => d.domain === domain && d.enabled);
        
        if (domainSettings) {
          debugLog('対象ドメイン設定検出:', domainSettings);
          // そのドメインの翻訳が有効であれば、コンテンツスクリプトに通知
          chrome.tabs.sendMessage(tabId, {
            action: 'startTranslation',
            domain: domain
          }, response => {
            if (chrome.runtime.lastError) {
              debugLog('メッセージ送信エラー:', chrome.runtime.lastError);
              // コンテンツスクリプトがまだ読み込まれていない可能性がある
              // 少し遅延して再試行
              setTimeout(() => {
                chrome.tabs.sendMessage(tabId, {
                  action: 'startTranslation',
                  domain: domain
                });
              }, 1000);
            } else {
              debugLog('翻訳開始メッセージ送信成功:', response);
            }
          });
        } else {
          debugLog('対象ドメイン設定なし、または無効');
        }
      } else {
        debugLog('翻訳機能無効、またはドメイン設定なし');
      }
    });
  }
});

// 指定されたドメインの翻訳データとコンテキストマッピングを取得
async function fetchTranslationsAndMappingForDomain(domain) {
  try {
    debugLog('翻訳データとマッピング取得開始:', domain);
    
    // ドメイン設定を取得
    const { settings } = await chrome.storage.local.get('settings');
    debugLog('設定読み込み:', settings);
    
    const domainSetting = settings.domains.find(d => d.domain === domain && d.enabled);
    
    if (!domainSetting) {
      const errorMsg = `ドメイン ${domain} の翻訳設定が見つからないか、無効になっています。`;
      debugLog(errorMsg);
      throw new Error(errorMsg);
    }
    
    debugLog('対象ドメイン設定検出:', domainSetting);
    
    // 開発用のサンプルYAML (GitHub翻訳ファイルがない場合)
    if (domainSetting.repository.includes('username/translations') || 
        !domainSetting.repository.startsWith('http')) {
      debugLog('開発用サンプルYAMLを使用');
      
      // サンプル翻訳データ
      const sampleTranslations = `
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
    
  - original: "Marketplace"
    translated: "マーケットプレイス"
    context: "メインナビゲーション"
    
  - original: "Explore"
    translated: "探索"
    context: "メインナビゲーション"
    
  # リポジトリページ
  - original: "Code"
    translated: "コード"
    context: "リポジトリタブ"
    
  - original: "Pull requests"
    translated: "プルリクエスト"
    context: "リポジトリタブ"
      `;
      
      // サンプルコンテキストマッピング
      const sampleContextMapping = `
# コンテキストマッピング設定ファイル
settings:
  unknown_context: "ignore"
  empty_context: "global"

# コンテキストマッピング定義
contexts:
  "メインナビゲーション":
    selectors:
      - ".AppHeader-globalBar a"
      - ".header-nav-item"
      - ".HeaderMenu-link"
    description: "ヘッダー部分のナビゲーションメニュー"
  
  "リポジトリタブ":
    selectors:
      - ".UnderlineNav-item"
      - ".js-selected-navigation-item"
      - ".reponav-item"
    description: "リポジトリページのタブメニュー"
      `;
      
      return {
        translations: sampleTranslations,
        contextMapping: sampleContextMapping
      };
    }
    
    // 翻訳データとコンテキストマッピングを並行して取得
    debugLog('GitHubからの翻訳ファイル取得開始:', domainSetting.repository);
    
    const translationsPromise = fetch(domainSetting.repository)
      .then(response => {
        if (!response.ok) {
          throw new Error(`翻訳ファイルの取得に失敗しました: ${response.status} ${response.statusText}`);
        }
        return response.text();
      });
    
    // コンテキストマッピングURLが指定されている場合は取得、なければnull
    const contextMappingPromise = domainSetting.contextMapping ? 
      fetch(domainSetting.contextMapping)
        .then(response => {
          if (!response.ok) {
            debugLog(`コンテキストマッピングの取得に失敗しました (無視): ${response.status} ${response.statusText}`);
            return null;
          }
          return response.text();
        })
        .catch(error => {
          debugLog('コンテキストマッピングの取得中にエラー (無視):', error);
          return null;
        })
      : Promise.resolve(null);
    
    // 両方のデータを取得して結果を返す
    const [translations, contextMapping] = await Promise.all([
      translationsPromise,
      contextMappingPromise
    ]);
    
    debugLog('翻訳ファイル取得成功:', translations.substring(0, 100) + '...');
    if (contextMapping) {
      debugLog('コンテキストマッピング取得成功:', contextMapping.substring(0, 100) + '...');
    } else {
      debugLog('コンテキストマッピングなし、デフォルト設定を使用');
    }
    
    return {
      translations,
      contextMapping
    };
  } catch (error) {
    console.error('翻訳データとマッピングの取得エラー:', error);
    debugLog('取得エラー:', error);
    throw error;
  }
}

// 後方互換性のために残す: 翻訳データのみを取得
async function fetchTranslationsForDomain(domain) {
  try {
    debugLog('ドメイン用翻訳データ取得開始:', domain);
    
    // 新しい関数を使用して両方取得し、翻訳データのみを返す
    const data = await fetchTranslationsAndMappingForDomain(domain);
    return data.translations;
  } catch (error) {
    console.error('翻訳データ取得エラー:', error);
    debugLog('翻訳データ取得エラー:', error);
    throw error;
  }
}

// 翻訳の有効/無効を切り替え
async function toggleTranslationState(active) {
  try {
    debugLog('翻訳トグル開始:', active);
    
    const { settings } = await chrome.storage.local.get('settings');
    settings.active = active;
    await chrome.storage.local.set({ settings });
    
    debugLog('翻訳トグル保存完了');
    return true;
  } catch (error) {
    console.error('翻訳状態の変更に失敗しました:', error);
    debugLog('翻訳トグルエラー:', error);
    throw error;
  }
}

debugLog('バックグラウンドスクリプト初期化完了');
