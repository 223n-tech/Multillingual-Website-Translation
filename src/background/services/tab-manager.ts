import { SettingsService } from './settings-service';
import { debugLog } from '../../utils/debug';

/**
 * タブ管理サービス
 * タブの更新を監視し、翻訳を適用
 */
export class TabManager {
  private settingsService: SettingsService;

  constructor(settingsService: SettingsService) {
    this.settingsService = settingsService;
  }

  /**
   * タブ更新イベントハンドラ
   */
  public async handleTabUpdated(
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab,
  ): Promise<void> {
    // タブの読み込みが完了した場合のみ処理
    if (changeInfo.status !== 'complete' || !tab.url) {
      return;
    }

    try {
      const url = new URL(tab.url);
      const domain = url.hostname;

      debugLog('タブ更新検出:', domain, tabId);

      // 設定を取得
      const settings = await this.settingsService.getSettings();

      // 翻訳が有効でドメイン設定がある場合
      if (settings.active) {
        const domainSettings = await this.settingsService.getDomainSettings(domain);

        if (domainSettings) {
          debugLog('対象ドメイン設定検出:', domainSettings);

          // コンテンツスクリプトに翻訳開始メッセージを送信
          this.sendStartTranslationMessage(tabId, domain);
        } else {
          debugLog('対象ドメイン設定なし、または無効');
        }
      } else {
        debugLog('翻訳機能無効');
      }
    } catch (error) {
      console.error('タブ更新処理エラー:', error);
    }
  }

  private sendStartTranslationMessage(tabId: number, domain: string): void {
    // 最大再試行回数を設定
    const maxRetries = 3;
    let retryCount = 0;

    const tryToSendMessage = () => {
      chrome.tabs.sendMessage(tabId, { action: 'startTranslation', domain }, (response) => {
        if (chrome.runtime.lastError) {
          debugLog('メッセージ送信エラー:', chrome.runtime.lastError);

          // 最大再試行回数に達していなければ再試行
          if (retryCount < maxRetries) {
            retryCount++;
            debugLog(`${retryCount}回目の再試行を${retryCount * 1000}ms後に実行します`);

            // 再試行間隔を徐々に長くする
            setTimeout(tryToSendMessage, retryCount * 1000);
          } else {
            debugLog(`最大再試行回数(${maxRetries})に達したため中止します`);
          }
        } else {
          debugLog('翻訳開始メッセージ送信成功:', response);
        }
      });
    };

    // 最初の試行
    tryToSendMessage();
  }
}
