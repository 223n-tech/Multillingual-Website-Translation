import { contentDebugLog } from '../../utils/debug';
import { TranslationMaps } from '../../types/translation';
import { ContextMappingData } from '../../types/context';
import { ContextDetector } from './context-detector';

/**
 * GitHub専用の翻訳サービス
 * GitHub特有のUI要素を処理
 */
export class GitHubTranslator {
  private translationMaps: TranslationMaps;
  private contextMapping: ContextMappingData;
  private contextDetector: ContextDetector;

  constructor(
    translationMaps: TranslationMaps,
    contextMapping: ContextMappingData,
    contextDetector: ContextDetector,
  ) {
    this.translationMaps = translationMaps;
    this.contextMapping = contextMapping;
    this.contextDetector = contextDetector;
  }

  /**
   * GitHub固有の要素を翻訳
   */
  public processGitHubSpecificElements(rootElement: Element): number {
    let translatedCount = 0;

    // 各種特殊要素の処理
    translatedCount += this.processRepositoryTabs(rootElement);
    translatedCount += this.processHeaderItems(rootElement);
    translatedCount += this.processDataContentElements(rootElement);
    translatedCount += this.processAchievementsElements(rootElement);
    translatedCount += this.processProfileElements(rootElement);
    translatedCount += this.processActionListItems(rootElement);
    translatedCount += this.processFooterElements(rootElement);

    return translatedCount;
  }

