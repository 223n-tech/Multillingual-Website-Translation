import { contentDebugLog } from '../../utils/debug';
import { TranslationMaps } from '../../types/translation';
import { ContextMappingData } from '../../types/context';
import { TranslationEngine } from './translation-engine';

/**
 * DOM変更監視サービス
 * MutationObserverを使ってDOM変更を監視し、動的コンテンツを翻訳
 */
export class DomObserver {
  private translationEngine: TranslationEngine;
  private translationMaps: TranslationMaps;
  private contextMapping: ContextMappingData;
  private observer: MutationObserver | null = null;
  private isTranslating = false;
  private isGitHubDomain = false;
  private pendingMutations: MutationRecord[] = [];
  private debounceTimer: number | null = null;
  private lastProcessedTime = 0;
  private mutationCounter = 0;
  private processingLock = false;
  private disconnectRequested = false;
  private throttleDelay = 300; // ms
  private maxMutationsPerBatch = 20;
  private processedUrls = new Set<string>();
  private translationInProgress = false;

  constructor(
    translationEngine: TranslationEngine,
    translationMaps: TranslationMaps,
    contextMapping: ContextMappingData,
    isGitHubDomain: boolean,
  ) {
    this.translationEngine = translationEngine;
    this.translationMaps = translationMaps;
    this.contextMapping = contextMapping;
    this.isGitHubDomain = isGitHubDomain;
  }

