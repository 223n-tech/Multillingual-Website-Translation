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

  /**
   * 翻訳開始メッセージをタブに送信
   */
  private sendStartTranslationMessage(tabId: number, domain: string): void {
    chrome.tabs.sendMessage(tabId, { action: 'startTranslation', domain }, (response) => {
      if (chrome.runtime.lastError) {
        debugLog('メッセージ送信エラー:', chrome.runtime.lastError);

        // コンテンツスクリプトがまだ読み込まれていない可能性があるため、遅延して再試行
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { action: 'startTranslation', domain });
        }, 1000);
      } else {
        debugLog('翻訳開始メッセージ送信成功:', response);
      }
    });
  }
}
