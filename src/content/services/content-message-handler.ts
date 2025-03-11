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

      // 既に翻訳処理中なら重複実行を避ける
      if (this.translationService.getIsTranslating()) {
        contentDebugLog('既に翻訳処理中のため、リクエストを無視します');
        if (sendResponse) {
          sendResponse({
            success: true,
            error: 'already_translating',
          });
        }
        return;
      }

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

      // ページ再読み込みは最後のリゾートとして、まずは翻訳をリセットする
      this.translationService.resetTranslation(false); // 再読み込みなし

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

  /**
   * MutationObserverを無効化する
   */
  public handleDisableObservers(sendResponse?: (response: GenericResponse) => void): void {
    try {
      contentDebugLog('MutationObserver無効化リクエスト受信');

      // 翻訳サービスを通じて DOM Observer を無効化
      this.translationService.disableObservers();

      if (sendResponse) {
        sendResponse({ success: true });
      }
    } catch (error) {
      console.error('MutationObserver無効化エラー:', error);
      contentDebugLog('MutationObserver無効化エラー', error);

      if (sendResponse) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : '不明なエラー',
        });
      }
    }
  }
}
