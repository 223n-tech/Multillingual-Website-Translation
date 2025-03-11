import { debugLog } from '../utils/debug';
import { AppSettings, DEFAULT_SETTINGS, DomainSettings } from '../types/settings';
import {
  BaseMessage,
  MessageResponseCallback,
  GetTranslationsMessage,
  ToggleTranslationMessage,
  GetTranslationYamlMessage,
} from '../types/message-types';

// 起動時刻を記録
const startTime = Date.now();
debugLog('バックグラウンドスクリプト起動:', new Date().toISOString());

// インストール時の初期化
chrome.runtime.onInstalled.addListener(
  async (details: chrome.runtime.InstalledDetails): Promise<void> => {
    debugLog('拡張機能インストール:', details.reason);

    if (details.reason === 'install') {
      // 初回インストール時にデフォルト設定を適用
      try {
        await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
        debugLog('デフォルト設定を適用しました');
      } catch (error) {
        console.error('デフォルト設定の初期化に失敗:', error);
      }
    }
  },
);

// タブ更新イベント
chrome.tabs.onUpdated.addListener(
  async (
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab,
  ): Promise<void> => {
    // タブの読み込みが完了した場合のみ処理
    if (changeInfo.status !== 'complete' || !tab.url) {
      return;
    }

    try {
      const url = new URL(tab.url);
      const domain = url.hostname;
      debugLog('タブ更新検出:', domain, tabId);

      // 設定を取得
      const data = await chrome.storage.local.get('settings');
      const settings = (data.settings as AppSettings) || DEFAULT_SETTINGS;

      // 翻訳が有効で対象ドメインが存在する場合
      if (settings.active) {
        // ドメイン設定を検索
        let domainSettings: DomainSettings | null = null;

        // GitHub Raw コンテンツの特殊処理
        if (domain === 'raw.githubusercontent.com') {
          domainSettings =
            settings.domains.find((d: DomainSettings) => d.domain === 'github.com' && d.enabled) ||
            null;
        } else {
          domainSettings =
            settings.domains.find((d: DomainSettings) => d.domain === domain && d.enabled) || null;
        }

        if (domainSettings) {
          debugLog('対象ドメイン設定検出:', domainSettings);

          // コンテンツスクリプトに翻訳開始メッセージを送信
          try {
            chrome.tabs.sendMessage(tabId, { action: 'startTranslation', domain });
            debugLog('翻訳開始メッセージ送信成功');
          } catch (error) {
            debugLog('メッセージ送信エラー:', error);

            // 少し待ってから再試行
            setTimeout(() => {
              try {
                chrome.tabs.sendMessage(tabId, { action: 'startTranslation', domain });
              } catch (retryError) {
                debugLog('再試行でもメッセージ送信に失敗:', retryError);
              }
            }, 1000);
          }
        } else {
          debugLog('対象ドメイン設定なし、または無効');
        }
      } else {
        debugLog('翻訳機能無効');
      }
    } catch (error) {
      console.error('タブ更新処理エラー:', error);
    }
  },
);

// メッセージハンドラー
chrome.runtime.onMessage.addListener(
  (
    message: BaseMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: MessageResponseCallback,
  ): boolean => {
    debugLog(
      'メッセージ受信:',
      message,
      sender.tab ? `From: ${sender.tab.url}` : 'From: popup or options',
    );

    // エコーメッセージ処理
    if (message.action === 'echo') {
      sendResponse({ success: true, data: message.data });
      return true;
    }

    // 状態確認処理
    if (message.action === 'checkStatus') {
      sendResponse({
        success: true,
        status: 'running',
        uptime: Date.now() - startTime,
      });
      return true;
    }

    // 翻訳切り替え処理
    if (message.action === 'toggleTranslation') {
      handleToggleTranslation(message as ToggleTranslationMessage, sendResponse);
      return true;
    }

    // 翻訳データ取得処理
    if (message.action === 'getTranslationsAndMapping') {
      handleGetTranslationsAndMapping(message as GetTranslationsMessage, sendResponse);
      return true;
    }

    // 翻訳データのみ取得処理 (後方互換性用)
    if (message.action === 'getTranslations') {
      handleGetTranslations(message.domain as string, sendResponse);
      return true;
    }

    // 翻訳YAML取得処理
    if (message.action === 'getTranslationYaml') {
      handleGetTranslationYaml(message as GetTranslationYamlMessage, sendResponse);
      return true;
    }

    // デバッグ情報取得処理
    if (message.action === 'getDebugInfo') {
      sendResponse({
        success: true,
        uptime: Date.now() - startTime,
        memory: Math.round(Math.random() * 10 + 5), // ダミー値
        version: chrome.runtime.getManifest().version,
        manifestVersion: chrome.runtime.getManifest().manifest_version,
      });
      return true;
    }

    // 設定リセット処理
    if (message.action === 'resetSettings') {
      chrome.storage.local
        .set({ settings: DEFAULT_SETTINGS })
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({ success: false, error: String(error) });
        });
      return true;
    }

    // 未知のアクション
    sendResponse({ success: false, error: `未知のアクション: ${message.action}` });
    return false;
  },
);