  /**
   * 監視を開始
   */
  public observe(): void {
    // すでに存在するObserverを切断
    if (this.observer) {
      this.disconnect();
    }

    this.disconnectRequested = false;
    contentDebugLog('MutationObserver設定開始');

    // 新しいObserverを作成
    this.observer = new MutationObserver(this.handleMutations.bind(this));

    // より効率的な監視設定
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'class',
        'style',
        'aria-label',
        'data-content',
        'data-view-component',
        'title',
      ],
    });

    contentDebugLog('MutationObserver設定完了');

    // 初期ページロード後、URLの変更を監視（GitHubのSPA対応）
    if (this.isGitHubDomain) {
      this.setupUrlChangeDetection();
    }
  }

  /**
   * URL変更検出のセットアップ（GitHub SPA対応）
   */
  private setupUrlChangeDetection(): void {
    // 現在のURLを記録
    this.processedUrls.add(window.location.href);

    // pushStateとreplaceStateをオーバーライド
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    // アロー関数を使用して this のコンテキストを保持
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.onUrlChange();
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.onUrlChange();
    };

    // popstateイベントもリッスン
    window.addEventListener('popstate', () => this.onUrlChange());
  }

  /**
   * URL変更時の処理
   */
  private onUrlChange(): void {
    const currentUrl = window.location.href;

    // 既に処理済みのURLならスキップ
    if (this.processedUrls.has(currentUrl)) return;

    contentDebugLog('URL変更を検出: 再翻訳を開始します', currentUrl);
    this.processedUrls.add(currentUrl);

    // 少し待ってからDOM翻訳を実行（SPAのレンダリング待ち）
    setTimeout(() => {
      if (!this.translationInProgress && !this.disconnectRequested) {
        this.translationInProgress = true;
        // ルートから翻訳を適用
        this.translationEngine.applyTranslations(document.body);
        this.translationInProgress = false;
      }
    }, 500);
  }

  /**
   * 監視を停止
   */
  public disconnect(): void {
    this.disconnectRequested = true;

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      contentDebugLog('MutationObserver切断完了');
    }

    // タイマーがあれば解除
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // 保留中のミューテーションをクリア
    this.pendingMutations = [];
    this.mutationCounter = 0;
    this.processedUrls.clear();
  }

  /**
   * DOM変更イベントハンドラ
   */
  private handleMutations(mutations: MutationRecord[]): void {
    // 切断要求があった場合は処理をスキップ
    if (this.disconnectRequested) return;

    // 翻訳処理中は変更を無視（自己引き起こす変更を防止）
    if (this.translationInProgress) {
      return;
    }

    // 既に処理中の場合は保留リストに追加
    if (this.isTranslating || this.processingLock) {
      this.pendingMutations = this.pendingMutations.concat(mutations);
      return;
    }

    // スロットリングチェック - 頻繁な処理を防止
    const now = Date.now();
    if (now - this.lastProcessedTime < this.throttleDelay) {
      this.pendingMutations = this.pendingMutations.concat(mutations);

      // 既存のタイマーがなければデバウンス処理をセット
      if (this.debounceTimer === null) {
        this.debounceTimer = window.setTimeout(() => {
          this.debounceTimer = null;
          this.processBatchedMutations();
        }, this.throttleDelay);
      }
      return;
    }

    // 処理中フラグを設定
    this.isTranslating = true;
    this.lastProcessedTime = now;

    // 既存のタイマーがあればクリア
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // すべての変更をまとめて処理
    this.pendingMutations = this.pendingMutations.concat(mutations);
    this.processBatchedMutations();
  }

  /**
   * バッチ処理された変更を処理
   */
  private processBatchedMutations(): void {
    if (this.processingLock || this.disconnectRequested) return;

    this.processingLock = true;
    try {
      // カウンタが多すぎる場合はリセット
      this.mutationCounter++;
      if (this.mutationCounter > 1000) {
        contentDebugLog('変更が多すぎるため、カウンタをリセットします');
        this.mutationCounter = 0;
        this.pendingMutations = [];
        this.processingLock = false;
        this.isTranslating = false;
        return;
      }

      // 現在の保留中の変更を取得
      const allMutations = [...this.pendingMutations];
      this.pendingMutations = []; // 保留リストをクリア

      if (allMutations.length === 0) {
        this.processingLock = false;
        this.isTranslating = false;
        return;
      }

      contentDebugLog(`DOM変更検出 (${allMutations.length}個の変更)`);

      // 処理するノードを収集（重複を排除）
      const nodesToProcess = this.collectNodesToProcess(allMutations);

      // 収集したノードがなければ処理終了
      if (nodesToProcess.size === 0) {
        this.processingLock = false;
        this.isTranslating = false;
        return;
      }

      // 実際の翻訳処理を開始
      this.translationInProgress = true;
      let translatedCount = 0;

      // 一度に処理する量を制限
      const nodesToProcessArray = Array.from(nodesToProcess).slice(0, this.maxMutationsPerBatch);

      // GitHubドメインの場合は特殊処理を適用
      if (this.isGitHubDomain) {
        translatedCount += this.handleGitHubSpecificChanges(allMutations);
      }

      // 通常の翻訳処理
      nodesToProcessArray.forEach((node) => {
        if (node instanceof Element || node instanceof Text) {
          translatedCount += this.translationEngine.applyTranslations(node);
        }
      });

      if (translatedCount > 0) {
        contentDebugLog(`DOM変更に対して${translatedCount}個の翻訳を適用`);
      }

      this.translationInProgress = false;

      // 処理中に新しい変更がたまっていたら、次の処理をスケジュール
      if (this.pendingMutations.length > 0) {
        this.debounceTimer = window.setTimeout(() => {
          this.debounceTimer = null;
          this.processBatchedMutations();
        }, this.throttleDelay);
      }
    } catch (error) {
      console.error('DOM変更処理中のエラー:', error);
      this.translationInProgress = false;
    } finally {
      // 処理が完了したらフラグを解除
      this.processingLock = false;
      this.isTranslating = false;
    }
  }

  /**
   * 処理対象のノードを収集（重複排除）
   */
  private collectNodesToProcess(mutations: MutationRecord[]): Set<Node> {
    const nodes = new Set<Node>();

    mutations.forEach((mutation) => {
      // 追加されたノードを処理
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
          nodes.add(node);
        }
      });

      // 属性変更の処理（特定の条件のみ）
      if (
        mutation.type === 'attributes' &&
        mutation.target.nodeType === Node.ELEMENT_NODE &&
        mutation.attributeName !== 'data-content' // data-contentは別途処理
      ) {
        nodes.add(mutation.target);
      }

      // テキスト変更の処理
      if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
        nodes.add(mutation.target);
      }
    });

    return nodes;
  }

  /**
   * GitHub特有の動的DOM変更を処理
   */
  private handleGitHubSpecificChanges(mutations: MutationRecord[]): number {
    let translatedCount = 0;

    // data-content属性を持つ要素を優先して処理
    const dataContentElements = this.collectDataContentElements(mutations);
    if (dataContentElements.length > 0) {
      contentDebugLog(`動的に変更された data-content 要素: ${dataContentElements.length}個`);

      dataContentElements.forEach((element) => {
        translatedCount += this.translationEngine.applyTranslations(element);
      });
    }

    // ナビゲーションメニュー要素の処理
    const navigationElements = this.collectNavigationElements(mutations);
    if (navigationElements.length > 0) {
      contentDebugLog(`動的に追加されたナビゲーション要素: ${navigationElements.length}個`);

      navigationElements.forEach((element) => {
        translatedCount += this.translationEngine.applyTranslations(element);
      });
    }

    return translatedCount;
  }

  /**
   * data-content属性を持つ要素を収集
   */
  private collectDataContentElements(mutations: MutationRecord[]): Element[] {
    const elements: Element[] = [];

    // 変更されたdata-content属性を持つ要素を収集
    mutations.forEach((mutation) => {
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName === 'data-content' &&
        mutation.target.nodeType === Node.ELEMENT_NODE
      ) {
        elements.push(mutation.target as Element);
      }

      // 追加されたノード内のdata-content属性を持つ要素を検索
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          if (element.hasAttribute('data-content')) {
            elements.push(element);
          }

          // 主要なdata-content属性要素のみを選択（パフォーマンス対策）
          try {
            const childElements = element.querySelectorAll(
              '[data-content].UnderlineNav-item, [data-content].HeaderMenu-link',
            );
            childElements.forEach((el) => elements.push(el));
          } catch (error) {
            // querySelectorエラーは無視
          }
        }
      });
    });

    // 重複を除去して返す
    return [...new Set(elements)];
  }

  /**
   * ナビゲーション関連の要素を収集
   */
  private collectNavigationElements(mutations: MutationRecord[]): Element[] {
    const elements: Element[] = [];

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;

          // 重要なナビゲーション要素のセレクタリスト
          const navSelectors = [
            '.UnderlineNav-item',
            '.js-selected-navigation-item',
            '.HeaderMenu-link',
            '.header-nav-item',
            '.ActionListItem-label',
            '.menu-item',
          ];

          // 主要なナビゲーション要素のみを選択（パフォーマンス対策）
          try {
            const selector = navSelectors.join(', ');
            const navElements = element.querySelectorAll(selector);
            navElements.forEach((el) => elements.push(el));
          } catch (error) {
            // querySelectorエラーは無視
          }
        }
      });
    });

    return elements;
  }
}