  /**
   * リポジトリタブの処理
   */
  private processRepositoryTabs(rootElement: Element): number {
    let translatedCount = 0;

    // UnderlineNav-item (リポジトリタブ)の処理
    const underlineNavItems = rootElement.querySelectorAll(
      '.UnderlineNav-item, .js-selected-navigation-item',
    );

    underlineNavItems.forEach((item) => {
      // span要素内のテキストを処理
      const spans = item.querySelectorAll('span');
      spans.forEach((span) => {
        const text = span.textContent?.trim();
        if (!text) return;

        // コンテキストを決定
        let elementContext = 'リポジトリタブ';
        if (item instanceof HTMLElement && item.hasAttribute('href')) {
          const href = item.getAttribute('href');
          if (href && href.includes('/actions')) {
            elementContext = 'アクションタブ';
          } else if (href && href.includes('/projects')) {
            elementContext = 'プロジェクトタブ';
          }
        }

        // 適切なコンテキストで翻訳
        if (
          this.translationMaps.byContext[elementContext] &&
          this.translationMaps.byContext[elementContext][text]
        ) {
          span.textContent = this.translationMaps.byContext[elementContext][text];
          contentDebugLog(
            `リポジトリタブ翻訳（${elementContext}）: "${text}" -> "${this.translationMaps.byContext[elementContext][text]}"`,
          );
          translatedCount++;
        }
        // グローバル翻訳を試みる
        else if (
          this.contextMapping.settings.empty_context === 'global' &&
          this.translationMaps.global[text]
        ) {
          span.textContent = this.translationMaps.global[text];
          contentDebugLog(
            `リポジトリタブ翻訳（グローバル）: "${text}" -> "${this.translationMaps.global[text]}"`,
          );
          translatedCount++;
        }
      });

      // SVGの後ろにあるテキストノードを処理
      for (const child of Array.from(item.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent?.trim();
          if (!text) continue;

          // コンテキストを決定（親要素と同じ）
          let elementContext = 'リポジトリタブ';
          if (item instanceof HTMLElement && item.hasAttribute('href')) {
            const href = item.getAttribute('href');
            if (href && href.includes('/actions')) {
              elementContext = 'アクションタブ';
            } else if (href && href.includes('/projects')) {
              elementContext = 'プロジェクトタブ';
            }
          }

          // 適切なコンテキストで翻訳
          if (
            this.translationMaps.byContext[elementContext] &&
            this.translationMaps.byContext[elementContext][text]
          ) {
            child.textContent = child.textContent!.replace(
              text,
              this.translationMaps.byContext[elementContext][text],
            );
            contentDebugLog(
              `テキストノード翻訳（${elementContext}）: "${text}" -> "${this.translationMaps.byContext[elementContext][text]}"`,
            );
            translatedCount++;
          }
          // グローバル翻訳を試みる
          else if (
            this.contextMapping.settings.empty_context === 'global' &&
            this.translationMaps.global[text]
          ) {
            child.textContent = child.textContent!.replace(text, this.translationMaps.global[text]);
            contentDebugLog(
              `テキストノード翻訳（グローバル）: "${text}" -> "${this.translationMaps.global[text]}"`,
            );
            translatedCount++;
          }
        }
      }

      // data-content属性を処理
      if (item.hasAttribute('data-content')) {
        const content = item.getAttribute('data-content');
        if (!content) return;

        // コンテキストを決定
        let elementContext = 'リポジトリタブ';
        if (item instanceof HTMLElement && item.hasAttribute('href')) {
          const href = item.getAttribute('href');
          if (href && href.includes('/actions')) {
            elementContext = 'アクションタブ';
          } else if (href && href.includes('/projects')) {
            elementContext = 'プロジェクトタブ';
          }
        }

        // 適切なコンテキストで翻訳
        if (
          this.translationMaps.byContext[elementContext] &&
          this.translationMaps.byContext[elementContext][content]
        ) {
          const translation = this.translationMaps.byContext[elementContext][content];
          item.setAttribute('data-content', translation);

          // テキストが一致する場合は同様に翻訳
          if (item.textContent?.trim() === content) {
            item.textContent = translation;
          }

          contentDebugLog(
            `data-content翻訳（${elementContext}）: "${content}" -> "${translation}"`,
          );
          translatedCount++;
        }
        // グローバル翻訳を試みる
        else if (
          this.contextMapping.settings.empty_context === 'global' &&
          this.translationMaps.global[content]
        ) {
          const translation = this.translationMaps.global[content];
          item.setAttribute('data-content', translation);

          // テキストが一致する場合は同様に翻訳
          if (item.textContent?.trim() === content) {
            item.textContent = translation;
          }

          contentDebugLog(`data-content翻訳（グローバル）: "${content}" -> "${translation}"`);
          translatedCount++;
        }
        // 正規表現での翻訳を試みる
        else {
          translatedCount += this.applyRegexPatterns(item, content, 'data-content');
        }
      }
    });

    return translatedCount;
  }

  /**
   * ヘッダー項目の処理
   */
  private processHeaderItems(rootElement: Element): number {
    let translatedCount = 0;

    // reponav-itemクラス (古いUIのリポジトリタブ)
    const repoNavItems = rootElement.querySelectorAll('.reponav-item, .pagehead-tabs-item');

    repoNavItems.forEach((item) => {
      // span要素内のテキストを処理
      const spans = item.querySelectorAll('span');
      spans.forEach((span) => {
        const text = span.textContent?.trim();
        if (!text) return;

        if (
          this.translationMaps.byContext['リポジトリタブ'] &&
          this.translationMaps.byContext['リポジトリタブ'][text]
        ) {
          span.textContent = this.translationMaps.byContext['リポジトリタブ'][text];
          contentDebugLog(
            `ヘッダー項目翻訳: "${text}" -> "${this.translationMaps.byContext['リポジトリタブ'][text]}"`,
          );
          translatedCount++;
        }
        // グローバル翻訳を試みる
        else if (
          this.contextMapping.settings.empty_context === 'global' &&
          this.translationMaps.global[text]
        ) {
          span.textContent = this.translationMaps.global[text];
          contentDebugLog(
            `ヘッダー項目翻訳（グローバル）: "${text}" -> "${this.translationMaps.global[text]}"`,
          );
          translatedCount++;
        }
      });

      // data-content属性の処理
      if (item.hasAttribute('data-content')) {
        const content = item.getAttribute('data-content');
        if (!content) return;

        if (
          this.translationMaps.byContext['リポジトリタブ'] &&
          this.translationMaps.byContext['リポジトリタブ'][content]
        ) {
          const translation = this.translationMaps.byContext['リポジトリタブ'][content];
          item.setAttribute('data-content', translation);

          // テキストが一致する場合は同様に翻訳
          if (item.textContent?.trim() === content) {
            item.textContent = translation;
          }

          contentDebugLog(`ヘッダーdata-content翻訳: "${content}" -> "${translation}"`);
          translatedCount++;
        }
        // グローバル翻訳を試みる
        else if (
          this.contextMapping.settings.empty_context === 'global' &&
          this.translationMaps.global[content]
        ) {
          const translation = this.translationMaps.global[content];
          item.setAttribute('data-content', translation);

          // テキストが一致する場合は同様に翻訳
          if (item.textContent?.trim() === content) {
            item.textContent = translation;
          }

          contentDebugLog(
            `ヘッダーdata-content翻訳（グローバル）: "${content}" -> "${translation}"`,
          );
          translatedCount++;
        }
        // 正規表現翻訳を試みる
        else {
          translatedCount += this.applyRegexPatterns(item, content, 'data-content');
        }
      }
    });

    return translatedCount;
  }

