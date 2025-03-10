import { contentDebugLog } from '../../utils/debug';
import { TranslationMaps } from '../../types/translation';
import { ContextMappingData } from '../../types/context';
import { ContextDetector } from './context-detector';
import { GitHubTranslator } from './github-translator';

/**
 * 翻訳エンジン
 * 実際の翻訳処理を行う
 */
export class TranslationEngine {
  private translationMaps: TranslationMaps;
  private contextMapping: ContextMappingData;
  private contextDetector: ContextDetector;
  private processedElements: WeakSet<Element | Node>;
  private githubTranslator: GitHubTranslator | null = null;

  // 翻訳対象外のタグ
  private readonly SKIP_TAGS = ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE'];

  constructor(
    translationMaps: TranslationMaps,
    contextMapping: ContextMappingData,
    contextDetector: ContextDetector,
    processedElements: WeakSet<Element | Node>,
  ) {
    this.translationMaps = translationMaps;
    this.contextMapping = contextMapping;
    this.contextDetector = contextDetector;
    this.processedElements = processedElements;

    // GitHub用の特殊翻訳処理を初期化
    if (window.location.hostname.includes('github.com')) {
      this.githubTranslator = new GitHubTranslator(
        this.translationMaps,
        this.contextMapping,
        this.contextDetector,
      );
    }
  }

  /**
   * 翻訳を適用
   */
  public applyTranslations(rootNode: Node): number {
    let translatedCount = 0;

    // 特定のキーワードを直接翻訳
    if (rootNode instanceof Element) {
      translatedCount += this.translateDirectKeywords(rootNode);
    }

    // コンテキストマッピングに基づく翻訳
    translatedCount += this.applyTranslationsWithContextMapping(rootNode);

    // GitHub固有の特殊要素処理
    if (this.githubTranslator && rootNode instanceof Element) {
      translatedCount += this.githubTranslator.processGitHubSpecificElements(rootNode);
    }

    return translatedCount;
  }

  /**
   * 特定のキーワードを直接翻訳
   */
  private translateDirectKeywords(rootElement: Element): number {
    let translatedCount = 0;
    const directTranslations: Record<string, string> = {
      Issues: '課題',
      'Pull requests': 'プルリクエスト',
      Marketplace: 'マーケットプレイス',
      Explore: '探索',
      Code: 'コード',
      Actions: 'アクション',
      Projects: 'プロジェクト',
      Wiki: 'ウィキ',
      Security: 'セキュリティ',
      Insights: 'インサイト',
      Settings: '設定',
      Discussions: 'ディスカッション',
      Terms: '規約', // フッター用
    };

    // テキストノードを検索
    const textWalker = document.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, null);

    // テキストノードを処理
    let textNode: Text | null;
    while ((textNode = textWalker.nextNode() as Text | null)) {
      const text = textNode.textContent?.trim();
      if (text && directTranslations[text]) {
        textNode.textContent = textNode.textContent!.replace(text, directTranslations[text]);
        translatedCount++;
        contentDebugLog(`直接翻訳: "${text}" -> "${directTranslations[text]}"`);
      }
    }

    // data-content属性を処理
    const elementsWithDataContent = rootElement.querySelectorAll('[data-content]');
    elementsWithDataContent.forEach((el) => {
      const content = el.getAttribute('data-content');
      if (content && directTranslations[content]) {
        el.setAttribute('data-content', directTranslations[content]);

        // テキストも一致する場合は翻訳
        if (el.textContent?.trim() === content) {
          el.textContent = directTranslations[content];
        }

        translatedCount++;
        contentDebugLog(`直接data-content翻訳: "${content}" -> "${directTranslations[content]}"`);
      }
    });

    // ActionListItem-label クラスの要素を処理
    const actionListItems = rootElement.querySelectorAll('.ActionListItem-label');
    actionListItems.forEach((el) => {
      const text = el.textContent?.trim();
      if (text && directTranslations[text]) {
        el.textContent = directTranslations[text];
        translatedCount++;
        contentDebugLog(`ActionListItem-label翻訳: "${text}" -> "${directTranslations[text]}"`);
      }
    });