// 翻訳切り替え処理の実装
async function handleToggleTranslation(
  message: ToggleTranslationMessage,
  sendResponse: MessageResponseCallback,
): Promise<void> {
  try {
    const active = message.active;
    debugLog('翻訳トグル:', active);

    // 設定を取得して更新
    const data = await chrome.storage.local.get('settings');
    const settings = (data.settings as AppSettings) || DEFAULT_SETTINGS;
    settings.active = active;

    // 更新した設定を保存
    await chrome.storage.local.set({ settings });

    sendResponse({ success: true });
    debugLog('翻訳トグル成功');
  } catch (error) {
    console.error('翻訳トグルに失敗:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    });
  }
}

// ドメイン設定取得ヘルパー
async function getDomainSettings(domain: string): Promise<DomainSettings | null> {
  try {
    const data = await chrome.storage.local.get('settings');
    const settings = (data.settings as AppSettings) || DEFAULT_SETTINGS;

    // GitHub Raw コンテンツの特殊処理
    if (domain === 'raw.githubusercontent.com') {
      const githubSettings = settings.domains.find(
        (d: DomainSettings) => d.domain === 'github.com' && d.enabled,
      );
      if (githubSettings) {
        debugLog('raw.githubusercontent.com に対して github.com の設定を使用');
        return githubSettings;
      }
    }

    const domainSettings = settings.domains.find(
      (d: DomainSettings) => d.domain === domain && d.enabled,
    );
    return domainSettings || null;
  } catch (error) {
    console.error(`ドメイン ${domain} の設定取得に失敗:`, error);
    return null;
  }
}

// 翻訳データとマッピングの取得処理の実装
async function handleGetTranslationsAndMapping(
  message: GetTranslationsMessage,
  sendResponse: MessageResponseCallback,
): Promise<void> {
  try {
    debugLog('翻訳データとマッピング取得リクエスト:', message.domain);

    const domainSettings = await getDomainSettings(message.domain);

    if (!domainSettings) {
      sendResponse({
        success: false,
        error: `ドメイン ${message.domain} の翻訳設定が見つかりませんでした`,
      });
      return;
    }

    // 翻訳データを取得
    const translationsPromise = fetch(domainSettings.repository).then((response) => {
      if (!response.ok) {
        throw new Error(`翻訳ファイルの取得に失敗しました: ${response.status}`);
      }
      return response.text();
    });

    // コンテキストマッピングを取得（存在する場合）
    const contextMappingPromise = domainSettings.contextMapping
      ? fetch(domainSettings.contextMapping).then((response) => {
          if (!response.ok) {
            throw new Error(`コンテキストマッピングの取得に失敗しました: ${response.status}`);
          }
          return response.text();
        })
      : Promise.resolve(null);

    // 両方のデータを並行して取得
    const [translations, contextMapping] = await Promise.all([
      translationsPromise,
      contextMappingPromise,
    ]);

    sendResponse({
      success: true,
      translations,
      contextMapping: contextMapping || undefined,
    });

    debugLog('翻訳データとマッピング取得成功');
  } catch (error) {
    console.error('翻訳データとマッピングの取得に失敗:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    });
  }
}

// 翻訳データのみ取得（後方互換性用）
async function handleGetTranslations(
  domain: string,
  sendResponse: MessageResponseCallback,
): Promise<void> {
  try {
    debugLog('翻訳データ取得リクエスト (旧形式):', domain);

    const domainSettings = await getDomainSettings(domain);

    if (!domainSettings) {
      sendResponse({
        success: false,
        error: `ドメイン ${domain} の翻訳設定が見つかりませんでした`,
      });
      return;
    }

    // 翻訳ファイルを取得
    const response = await fetch(domainSettings.repository);
    if (!response.ok) {
      throw new Error(`翻訳ファイルの取得に失敗しました: ${response.status}`);
    }

    const translations = await response.text();

    sendResponse({
      success: true,
      translations,
    });

    debugLog('翻訳データ取得成功 (旧形式)');
  } catch (error) {
    console.error('翻訳データの取得に失敗:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    });
  }
}

// 翻訳YAMLの取得処理の実装
async function handleGetTranslationYaml(
  message: GetTranslationYamlMessage,
  sendResponse: MessageResponseCallback,
): Promise<void> {
  try {
    debugLog('翻訳YAMLデータ取得リクエスト:', message.domain);

    const domainSettings = await getDomainSettings(message.domain);

    if (!domainSettings) {
      sendResponse({
        success: false,
        error: `ドメイン ${message.domain} の翻訳設定が見つかりませんでした`,
      });
      return;
    }

    // 翻訳ファイルを取得
    const response = await fetch(domainSettings.repository);
    if (!response.ok) {
      throw new Error(`翻訳ファイルの取得に失敗しました: ${response.status}`);
    }

    const yaml = await response.text();

    sendResponse({
      success: true,
      yaml,
    });

    debugLog('翻訳YAMLデータ取得成功');
  } catch (error) {
    console.error('翻訳YAMLデータの取得に失敗:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    });
  }
}

// Service Worker のキープアライブ処理
const KEEP_ALIVE_INTERVAL = 20000; // 20秒ごと

function keepAlive(): void {
  debugLog('Service Worker キープアライブ');
  setTimeout(keepAlive, KEEP_ALIVE_INTERVAL);
}

// キープアライブ処理を開始
keepAlive();

// エラーイベントリスナー
self.addEventListener('error', (event: ErrorEvent) => {
  console.error('Service Worker エラー:', event.error);
  debugLog('Service Worker エラー:', event.error);
});

self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  console.error('Service Worker 未処理のPromise拒否:', event.reason);
  debugLog('Service Worker 未処理のPromise拒否:', event.reason);
});

// Service Worker アクティベーションイベント
self.addEventListener('activate', (event: ExtendableEvent) => {
  debugLog('Service Worker アクティブ化', event);
});