  /**
   * data-content属性を持つ要素を処理
   */
  private processDataContentElements(rootElement: Element): number {
    let translatedCount = 0;

    // data-content属性を持つ要素を取得
    const dataContentElements = rootElement.querySelectorAll('[data-content], span[data-content]');
    contentDebugLog(`data-content属性を持つ要素: ${dataContentElements.length}個検出`);

    dataContentElements.forEach((el) => {
      const content = el.getAttribute('data-content');
      if (!content || !content.trim()) return;

      // "Issues"のような特定のキーワードを直接検出して翻訳
      if (content === 'Issues') {
        el.setAttribute('data-content', '課題');

        // テキストコンテンツも一致する場合は翻訳
        if (el.textContent?.trim() === content) {
          el.textContent = '課題';
        }

        contentDebugLog(`data-content "Issues" を直接翻訳: "課題"`);
        translatedCount++;
        return;
      }

      // 要素のコンテキストを判定（デフォルトを "特殊要素" に設定）
      const elementContext = this.contextDetector.determineElementContext(el) || '特殊要素';

      // 1. コンテキスト指定の翻訳を試みる
      if (
        elementContext &&
        this.translationMaps.byContext[elementContext] &&
        this.translationMaps.byContext[elementContext][content]
      ) {
        const translation = this.translationMaps.byContext[elementContext][content];
        el.setAttribute('data-content', translation);

        // テキストコンテンツも一致する場合は翻訳
        if (el.textContent?.trim() === content) {
          el.textContent = translation;
        }

        contentDebugLog(
          `data-content属性翻訳（コンテキスト「${elementContext}」）: "${content}" -> "${translation}"`,
        );
        translatedCount++;
      }
      // メインナビゲーションコンテキストでも翻訳を試みる（Issues対応）
      else if (
        this.translationMaps.byContext['メインナビゲーション'] &&
        this.translationMaps.byContext['メインナビゲーション'][content]
      ) {
        const translation = this.translationMaps.byContext['メインナビゲーション'][content];
        el.setAttribute('data-content', translation);

        // テキストコンテンツも一致する場合は翻訳
        if (el.textContent?.trim() === content) {
          el.textContent = translation;
        }

        contentDebugLog(
          `data-content属性翻訳（フォールバック「メインナビゲーション」）: "${content}" -> "${translation}"`,
        );
        translatedCount++;
      }
      // リポジトリタブコンテキストでも翻訳を試みる
      else if (
        this.translationMaps.byContext['リポジトリタブ'] &&
        this.translationMaps.byContext['リポジトリタブ'][content]
      ) {
        const translation = this.translationMaps.byContext['リポジトリタブ'][content];
        el.setAttribute('data-content', translation);

        // テキストコンテンツも一致する場合は翻訳
        if (el.textContent?.trim() === content) {
          el.textContent = translation;
        }

        contentDebugLog(
          `data-content属性翻訳（フォールバック「リポジトリタブ」）: "${content}" -> "${translation}"`,
        );
        translatedCount++;
      }
      // 2. グローバル翻訳を試みる
      else if (
        this.contextMapping.settings.empty_context === 'global' &&
        this.translationMaps.global[content]
      ) {
        const translation = this.translationMaps.global[content];
        el.setAttribute('data-content', translation);

        // テキストコンテンツも一致する場合は翻訳
        if (el.textContent?.trim() === content) {
          el.textContent = translation;
        }

        contentDebugLog(`data-content属性翻訳（グローバル）: "${content}" -> "${translation}"`);
        translatedCount++;
      }
      // 3. 正規表現による翻訳を試みる
      else {
        translatedCount += this.applyRegexPatterns(el, content, 'data-content');
      }
    });

    return translatedCount;
  }

