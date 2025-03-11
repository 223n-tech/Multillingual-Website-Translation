import { SettingsService } from './services/settings-service';
import { MessageHandler } from './services/message-handler';
import { TabManager } from './services/tab-manager';
import { debugLog } from '../utils/debug';

/**
 * バックグラウンドスクリプトのメインエントリーポイント
 */
class BackgroundService {
  // 初期化子を使用してnullで初期化
  private settingsService: SettingsService | null = null;
  private messageHandler: MessageHandler | null = null;
  private tabManager: TabManager | null = null;

  constructor() {
    try {
      // サービスの初期化
      this.settingsService = new SettingsService();
      this.messageHandler = new MessageHandler(this.settingsService);
      this.tabManager = new TabManager(this.settingsService);

      // イベントリスナーの設定
      this.registerEventListeners();

      debugLog('バックグラウンドサービス初期化完了');
    } catch (error) {
      console.error('バックグラウンドサービス初期化エラー:', error);
      debugLog('バックグラウンドサービス初期化エラー:', error);
    }
  }

  private keepAlive() {
    debugLog('Service Worker キープアライブ処理実行');
    setTimeout(this.keepAlive, keepAliveInterval);
  }

  /**
   * イベントリスナーを登録
   */
  private registerEventListeners(): void {
    try {
      // NULLチェックを追加
      if (!this.settingsService || !this.messageHandler || !this.tabManager) {
        throw new Error('サービスが正しく初期化されていません');
      }

      // インストール時の初期設定
      chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));

      // メッセージハンドラを登録
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
          if (!this.messageHandler) {
            sendResponse({ success: false, error: 'メッセージハンドラーが初期化されていません' });
            return false;
          }
          return this.messageHandler.handleMessage(message, sender, sendResponse);
        } catch (error) {
          console.error('メッセージハンドリングエラー:', error);
          debugLog('メッセージハンドリングエラー:', error);
          sendResponse({ success: false, error: String(error) });
          return false;
        }
      });

      // タブ更新時のイベント
      chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        try {
          if (!this.tabManager) {
            debugLog('タブマネージャーが初期化されていません');
            return;
          }
          this.tabManager.handleTabUpdated(tabId, changeInfo, tab);
        } catch (error) {
          console.error('タブ更新処理エラー:', error);
          debugLog('タブ更新処理エラー:', error);
        }
      });

      debugLog('イベントリスナー登録完了');
    } catch (error) {
      console.error('イベントリスナー登録エラー:', error);
      debugLog('イベントリスナー登録エラー:', error);
    }
  }

  /**
   * 拡張機能インストール時の処理
   */
  private async handleInstalled(details: chrome.runtime.InstalledDetails): Promise<void> {
    try {
      debugLog('拡張機能インストール:', details.reason);

      // NULLチェックを追加
      if (!this.settingsService) {
        throw new Error('設定サービスが初期化されていません');
      }

      // 初回インストール時のみデフォルト設定を適用
      if (details.reason === 'install') {
        await this.settingsService.initializeDefaultSettings();
        debugLog('デフォルト設定を適用しました');
      }
    } catch (error) {
      console.error('インストール処理エラー:', error);
      debugLog('インストール処理エラー:', error);
    }
  }
}

// バックグラウンドサービスを初期化
try {
  const _backgroundService = new BackgroundService();

  // Chromeの拡張機能はServiceWorker環境で動作するため、
  // ServiceWorkerGlobalScopeの代わりにWindowのTypeを使用
  if (typeof self !== 'undefined') {
    // 'activate'イベントリスナーを追加
    self.addEventListener('activate', (event) => {
      debugLog('Service Worker アクティブ化', event);
    });

    // デバッグ用のメッセージリスナーを追加
    self.addEventListener('message', (event) => {
      debugLog('Service Worker メッセージ受信:', event.data);
    });
  }
} catch (error) {
  console.error('バックグラウンドサービス初期化中にエラーが発生しました:', error);
  debugLog('バックグラウンドサービス致命的エラー:', error);
}

