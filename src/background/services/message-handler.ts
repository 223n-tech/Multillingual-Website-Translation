import { SettingsService } from './settings-service';
import { TranslationService } from './translation-service';
import {
  TranslationsResponse,
  GenericResponse,
  GetTranslationsMessage,
  ToggleTranslationMessage,
  BaseMessage,
  MessageResponseCallback,
} from '../../types/message-types';
import { debugLog } from '../../utils/debug';

/**
 * メッセージハンドラー
 * コンテンツスクリプトとのメッセージング通信を管理
 */
export class MessageHandler {
  private settingsService: SettingsService;
  private translationService: TranslationService;

  constructor(settingsService: SettingsService) {
    this.settingsService = settingsService;
    this.translationService = new TranslationService();
  }

  /**
   * メッセージハンドラー
   */
  public handleMessage(
    message: BaseMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: MessageResponseCallback,
  ): boolean {
    debugLog('メッセージ受信:', message, 'from:', sender.tab ? sender.tab.url : 'ポップアップ');

    switch (message.action) {
      case 'getTranslationsAndMapping':
        this.handleGetTranslationsAndMapping(message as GetTranslationsMessage, sendResponse);
        break;

      case 'getTranslations': // 後方互換性のため
        this.handleGetTranslations(message.domain as string, sendResponse);
        break;

      case 'toggleTranslation':
        this.handleToggleTranslation(message as ToggleTranslationMessage, sendResponse);
        break;

      default:
        sendResponse({ success: false, error: `未知のアクション: ${message.action}` });
        return false;
    }

    // 非同期レスポンスのため true を返す
    return true;
  }

  /**
   * 翻訳データとマッピングの取得
   */
  private async handleGetTranslationsAndMapping(
    message: GetTranslationsMessage,
    sendResponse: (response: TranslationsResponse) => void,
  ): Promise<void> {
    try {
      debugLog('翻訳データとマッピング取得リクエスト:', message.domain);

      const domainSettings = await this.settingsService.getDomainSettings(message.domain);

      if (!domainSettings) {
        sendResponse({
          success: false,
          error: `ドメイン ${message.domain} の翻訳設定が見つかりませんでした`,
        });
        return;
      }

      // 翻訳データとコンテキストマッピングを並行して取得
      const [translations, contextMapping] = await Promise.all([
        this.translationService.fetchTranslationFile(domainSettings.repository),
        domainSettings.contextMapping
          ? this.translationService.fetchContextMappingFile(domainSettings.contextMapping)
          : Promise.resolve(null),
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

  /**
   * 翻訳データのみ取得（後方互換性用）
   */
  private async handleGetTranslations(
    domain: string,
    sendResponse: (response: TranslationsResponse) => void,
  ): Promise<void> {
    try {
      debugLog('翻訳データ取得リクエスト (旧形式):', domain);

      const domainSettings = await this.settingsService.getDomainSettings(domain);

      if (!domainSettings) {
        sendResponse({
          success: false,
          error: `ドメイン ${domain} の翻訳設定が見つかりませんでした`,
        });
        return;
      }

      const translations = await this.translationService.fetchTranslationFile(
        domainSettings.repository,
      );

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

  /**
   * 翻訳の有効/無効を切り替え
   */
  private async handleToggleTranslation(
    message: ToggleTranslationMessage,
    sendResponse: (response: GenericResponse) => void,
  ): Promise<void> {
    try {
      debugLog('翻訳トグル:', message.active);

      await this.settingsService.toggleTranslation(message.active);

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
}
