import { SettingsService } from './services/settings-service';
import { MessageHandler } from './services/message-handler';
import { TabManager } from './services/tab-manager';
import { debugLog } from '../utils/debug';

/**
 * バックグラウンドスクリプトのメインエントリーポイント
 */
class BackgroundService {
  private settingsService: SettingsService;
  private messageHandler: MessageHandler;
  private tabManager: TabManager;

  constructor() {
    // サービスの初期化
    this.settingsService = new SettingsService();
    this.messageHandler = new MessageHandler(this.settingsService);
    this.tabManager = new TabManager(this.settingsService);

    // イベントリスナーの設定
    this.registerEventListeners();

    debugLog('バックグラウンドサービス初期化完了');
  }

  /**
   * イベントリスナーを登録
   */
  private registerEventListeners(): void {
    // インストール時の初期設定
    chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));

    // メッセージハンドラを登録
    chrome.runtime.onMessage.addListener(
      this.messageHandler.handleMessage.bind(this.messageHandler),
    );

    // タブ更新時のイベント
    chrome.tabs.onUpdated.addListener(this.tabManager.handleTabUpdated.bind(this.tabManager));

    debugLog('イベントリスナー登録完了');
  }

  /**
   * 拡張機能インストール時の処理
   */
  private async handleInstalled(details: chrome.runtime.InstalledDetails): Promise<void> {
    debugLog('拡張機能インストール:', details.reason);

    // 初回インストール時のみデフォルト設定を適用
    if (details.reason === 'install') {
      await this.settingsService.initializeDefaultSettings();
      debugLog('デフォルト設定を適用しました');
    }
  }
}

// バックグラウンドサービスを初期化
const _backgroundService = new BackgroundService();

// Chromeの拡張機能はServiceWorker環境で動作するため、
// ServiceWorkerGlobalScopeの代わりにWindowのTypeを使用
if (typeof self !== 'undefined') {
  // 'activate'イベントリスナーを追加
  self.addEventListener('activate', (event) => {
    debugLog('Service Worker アクティブ化', event);
  });
}