// グローバルエラーハンドリング
self.addEventListener('error', (event) => {
  console.error('バックグラウンドスクリプトでグローバルエラーが発生しました:', event.error);
  debugLog('バックグラウンドスクリプトグローバルエラー:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('バックグラウンドスクリプトで未処理のPromise拒否が発生しました:', event.reason);
  debugLog('バックグラウンドスクリプト未処理Promise拒否:', event.reason);
});

// エコーメッセージハンドラーを追加 (デバッグページ用)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'echo') {
    sendResponse({ success: true, data: message.data });
    return true;
  } else if (message.action === 'checkStatus') {
    sendResponse({ success: true, status: 'running' });
    return true;
  } else if (message.action === 'resetSettings') {
    try {
      const settingsService = new SettingsService();
      settingsService
        .initializeDefaultSettings()
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({ success: false, error: String(error) });
        });
      return true;
    } catch (error) {
      sendResponse({ success: false, error: String(error) });
      return true;
    }
  }
  // その他のメッセージはクラス内のハンドラーに処理させる
  return false;
});

// background/index.ts の最後に追加または修正
// グローバルスコープでリスナーを登録する

// バックグラウンドスクリプトのデバッグ用メッセージハンドラー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'echo') {
    debugLog('Echoメッセージを受信:', message.data);
    sendResponse({ success: true, data: message.data });
    return true; // 非同期レスポンスのため
  }

  if (message.action === 'checkStatus') {
    debugLog('ステータスチェックメッセージを受信');
    sendResponse({ success: true, status: 'running' });
    return true;
  }

  if (message.action === 'resetSettings') {
    debugLog('設定リセットメッセージを受信');
    try {
      const settingsService = new SettingsService();
      settingsService
        .initializeDefaultSettings()
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({ success: false, error: String(error) });
        });
      return true;
    } catch (error) {
      sendResponse({ success: false, error: String(error) });
      return true;
    }
  }

  // その他のメッセージはクラス内のハンドラーに処理させる
  return false;
});

// バックグラウンドの起動時間を記録
const startTime = Date.now();

// グローバルメッセージハンドラー
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'echo') {
    debugLog('Echoメッセージを受信:', message.data);
    sendResponse({ success: true, data: message.data });
    return true;
  }

  if (message.action === 'checkStatus') {
    debugLog('ステータスチェックメッセージを受信');
    sendResponse({ success: true, status: 'running' });
    return true;
  }

  if (message.action === 'getDebugInfo') {
    debugLog('デバッグ情報リクエストを受信');

    // 拡張機能の実行時間を計算
    const uptime = Date.now() - startTime;

    // メモリ使用量を推定 (実際のメモリ使用量は取得できないのでダミー)
    const memory = Math.round(Math.random() * 10 + 5); // 5-15MB のダミー値

    sendResponse({
      success: true,
      uptime,
      memory,
      version: chrome.runtime.getManifest().version,
      manifestVersion: chrome.runtime.getManifest().manifest_version,
    });
    return true;
  }

  if (message.action === 'resetSettings') {
    debugLog('設定リセットメッセージを受信');
    try {
      const settingsService = new SettingsService();
      settingsService
        .initializeDefaultSettings()
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          sendResponse({ success: false, error: String(error) });
        });
      return true;
    } catch (error) {
      sendResponse({ success: false, error: String(error) });
      return true;
    }
  }

  // その他のメッセージはクラス内のハンドラーに処理させる
  return false;
});

// Service Worker キープアライブ
const keepAliveInterval = 20000; // 20秒ごと

function keepAlive() {
  debugLog('Service Worker キープアライブ処理実行');
  setTimeout(keepAlive, keepAliveInterval);
}

// バックグラウンドサービス初期化後にキープアライブ処理を開始
keepAlive();