  /**
   * Achievements要素の処理
   */
  private processAchievementsElements(rootElement: Element): number {
    let translatedCount = 0;

    // プロフィールページのAchievements要素を探す
    const headingElements = rootElement.querySelectorAll('h2');
    headingElements.forEach((heading) => {
      const text = heading.textContent?.trim();
      if (!text) return;

      // 「Achievements」という固定テキストを直接翻訳
      if (text === 'Achievements') {
        heading.textContent = '実績';
        contentDebugLog('Achievements要素を直接翻訳しました');
        translatedCount++;
        return;
      }

      // 見出しテキストを翻訳マップで確認
      if (
        this.translationMaps.byContext['特殊要素'] &&
        this.translationMaps.byContext['特殊要素'][text]
      ) {
        heading.textContent = this.translationMaps.byContext['特殊要素'][text];
        contentDebugLog(
          `見出し要素翻訳: "${text}" -> "${this.translationMaps.byContext['特殊要素'][text]}"`,
        );
        translatedCount++;
      }
      // グローバル翻訳を試みる
      else if (
        this.contextMapping.settings.empty_context === 'global' &&
        this.translationMaps.global[text]
      ) {
        heading.textContent = this.translationMaps.global[text];
        contentDebugLog(
          `見出し要素翻訳（グローバル）: "${text}" -> "${this.translationMaps.global[text]}"`,
        );
        translatedCount++;
      }
    });

    // 特殊なAchievements要素のセレクタによる検索
    const achievementElements = rootElement.querySelectorAll(
      'h2.h4, h2.f4, .h4.mb-2, .Link--primary',
    );
    achievementElements.forEach((element) => {
      const text = element.textContent?.trim();
      if (!text) return;

      if (text === 'Achievements') {
        element.textContent = '実績';
        contentDebugLog('特殊Achievements要素を直接翻訳しました');
        translatedCount++;
      }
    });

    return translatedCount;
  }

