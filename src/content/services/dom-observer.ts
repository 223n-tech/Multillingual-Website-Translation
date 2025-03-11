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

    contentDebugLog('MutationObserver設定開始');

    // 新しいObserverを作成
    this.observer = new MutationObserver(this.handleMutations.bind(this));

    // より広範なイベントを監視
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
  }

  /**
   * 監視を停止
   */
  public disconnect(): void {
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
  }

  /**
   * DOM変更イベントハンドラ
   */
  private handleMutations(mutations: MutationRecord[]): void {
    // 既に翻訳処理中の場合は、ミューテーションを保留リストに追加
    if (this.isTranslating) {
      // 保留中のミューテーションに追加（重複を避けるために連結）
      this.pendingMutations = this.pendingMutations.concat(mutations);
      return;
    }

    // 翻訳処理中フラグを設定
    this.isTranslating = true;

    // 既存のタイマーがあればクリア
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }

    // すべての変更をまとめて処理するためのデバウンス
    this.debounceTimer = window.setTimeout(() => {
      try {
        // 現在のミューテーションと保留中のミューテーションを合わせて処理
        const allMutations = [...mutations, ...this.pendingMutations];
        this.pendingMutations = []; // 保留リストをクリア

        contentDebugLog('DOM変更検出', allMutations.length + '個の変更');

        // 自己を呼び出す変更（翻訳自体による変更）を無視するためのセット
        const processedNodes = new Set<Node>();
        let translatedCount = 0;

        // GitHubドメインの場合は特殊処理
        if (this.isGitHubDomain) {
          translatedCount += this.handleGitHubDynamicChanges(allMutations);
        }

        // 通常の変更を処理
        allMutations.forEach((mutation) => {
          // 追加されたノードを処理
          mutation.addedNodes.forEach((node) => {
            if (
              (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) &&
              !processedNodes.has(node)
            ) {
              processedNodes.add(node);
              translatedCount += this.translationEngine.applyTranslations(node);
            }
          });

          // 属性変更を処理（クラス変更による表示/非表示など）
          if (
            mutation.type === 'attributes' &&
            mutation.target.nodeType === Node.ELEMENT_NODE &&
            mutation.attributeName !== 'data-content' &&
            !processedNodes.has(mutation.target)
          ) {
            // data-contentは別途処理済み
            processedNodes.add(mutation.target);
            translatedCount += this.translationEngine.applyTranslations(mutation.target);
          }

          // テキスト変更を処理
          if (
            mutation.type === 'characterData' &&
            mutation.target.nodeType === Node.TEXT_NODE &&
            !processedNodes.has(mutation.target)
          ) {
            processedNodes.add(mutation.target);
            translatedCount += this.translationEngine.applyTranslations(mutation.target);
          }
        });

        if (translatedCount > 0) {
          contentDebugLog(`DOM変更に対して${translatedCount}個の翻訳を適用`);
        }
      } catch (error) {
        console.error('デバウンス処理中のエラー:', error);
      } finally {
        // 処理が完了したら翻訳中フラグを解除
        this.isTranslating = false;
        this.debounceTimer = null;

        // 保留中のミューテーションがあれば処理
        if (this.pendingMutations.length > 0) {
          const pendingMutationsCopy = [...this.pendingMutations];
          this.pendingMutations = [];
          this.handleMutations(pendingMutationsCopy);
        }
      }
    }, 100); // 100msのデバウンス時間
  }

  /**
   * GitHub特有の動的DOM変更を処理
   */
  private handleGitHubDynamicChanges(mutations: MutationRecord[]): number {
    let translatedCount = 0;

    // 動的に変更されたdata-content属性を持つ要素を処理
    const dataContentElements = this.collectDataContentElements(mutations);
    if (dataContentElements.length > 0) {
      contentDebugLog(`動的に変更された data-content 要素: ${dataContentElements.length}個`);

      dataContentElements.forEach((element) => {
        translatedCount += this.translationEngine.applyTranslations(element);
      });
    }

    // 動的に追加されたAchievements要素などの特別な要素を処理
    const specialElements = this.collectSpecialElements(mutations);
    if (specialElements.length > 0) {
      contentDebugLog(`動的に追加された特殊要素: ${specialElements.length}個`);

      specialElements.forEach((element) => {
        translatedCount += this.translationEngine.applyTranslations(element);
      });
    }

    return translatedCount;
  }

  /**
   * mutations内からdata-content属性を持つ要素を収集
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

          const childElements = element.querySelectorAll('[data-content]');
          childElements.forEach((el) => elements.push(el));
        }
      });
    });

    // 重複を除去して返す
    return [...new Set(elements)];
  }

  /**
   * 特殊な要素を収集（Achievementsなど）
   */
  private collectSpecialElements(mutations: MutationRecord[]): Element[] {
    const elements: Element[] = [];

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;

          // h2要素を探す
          if (element.tagName === 'H2') {
            elements.push(element);
          }

          // 特殊な子要素を検索
          const specialSelectors = [
            'h2.h4',
            'h2.f4',
            '.h4.mb-2',
            '.Link--primary',
            '.profile-rollup-wrapper h2',
            '.dashboard-sidebar h2',
            '.js-pinned-items-reorder-container h2',
            '.ActionListItem-label',
            '.UnderlineNav-item',
          ];

          specialSelectors.forEach((selector) => {
            try {
              const childElements = element.querySelectorAll(selector);
              childElements.forEach((el) => elements.push(el));
            } catch (error) {
              console.error('無効なセレクタ:', selector, error);
            }
          });
        }
      });
    });

    return elements;
  }
}
