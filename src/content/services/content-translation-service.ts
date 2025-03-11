import * as jsyaml from 'js-yaml';
import { contentDebugLog } from '../../utils/debug';
import { ContextDetector } from './context-detector';
import { ContextMappingData, DEFAULT_CONTEXT_MAPPING } from '../../types/context';
import { DomObserver } from './dom-observer';
import { TranslationData, TranslationMaps, RegexPattern } from '../../types/translation';
import { TranslationEngine } from './translation-engine';
import { TranslationsResponse } from '../../types/message-types';

/**
 * 翻訳エントリーの型定義
 */
interface TranslationEntry {
  original: string;
  translated: string;
  context?: string;
  regex?: boolean;
}

/**
 * コンテンツ翻訳サービス
 */
export class ContentTranslationService {
  private currentDomain: string | null = null;
  private translations: TranslationData | null = null;
  private contextMapping: ContextMappingData | null = null;
  private translationMaps: TranslationMaps | null = null;
  private isTranslating = false;
  private domObserver: DomObserver | null = null;
  private translationEngine: TranslationEngine | null = null;
  private contextDetector: ContextDetector | null = null;
  private processedElements = new WeakSet<Element | Node>();
  private translationTimeout: number | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private translationStartTime = 0;

  // 一度のセッションで実行した翻訳操作を追跡
  private translationSessionCompleted = false;

  constructor() {
    contentDebugLog('コンテンツ翻訳サービス初期化');
  }

  /**
   * 翻訳処理中かどうかを取得
   */
  public getIsTranslating(): boolean {
    return this.isTranslating;
  }

  /**
   * 翻訳開始
   */
  public async startTranslation(domain: string): Promise<void> {
    // 既に実行済みで、同じドメインの場合はスキップ
    if (this.isTranslating && this.currentDomain === domain) {
      contentDebugLog('すでに翻訳処理中のため、スキップします');
      return;
    }

    // 現在の翻訳セッションの状態をリセット
    if (this.currentDomain !== domain) {
      this.translationSessionCompleted = false;
    }

    // 既に同一ドメインで翻訳が完了していたらスキップ
    if (this.translationSessionCompleted && this.currentDomain === domain) {
      contentDebugLog('このドメインは既に翻訳済みです');
      return;
    }

    try {
      this.isTranslating = true;
      this.currentDomain = domain;
      this.translationStartTime = performance.now();

      contentDebugLog('翻訳開始:', domain);

      // 既存のタイムアウトをクリア
      if (this.translationTimeout !== null) {
        window.clearTimeout(this.translationTimeout);
        this.translationTimeout = null;
      }

      // 翻訳データとコンテキストマッピングを取得
      await this.loadTranslationsAndMapping(domain);

      if (!this.translations || !this.contextMapping || !this.translationMaps) {
        contentDebugLog('翻訳データが正しくロードされていないため、翻訳をスキップします');
        this.isTranslating = false;
        return;
      }

      // 依存サービスの初期化
      this.contextDetector = new ContextDetector(this.contextMapping);
      this.translationEngine = new TranslationEngine(
        this.translationMaps,
        this.contextMapping,
        this.contextDetector,
        this.processedElements,
      );

      // 要素の翻訳
      const startTime = performance.now();
      const translatedCount = this.translationEngine.applyTranslations(document.body);
      const endTime = performance.now();
      const timeSpent = endTime - startTime;

      contentDebugLog(`翻訳完了: ${translatedCount}個の翻訳を適用 (${timeSpent.toFixed(2)}ms)`);

      // 翻訳セッション完了をマーク
      this.translationSessionCompleted = true;

      // DOM変更監視の設定
      this.setupDomObserver();

      // 動的に読み込まれるコンテンツのために遅延再翻訳
      this.scheduleDelayedTranslation();
    } catch (error) {
      console.error('翻訳実行エラー:', error);
      contentDebugLog('翻訳実行例外', error);

      // エラー時にリトライ
      this.retryTranslationIfNeeded();
    } finally {
      this.isTranslating = false;
    }
  }

  /**
   * 遅延翻訳をスケジュール
   */
  private scheduleDelayedTranslation(): void {
    // 最初の翻訳から一定時間後に再度翻訳を実行（GitHubのような動的コンテンツサイト向け）
    const delayTime = 1500; // 1.5秒後

    this.translationTimeout = window.setTimeout(() => {
      this.translationTimeout = null;

      if (this.currentDomain && this.translationEngine) {
        contentDebugLog('遅延翻訳実行 (動的コンテンツ対応)');
        this.translationEngine.applyTranslations(document.body);

        // さらに追加の遅延翻訳をスケジュール（SPAなどのさらなる動的コンテンツ対応）
        this.translationTimeout = window.setTimeout(() => {
          if (this.currentDomain && this.translationEngine) {
            contentDebugLog('最終遅延翻訳実行');
            this.translationEngine.applyTranslations(document.body);
          }
          this.translationTimeout = null;
        }, 2500);
      }
    }, delayTime);
  }