  /**
   * プロフィール要素の処理
   */
  private processProfileElements(rootElement: Element): number {
    let translatedCount = 0;

    // プロフィールページのナビゲーション要素
    const profileNavItems = rootElement.querySelectorAll(
      '.UnderlineNav-item[data-tab-item], .user-profile-nav',
    );

    profileNavItems.forEach((item) => {
      const spans = item.querySelectorAll('span');
      spans.forEach((span) => {
        const text = span.textContent?.trim();
        if (!text) return;

        if (
          this.translationMaps.byContext['プロフィール'] &&
          this.translationMaps.byContext['プロフィール'][text]
        ) {
          span.textContent = this.translationMaps.byContext['プロフィール'][text];
          contentDebugLog(
            `プロフィール要素翻訳: "${text}" -> "${this.translationMaps.byContext['プロフィール'][text]}"`,
          );
          translatedCount++;
        }
        // グローバル翻訳を試みる
        else if (
          this.contextMapping.settings.empty_context === 'global' &&
          this.translationMaps.global[text]
        ) {
          span.textContent = this.translationMaps.global[text];
          contentDebugLog(
            `プロフィール要素翻訳（グローバル）: "${text}" -> "${this.translationMaps.global[text]}"`,
          );
          translatedCount++;
        }
      });

      // テキストノードも処理
      for (const child of Array.from(item.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent?.trim();
          if (!text) continue;

          if (
            this.translationMaps.byContext['プロフィール'] &&
            this.translationMaps.byContext['プロフィール'][text]
          ) {
            child.textContent = child.textContent!.replace(
              text,
              this.translationMaps.byContext['プロフィール'][text],
            );
            contentDebugLog(
              `プロフィールテキストノード翻訳: "${text}" -> "${this.translationMaps.byContext['プロフィール'][text]}"`,
            );
            translatedCount++;
          }
          // グローバル翻訳を試みる
          else if (
            this.contextMapping.settings.empty_context === 'global' &&
            this.translationMaps.global[text]
          ) {
            child.textContent = child.textContent!.replace(text, this.translationMaps.global[text]);
            contentDebugLog(
              `プロフィールテキストノード翻訳（グローバル）: "${text}" -> "${this.translationMaps.global[text]}"`,
            );
            translatedCount++;
          }
        }
      }
    });

    // 貢献活動要素の処理
    const contributionElements = rootElement.querySelectorAll(
      '.profile-rollup-wrapper h2, .js-profile-timeline-year-list h2',
    );

    contributionElements.forEach((element) => {
      const text = element.textContent?.trim();
      if (!text) return;

      // 貢献活動のテキストを翻訳
      if (text === 'Contribution activity') {
        element.textContent = '貢献活動';
        contentDebugLog('貢献活動要素を直接翻訳しました');
        translatedCount++;
        return;
      }

      // 正規表現での翻訳を試みる
      translatedCount += this.applyRegexPatternsToElement(element, 'プロフィールページ');
    });

    return translatedCount;
  }

  /**
   * 新しいUIのActionListItemを処理する関数
   */
  private processActionListItems(rootElement: Element): number {
    let translatedCount = 0;

    // ActionListItem-labelクラスの要素を処理
    const actionListItems = rootElement.querySelectorAll('.ActionListItem-label');
    contentDebugLog(`ActionListItem-label要素: ${actionListItems.length}個検出`);

    actionListItems.forEach((item) => {
      const text = item.textContent?.trim();
      if (!text) return;

      // コンテキストを決定（メインナビゲーションをデフォルトとする）
      const elementContext = 'メインナビゲーション';

      // 適切なコンテキストで翻訳
      if (
        this.translationMaps.byContext[elementContext] &&
        this.translationMaps.byContext[elementContext][text]
      ) {
        item.textContent = this.translationMaps.byContext[elementContext][text];
        contentDebugLog(
          `ActionListItem翻訳（${elementContext}）: "${text}" -> "${this.translationMaps.byContext[elementContext][text]}"`,
        );
        translatedCount++;
      }
      // グローバル翻訳を試みる
      else if (
        this.contextMapping.settings.empty_context === 'global' &&
        this.translationMaps.global[text]
      ) {
        item.textContent = this.translationMaps.global[text];
        contentDebugLog(
          `ActionListItem翻訳（グローバル）: "${text}" -> "${this.translationMaps.global[text]}"`,
        );
        translatedCount++;
      }
    });

    return translatedCount;
  }

