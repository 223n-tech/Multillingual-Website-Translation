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
  private translationStarted = false;
  private domLoadedHandled = false;

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
      contentDebugLog('すでに初期化済みのため初期化をスキップします');
      return;
    }

    contentDebugLog('コンテンツスクリプト初期化開始');

    // バックグラウンドスクリプトからのメッセージを受信
    chrome.runtime.onMessage.addListener(
      (message: BaseMessage, sender, sendResponse: MessageResponseCallback) => {
        contentDebugLog('メッセージ受信:', message);

        try {
          if (message.action === 'startTranslation') {
            // 初期化完了前でもメッセージは受け取れるようにする
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
          } else if (message.action === 'disableObservers') {
            // MutationObserver無効化
            this.messageHandler.handleDisableObservers(sendResponse);
            return true;
          } else if (message.action === 'testConnection') {
            // 接続テスト用
            sendResponse({ success: true, message: 'コンテンツスクリプト接続OK' });
            return true;
          }
        } catch (error) {
          contentDebugLog('メッセージ処理中にエラーが発生しました:', error);
          if (sendResponse) {
            sendResponse({ success: false, error: String(error) });
          }
          return true;
        }

        return false;
      },
    );

    // DOMのロード完了時に自動的に翻訳を開始
    // 既にロード完了している場合にも対応
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.onDOMContentLoaded.bind(this));
    } else {
      // すでにDOMがロード済みなら直ちに実行
      // ただし短いタイムアウトを設定して他のスクリプトが先に実行されるようにする
      setTimeout(() => {
        this.onDOMContentLoaded();
      }, 100);
    }

    this.initialized = true;
    contentDebugLog('コンテンツスクリプト初期化完了');
  }

  /**
   * DOMContentLoadedイベントハンドラ
   */
  private onDOMContentLoaded(): void {
    // 重複実行防止
    if (this.domLoadedHandled) {
      return;
    }

    this.domLoadedHandled = true;
    contentDebugLog('DOM読み込み完了、翻訳開始');

    // 現在のドメインで翻訳を開始
    const domain = window.location.hostname;

    // 既に翻訳が開始されていないことを確認
    if (!this.translationStarted) {
      this.translationStarted = true;
      this.translationService.startTranslation(domain);

      // 遅延再翻訳（動的コンテンツ対応）
      // 最初の翻訳実行から時間を開けて2回目の翻訳を実行
      setTimeout(() => {
        contentDebugLog('遅延翻訳実行');
        this.translationService.startTranslation(domain);
      }, 2000);
    }
  }
}

// コンテンツスクリプトのインスタンスを作成
const _contentScript = new ContentScript();