  /**
   * エラー時の翻訳リトライ
   */
  private retryTranslationIfNeeded(): void {
    // 最大リトライ回数に達していない場合のみリトライ
    if (this.retryCount < this.maxRetries && this.currentDomain) {
      this.retryCount++;
      const domain = this.currentDomain;

      contentDebugLog(`翻訳リトライ (${this.retryCount}/${this.maxRetries})`);

      // 少し待ってから再試行
      setTimeout(() => {
        this.startTranslation(domain);
      }, 1000 * this.retryCount); // リトライ間隔を徐々に延ばす
    } else {
      this.retryCount = 0;
    }
  }

  /**
   * 翻訳リセット
   * @param reload ページを再読み込みするかどうか
   */
  public resetTranslation(reload: boolean = true): void {
    contentDebugLog('翻訳リセット開始');

    // MutationObserverを切断
    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
      contentDebugLog('MutationObserver切断完了');
    }

    // タイムアウトをクリア
    if (this.translationTimeout !== null) {
      window.clearTimeout(this.translationTimeout);
      this.translationTimeout = null;
    }

    // 依存サービスをクリア
    this.translationEngine = null;
    this.contextDetector = null;

    // リセット状態をクリア
    this.translationSessionCompleted = false;
    this.retryCount = 0;
    this.isTranslating = false;

    // 処理済み要素リストをクリア
    this.processedElements = new WeakSet<Element | Node>();