  /**
   * フッター要素の処理
   */
  private processFooterElements(rootElement: Element): number {
    let translatedCount = 0;

    // フッター要素を検索
    const footerElements = rootElement.querySelectorAll(
      'footer a, [data-analytics-event*="Footer"], .footer-links a, .Link--secondary.Link',
    );

    contentDebugLog(`フッター要素: ${footerElements.length}個検出`);

    footerElements.forEach((element) => {
      const text = element.textContent?.trim();
      if (!text) return;

      // フッターのコンテキストで翻訳を試みる
      if (
        this.translationMaps.byContext['フッター'] &&
        this.translationMaps.byContext['フッター'][text]
      ) {
        element.textContent = this.translationMaps.byContext['フッター'][text];
        contentDebugLog(
          `フッター要素翻訳: "${text}" -> "${this.translationMaps.byContext['フッター'][text]}"`,
        );
        translatedCount++;
        return;
      }

      // グローバル翻訳を試みる
      if (
        this.contextMapping.settings.empty_context === 'global' &&
        this.translationMaps.global[text]
      ) {
        element.textContent = this.translationMaps.global[text];
        contentDebugLog(
          `フッター要素翻訳（グローバル）: "${text}" -> "${this.translationMaps.global[text]}"`,
        );
        translatedCount++;
      }
    });

    return translatedCount;
  }

  /**
   * 正規表現パターンを適用して翻訳
   */
  private applyRegexPatterns(element: Element, text: string, attributeName?: string): number {
    let translatedCount = 0;
    const elementContext = this.contextDetector.determineElementContext(element);

    // すべての正規表現パターンを順番に試す
    for (const regexEntry of this.translationMaps.regexPatterns) {
      // コンテキストが一致するか確認
      if (
        regexEntry.context !== '' &&
        regexEntry.context !== elementContext &&
        !this.contextDetector.isRegexApplicable(element, regexEntry.context)
      ) {
        continue;
      }

      regexEntry.pattern.lastIndex = 0;
      if (regexEntry.pattern.test(text)) {
        // マッチしたらパターンをリセットして置換を実行
        regexEntry.pattern.lastIndex = 0;
        const newContent = text.replace(regexEntry.pattern, regexEntry.replacement);

        if (newContent !== text) {
          if (attributeName) {
            element.setAttribute(attributeName, newContent);

            // テキストが一致する場合は同様に翻訳
            if (element.textContent?.trim() === text) {
              element.textContent = newContent;
            }
          } else {
            element.textContent = newContent;
          }

          contentDebugLog(
            `正規表現翻訳${attributeName ? `（${attributeName}属性）` : ''}: "${text}" -> "${newContent}"`,
          );
          translatedCount++;
          break;
        }
      }
    }

    return translatedCount;
  }

  /**
   * 要素のテキストに正規表現パターンを適用
   */
  private applyRegexPatternsToElement(element: Element, contextHint?: string): number {
    if (!element.textContent) return 0;

    const text = element.textContent;
    let translatedCount = 0;
    const elementContext = this.contextDetector.determineElementContext(element);

    // すべての正規表現パターンを順番に試す
    for (const regexEntry of this.translationMaps.regexPatterns) {
      // コンテキストが一致するか、指定されたコンテキストヒントと一致するか確認
      if (
        regexEntry.context !== '' &&
        regexEntry.context !== elementContext &&
        regexEntry.context !== contextHint &&
        !this.contextDetector.isRegexApplicable(element, regexEntry.context)
      ) {
        continue;
      }

      regexEntry.pattern.lastIndex = 0;
      if (regexEntry.pattern.test(text)) {
        // マッチしたらパターンをリセットして置換を実行
        regexEntry.pattern.lastIndex = 0;
        const newText = text.replace(regexEntry.pattern, regexEntry.replacement);

        if (newText !== text) {
          element.textContent = newText;
          contentDebugLog(
            `正規表現による要素翻訳（コンテキスト「${regexEntry.context || contextHint || 'グローバル'}」）: "${text}" -> "${newText}"`,
          );
          translatedCount++;
          break;
        }
      }
    }

    return translatedCount;
  }
}