    return translatedCount;
  }

  /**
   * コンテキストマッピングに基づいて翻訳を適用
   */
  private applyTranslationsWithContextMapping(rootNode: Node): number {
    let translatedCount = 0;

    // 処理済みならスキップ
    if (this.processedElements.has(rootNode)) {
      return 0;
    }

    // 翻訳対象外の要素はスキップ
    if (rootNode.nodeType === Node.ELEMENT_NODE) {
      const element = rootNode as Element;
      const tagName = element.tagName.toUpperCase();

      if (this.SKIP_TAGS.includes(tagName) || element.isContentEditable) {
        return 0;
      }

      // データ属性でスキップフラグがある場合はスキップ
      if (element.dataset && element.dataset.noTranslate === 'true') {
        return 0;
      }

      this.processedElements.add(element);

      // 特定の属性を翻訳
      translatedCount += this.translateElementAttributes(element);
    }

    // テキストノードの場合
    if (rootNode.nodeType === Node.TEXT_NODE) {
      if (this.translateTextNode(rootNode as Text)) {
        translatedCount++;
      }
      return translatedCount;
    }

    // 子ノードを再帰的に処理
    if (rootNode.childNodes && rootNode.childNodes.length > 0) {
      for (const childNode of Array.from(rootNode.childNodes)) {
        translatedCount += this.applyTranslationsWithContextMapping(childNode);
      }
    }

    return translatedCount;
  }

  /**
   * テキストノードの翻訳処理
   */
  private translateTextNode(node: Text): boolean {
    const text = node.textContent?.trim();
    if (!text) return false;

    const originalText = node.textContent!;
    let newText = originalText;
    let translated = false;

    // 親要素のコンテキストを判定
    const parentElement = node.parentElement;
    if (!parentElement) return false;

    const elementContext = this.contextDetector.determineElementContext(parentElement);

    // 1. コンテキスト指定の翻訳を試みる
    if (elementContext && this.translationMaps.byContext[elementContext]) {
      const trimmedText = text;
      if (this.translationMaps.byContext[elementContext][trimmedText]) {
        // 前後の空白を保持する処理
        const leadingSpace = originalText.match(/^\s*/)![0];
        const trailingSpace = originalText.match(/\s*$/)![0];

        newText =
          leadingSpace +
          this.translationMaps.byContext[elementContext][trimmedText] +
          trailingSpace;

        translated = true;
        contentDebugLog(
          `テキスト翻訳（コンテキスト「${elementContext}」）: "${trimmedText}" -> "${this.translationMaps.byContext[elementContext][trimmedText]}"`,
        );
      }
    }

    // 2. グローバル翻訳（コンテキストなし）を試みる
    if (!translated && this.contextMapping.settings.empty_context === 'global') {
      const trimmedText = text;
      if (this.translationMaps.global[trimmedText]) {
        // 前後の空白を保持する処理
        const leadingSpace = originalText.match(/^\s*/)![0];
        const trailingSpace = originalText.match(/\s*$/)![0];

        newText = leadingSpace + this.translationMaps.global[trimmedText] + trailingSpace;

        translated = true;
        contentDebugLog(
          `テキスト翻訳（グローバル）: "${trimmedText}" -> "${this.translationMaps.global[trimmedText]}"`,
        );
      }
    }

    // 3. 正規表現での翻訳を試みる
    if (!translated) {
      // すべての正規表現パターンを順番に試す
      for (const regexEntry of this.translationMaps.regexPatterns) {
        // コンテキストが一致するか、グローバル（空文字列）の場合のみ適用
        if (
          regexEntry.context !== '' &&
          regexEntry.context !== elementContext &&
          !this.contextDetector.isRegexApplicable(parentElement, regexEntry.context)
        ) {
          continue;
        }

        // 正規表現のテスト
        regexEntry.pattern.lastIndex = 0; // 毎回検索位置をリセット
        if (regexEntry.pattern.test(originalText)) {
          // マッチしたらパターンをリセットして置換を実行
          regexEntry.pattern.lastIndex = 0;
          const replacedText = originalText.replace(regexEntry.pattern, regexEntry.replacement);

          // テキストが変わった場合のみ更新
          if (replacedText !== originalText) {
            newText = replacedText;
            translated = true;
            contentDebugLog(
              `正規表現による翻訳（コンテキスト「${regexEntry.context || 'グローバル'}」）: "${originalText}" -> "${newText}"`,
            );
            break; // 最初にマッチしたパターンで翻訳を終了
          }
        }
      }
    }

    // 翻訳が行われた場合はテキストを更新
    if (translated && newText !== originalText) {
      node.textContent = newText;
      return true;
    }

    return false;
  }

  /**
   * 要素の属性を翻訳
   */
  private translateElementAttributes(element: Element): number {
    let translatedCount = 0;
    const attributesToTranslate = ['aria-label', 'alt', 'placeholder', 'title', 'data-content'];
    const elementContext = this.contextDetector.determineElementContext(element);

    attributesToTranslate.forEach((attr) => {
      if (element.hasAttribute(attr)) {
        const attrText = element.getAttribute(attr);
        if (!attrText || !attrText.trim()) return;

        let translated = false;
        let newText = attrText;

        // 1. コンテキスト指定の翻訳を試みる
        if (elementContext && this.translationMaps.byContext[elementContext]) {
          const trimmedAttrText = attrText.trim();
          if (this.translationMaps.byContext[elementContext][trimmedAttrText]) {
            newText = this.translationMaps.byContext[elementContext][trimmedAttrText];
            translated = true;
            contentDebugLog(
              `属性翻訳（コンテキスト「${elementContext}」）: ${attr}="${trimmedAttrText}" -> "${newText}"`,
            );
          }
        }

        // 2. グローバル翻訳を試みる
        if (!translated && this.contextMapping.settings.empty_context === 'global') {
          const trimmedAttrText = attrText.trim();
          if (this.translationMaps.global[trimmedAttrText]) {
            newText = this.translationMaps.global[trimmedAttrText];
            translated = true;
            contentDebugLog(`属性翻訳（グローバル）: ${attr}="${trimmedAttrText}" -> "${newText}"`);
          }
        }

        // 3. 正規表現での翻訳を試みる
        if (!translated) {
          // すべての正規表現パターンを順番に試す
          for (const regexEntry of this.translationMaps.regexPatterns) {
            // コンテキストが一致するか、グローバルの場合のみ適用
            if (
              regexEntry.context !== '' &&
              regexEntry.context !== elementContext &&
              !this.contextDetector.isRegexApplicable(element, regexEntry.context)
            ) {
              continue;
            }

            // 正規表現のテスト
            regexEntry.pattern.lastIndex = 0;
            if (regexEntry.pattern.test(attrText)) {
              // マッチしたらパターンをリセットして置換を実行
              regexEntry.pattern.lastIndex = 0;
              newText = attrText.replace(regexEntry.pattern, regexEntry.replacement);

              // テキストが変わった場合のみ更新
              if (newText !== attrText) {
                translated = true;
                contentDebugLog(
                  `属性の正規表現翻訳（コンテキスト「${regexEntry.context || 'グローバル'}」）: ${attr}="${attrText}" -> "${newText}"`,
                );
                break;
              }
            }
          }
        }

        // 翻訳が行われた場合は属性を更新
        if (translated && newText !== attrText) {
          element.setAttribute(attr, newText);
          translatedCount++;

          // data-content属性の場合はテキストコンテンツも一致するか確認して置換
          if (attr === 'data-content' && element.textContent?.trim() === attrText.trim()) {
            element.textContent = newText;
          }
        }
      }
    });

    return translatedCount;
  }
}