    if (reload) {
      contentDebugLog('ページ再読み込み実行');
      // ページを再読み込み
      window.location.reload();
    } else {
      contentDebugLog('ページ再読み込みなしでリセット完了');
    }
  }

  /**
   * 翻訳データとコンテキストマッピングの読み込み
   */
  private async loadTranslationsAndMapping(domain: string): Promise<void> {
    try {
      contentDebugLog('翻訳データとコンテキストマッピングの読み込み開始', domain);

      // バックグラウンドスクリプトから翻訳データとコンテキストマッピングを取得
      const response = await this.fetchTranslationData(domain);

      contentDebugLog('翻訳データレスポンス受信', response);

      if (response && response.success) {
        // 翻訳データのYAMLをパース
        if (response.translations) {
          contentDebugLog('YAML解析開始 (翻訳データ)');
          this.translations = jsyaml.load(response.translations) as TranslationData;
          contentDebugLog('YAML解析完了 (翻訳データ)', this.translations);
        }

        // コンテキストマッピングのYAMLをパース
        if (response.contextMapping) {
          contentDebugLog('YAML解析開始 (コンテキストマッピング)');
          this.contextMapping = jsyaml.load(response.contextMapping) as ContextMappingData;
          contentDebugLog('YAML解析完了 (コンテキストマッピング)', this.contextMapping);
        } else {
          contentDebugLog('コンテキストマッピングデータなし、デフォルト設定を使用します');
          this.contextMapping = DEFAULT_CONTEXT_MAPPING;
        }

        // 翻訳マップの作成
        if (this.translations && this.translations.translations) {
          this.translationMaps = this.createTranslationMaps(this.translations.translations);
        }
      } else {
        console.error(
          '翻訳データの取得に失敗しました',
          response ? response.error : 'レスポンスなし',
        );
        contentDebugLog('翻訳データ取得失敗', response);

        // 後方互換性のために旧メッセージタイプも試す
        await this.tryLegacyTranslationFetch(domain);
      }
    } catch (error) {
      console.error('翻訳データの読み込みに失敗しました:', error);
      contentDebugLog('翻訳データ読み込み例外', error);
      throw error;
    }
  }

  /**
   * 翻訳データのフェッチ（Promise版）
   */
  private fetchTranslationData(domain: string): Promise<TranslationsResponse> {
    return new Promise((resolve) => {
      // タイムアウト設定
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: 'リクエストタイムアウト',
        });
      }, 5000);

      chrome.runtime.sendMessage({ action: 'getTranslationsAndMapping', domain }, (response) => {
        clearTimeout(timeoutId);
        resolve(response || { success: false, error: 'レスポンスなし' });
      });
    });
  }

  /**
   * 後方互換性のための旧形式メッセージによる翻訳データ取得
   */
  private async tryLegacyTranslationFetch(domain: string): Promise<void> {
    try {
      contentDebugLog('旧形式メッセージで翻訳データを取得中...');

      type LegacyResponseType = {
        success?: boolean;
        translations?: string;
        error?: string;
      };

      const response = await new Promise<LegacyResponseType>((resolve) => {
        const timeoutId = setTimeout(() => {
          resolve({ success: false, error: 'リクエストタイムアウト' });
        }, 5000);

        chrome.runtime.sendMessage({ action: 'getTranslations', domain }, (response) => {
          clearTimeout(timeoutId);
          resolve(response || { success: false, error: 'レスポンスなし' });
        });
      });

      if (response && response.success && response.translations) {
        contentDebugLog('YAML解析開始 (旧形式翻訳データ)');
        this.translations = jsyaml.load(response.translations) as TranslationData;
        contentDebugLog('YAML解析完了 (旧形式翻訳データ)', this.translations);

        // デフォルトのコンテキストマッピングを使用
        this.contextMapping = DEFAULT_CONTEXT_MAPPING;

        // 翻訳マップの作成
        if (this.translations && this.translations.translations) {
          this.translationMaps = this.createTranslationMaps(this.translations.translations);
        }
      } else {
        console.error(
          '旧形式による翻訳データの取得にも失敗しました',
          response ? response.error : 'レスポンスなし',
        );
        contentDebugLog('旧形式翻訳データ取得失敗', response);
        throw new Error('翻訳データの取得に失敗しました');
      }
    } catch (error) {
      console.error('旧形式による翻訳データの読み込みに失敗しました:', error);
      contentDebugLog('旧形式翻訳データ読み込み例外', error);
      throw error;
    }
  }

  /**
   * DOM変更監視を設定
   */
  private setupDomObserver(): void {
    if (!this.translationEngine || !this.contextMapping || !this.translationMaps) {
      contentDebugLog('必要なデータがないため、DOM監視をスキップします');
      return;
    }

    // 既存のObserverを切断
    if (this.domObserver) {
      this.domObserver.disconnect();
    }

    // 新しいObserverを作成
    this.domObserver = new DomObserver(
      this.translationEngine,
      this.translationMaps,
      this.contextMapping,
      this.isGitHubDomain(),
    );

    // 監視を開始
    this.domObserver.observe();

    contentDebugLog('DOM変更監視を設定しました');
  }

  /**
   * GitHub特有のドメインかどうかを判定
   */
  private isGitHubDomain(): boolean {
    return (
      this.currentDomain?.includes('github.com') ||
      this.currentDomain?.includes('githubusercontent.com') ||
      false
    );
  }

  /**
   * コンテキストごとに翻訳マップを作成
   */
  private createTranslationMaps(translationEntries: TranslationEntry[]): TranslationMaps {
    const maps: TranslationMaps = {
      byContext: {},
      regexPatterns: [],
      global: {},
    };

    translationEntries.forEach((entry) => {
      const context = entry.context || '';

      // 正規表現パターンの場合
      if (entry.regex) {
        try {
          // 正規表現オブジェクトを作成して保存
          const regexPattern: RegexPattern = {
            pattern: new RegExp(entry.original, 'g'),
            replacement: entry.translated,
            context: context,
          };

          maps.regexPatterns.push(regexPattern);
        } catch (error) {
          console.error(`無効な正規表現: ${entry.original}`, error);
        }
      }
      // 通常のテキスト（完全一致）の場合
      else {
        const key = entry.original.trim();

        // コンテキストなしの場合はグローバル翻訳として扱う
        if (context === '') {
          maps.global[key] = entry.translated;

          // スペースの有無による揺らぎに対応
          const keyNoExtraSpaces = key.replace(/\s+/g, ' ');
          if (keyNoExtraSpaces !== key) {
            maps.global[keyNoExtraSpaces] = entry.translated;
          }
        }
        // コンテキスト指定ありの場合
        else {
          // コンテキスト用のマップがなければ作成
          if (!maps.byContext[context]) {
            maps.byContext[context] = {};
          }

          // コンテキスト別のマップに追加
          maps.byContext[context][key] = entry.translated;

          // スペースの有無による揺らぎに対応
          const keyNoExtraSpaces = key.replace(/\s+/g, ' ');
          if (keyNoExtraSpaces !== key) {
            maps.byContext[context][keyNoExtraSpaces] = entry.translated;
          }
        }
      }
    });

    return maps;
  }

  /**
   * MutationObserverを無効化
   */
  public disableObservers(): void {
    contentDebugLog('MutationObserver無効化開始');

    // MutationObserverを切断
    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
      contentDebugLog('MutationObserver切断完了');
    }

    // タイムアウトをクリア
    if (this.translationTimeout !== null) {
      window.clearTimeout(this.translationTimeout);
      this.translationTimeout = null;
    }

    contentDebugLog('MutationObserver無効化完了');
  }
}
