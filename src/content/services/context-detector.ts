// import { contentDebugLog } from '../../utils/debug';
// import { ContextMappingData, RegexContextConfig } from '../../types/context';
import { ContextMappingData } from '../../types/context';

/**
 * コンテキスト検出サービス
 * 要素のコンテキストを判定する
 */
export class ContextDetector {
  private contextMapping: ContextMappingData;

  constructor(contextMapping: ContextMappingData) {
    this.contextMapping = contextMapping;
  }

  /**
   * 要素のコンテキストを判定
   */
  public determineElementContext(element: Element): string | null {
    if (!this.contextMapping || !this.contextMapping.contexts) {
      return null;
    }

    // データ属性をチェック (GitHub特有の処理)
    const analyticsEvent = element.getAttribute('data-analytics-event');
    if (analyticsEvent && analyticsEvent.includes('Footer')) {
      return 'フッター';
    }

    // 各コンテキスト定義をチェック
    for (const [contextName, contextConfig] of Object.entries(this.contextMapping.contexts)) {
      if (!contextConfig.selectors) continue;

      // 要素が該当するセレクタにマッチするか確認
      for (const selector of contextConfig.selectors) {
        try {
          if (element.matches(selector)) {
            // 除外セレクタがあれば確認
            if (contextConfig.exclude_selectors) {
              let excluded = false;
              for (const excludeSelector of contextConfig.exclude_selectors) {
                if (element.matches(excludeSelector)) {
                  excluded = true;
                  break;
                }
              }
              if (excluded) continue;
            }

            return contextName;
          }
        } catch (error) {
          // セレクタが無効な場合はスキップ
          console.error(`無効なセレクタ: ${selector}`, error);
        }
      }
    }

    // 親要素のコンテキストも確認（親コンテキスト設定がある場合）
    for (const [contextName, contextConfig] of Object.entries(this.contextMapping.contexts)) {
      if (contextConfig.parent_context) {
        for (const parentElement of this.getParentElements(element)) {
          const parentContext = this.determineElementContext(parentElement);
          if (parentContext === contextConfig.parent_context) {
            return contextName;
          }
        }
      }
    }

    return null;
  }

  /**
   * 正規表現パターン適用先を判定
   */
  public isRegexApplicable(element: Element, context: string): boolean {
    if (
      !this.contextMapping ||
      !this.contextMapping.regex_contexts ||
      !this.contextMapping.regex_contexts[context]
    ) {
      return false;
    }

    const regexContext = this.contextMapping.regex_contexts[context];

    // 適用先セレクタがなければfalse
    if (!regexContext.apply_to) return false;

    // 要素が適用先セレクタにマッチするか確認
    for (const selector of regexContext.apply_to) {
      try {
        if (element.matches(selector)) {
          // 除外セレクタがあれば確認
          if (regexContext.exclude) {
            for (const excludeSelector of regexContext.exclude) {
              if (element.matches(excludeSelector)) {
                return false;
              }
            }
          }
          return true;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        // セレクタが無効な場合はスキップ
        console.error(`無効なセレクタ: ${selector}`);
      }
    }

    // 親要素も確認
    for (const parentElement of this.getParentElements(element)) {
      for (const selector of regexContext.apply_to) {
        try {
          if (parentElement.matches(selector)) {
            // 除外セレクタがあれば確認
            if (regexContext.exclude) {
              for (const excludeSelector of regexContext.exclude) {
                if (parentElement.matches(excludeSelector)) {
                  return false;
                }
              }
            }
            return true;
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_error) {
          // セレクタが無効な場合はスキップ
        }
      }
    }

    return false;
  }

  /**
   * 親要素のリストを取得（最も近い親から順に）
   */
  private getParentElements(element: Element): Element[] {
    const parents: Element[] = [];
    let current = element.parentElement;

    while (current) {
      parents.push(current);
      current = current.parentElement;
    }

    return parents;
  }
}
