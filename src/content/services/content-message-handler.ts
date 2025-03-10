import { contentDebugLog } from '../../utils/debug';
import { ContentTranslationService } from './content-translation-service';
import {
  StartTranslationMessage,
  StopTranslationMessage,
  GenericResponse,
} from '../../types/messages';

/**
 * コンテンツスクリプト用メッセージハンドラー
 */
export class ContentMessageHandler {
  private translationService: ContentTranslationService;

  constructor(translationService: ContentTranslationService) {
    this.translationService = translationService;
  }

  /**
   * 翻訳開始メッセージ処理
   */
  public async handleStartTranslation(
    message: StartTranslationMessage,
    sendResponse?: (response: GenericResponse) => void,
  ): Promise<void> {
    try {
      contentDebugLog('翻訳開始メッセージ受信:', message);

      await this.translationService.startTranslation(message.domain);

      if (sendResponse) {
        sendResponse({ success: true });
      }
    } catch (error) {
      console.error('翻訳開始処理エラー:', error);
      contentDebugLog('翻訳開始エラー', error);

      if (sendResponse) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : '不明なエラー',
        });
      }
    }
  }

  /**
   * 翻訳停止メッセージ処理
   */
  public handleStopTranslation(
    message: StopTranslationMessage,
    sendResponse?: (response: GenericResponse) => void,
  ): void {
    try {
      contentDebugLog('翻訳停止メッセージ受信');

      this.translationService.resetTranslation();

      if (sendResponse) {
        sendResponse({ success: true });
      }
    } catch (error) {
      console.error('翻訳停止処理エラー:', error);
      contentDebugLog('翻訳停止エラー', error);

      if (sendResponse) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : '不明なエラー',
        });
      }
    }
  }
}
