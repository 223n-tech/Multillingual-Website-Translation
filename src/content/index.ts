import { contentDebugLog } from '../utils/debug';
import { ContentTranslationService } from './services/content-translation-service';
import { ContentMessageHandler } from './services/content-message-handler';
import {
  StartTranslationMessage,
  StopTranslationMessage,
  BaseMessage,
  MessageResponseCallback,
} from '../types/message-types';

/**
 * コンテンツスクリプトのメインクラス
 */
class ContentScript {
  private translationService: ContentTranslationService;
  private messageHandler: ContentMessageHandler;
  private initialized = false;

  constructor() {
    this.translationService = new ContentTranslationService();
    this.messageHandler = new ContentMessageHandler(this.translationService);

    contentDebugLog('コンテンツスクリプト初期化開始');
    this.initialize();
  }

  /**
   * 初期化処理
   */
  private initialize(): void {
    if (this.initialized) {
      return;
    }

    // バックグラウンドスクリプトからのメッセージを受信
    chrome.runtime.onMessage.addListener(
      (message: BaseMessage, sender, sendResponse: MessageResponseCallback) => {
        contentDebugLog('メッセージ受信:', message);

        if (message.action === 'startTranslation') {
          this.messageHandler.handleStartTranslation(
            message as StartTranslationMessage,
            sendResponse,
          );
          return true;
        } else if (message.action === 'stopTranslation') {
          this.messageHandler.handleStopTranslation(
            message as StopTranslationMessage,
            sendResponse,
          );
          return true;
        }

        return false;
      },
    );

    // DOMのロード完了時に自動的に翻訳を開始
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.onDOMContentLoaded.bind(this));
    } else {
      // すでにDOMがロード済みなら直ちに実行
      this.onDOMContentLoaded();
    }

    this.initialized = true;
    contentDebugLog('コンテンツスクリプト初期化完了');
  }

  /**
   * DOMContentLoadedイベントハンドラ
   */
  private onDOMContentLoaded(): void {
    contentDebugLog('DOM読み込み完了、翻訳開始');

    // 現在のドメインで翻訳を開始
    const domain = window.location.hostname;
    this.translationService.startTranslation(domain);

    // 遅延再翻訳（動的コンテンツ対応）
    setTimeout(() => {
      contentDebugLog('遅延翻訳実行');
      this.translationService.startTranslation(domain);
    }, 2000);
  }
}

// コンテンツスクリプトのインスタンスを作成
const _contentScript = new ContentScript();
