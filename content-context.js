// content-context.js - コンテキスト関連機能（簡潔化バージョン）

// デフォルトのコンテキストマッピングを作成
function createDefaultContextMapping() {
  return {
    settings: {
      unknown_context: "ignore",
      empty_context: "global"
    },
    contexts: {
      "メインナビゲーション": {
        selectors: [".AppHeader-globalBar a", ".header-nav-item", ".HeaderMenu-link"]
      },
      "リポジトリタブ": {
        selectors: [".UnderlineNav-item", ".js-selected-navigation-item", ".reponav-item"]
      },
      "ボタン": {
        selectors: ["button", ".btn", "[role='button']"],
        exclude_selectors: [".btn[data-content]"]
      },
      "特殊要素": {
        selectors: ["[data-content]", ".h4.mb-2", "h2.h4", "h2.f4", ".Link--primary"]
      },
      "コード": {
        selectors: [".repository-content", ".file-navigation"],
        exclude_selectors: ["pre", "code", ".highlight", ".blob-code"]
      },
      "フッター": {
        selectors: [
          ".Link--secondary.Link",
          "footer a", 
          "[data-analytics-event*='Footer']",
          ".footer-links a",
          ".footer a"
        ]
      }
    }
  };
}

// 要素のコンテキストを判定する
function determineElementContext(element, contextMapping) {
  // コンテキストマッピングが無効な場合
  if (!contextMapping || !contextMapping.contexts) {
    return null;
  }
  
  // データ属性をチェック - フッター要素検出
  const analyticsEvent = element.getAttribute('data-analytics-event');
  if (analyticsEvent && analyticsEvent.includes('Footer')) {
    return "フッター";
  }
  
  // 各コンテキスト定義をチェック
  for (const [contextName, contextConfig] of Object.entries(contextMapping.contexts)) {
    if (!contextConfig.selectors) continue;
    
    // 要素が該当するセレクタにマッチするか確認
    for (const selector of contextConfig.selectors) {
      try {
        if (element.matches(selector)) {
          // 除外セレクタの確認
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
  
  // 親要素のコンテキストも確認
  for (const [contextName, contextConfig] of Object.entries(contextMapping.contexts)) {
    if (contextConfig.parent_context) {
      let parent = element.parentElement;
      while (parent) {
        const parentContext = determineElementContext(parent, contextMapping);
        if (parentContext === contextConfig.parent_context) {
          return contextName;
        }
        parent = parent.parentElement;
      }
    }
  }
  
  return null;
}

// 正規表現パターン適用先を判定
function isRegexApplicable(element, context, contextMapping) {
  if (!contextMapping || !contextMapping.regex_contexts || !contextMapping.regex_contexts[context]) {
    return false;
  }
  
  const regexContext = contextMapping.regex_contexts[context];
  
  // 適用先セレクタの確認
  if (!regexContext.apply_to) return false;
  
  // 要素が適用先セレクタにマッチするか確認
  for (const selector of regexContext.apply_to) {
    try {
      if (element.matches(selector)) {
        // 除外セレクタの確認
        if (regexContext.exclude) {
          for (const excludeSelector of regexContext.exclude) {
            if (element.matches(excludeSelector)) {
              return false;
            }
          }
        }
        return true;
      }
    } catch (error) {
      // セレクタが無効な場合はスキップ
    }
  }
  
  // 親要素も確認
  let parent = element.parentElement;
  while (parent) {
    for (const selector of regexContext.apply_to) {
      try {
        if (parent.matches(selector)) {
          // 除外セレクタの確認
          if (regexContext.exclude) {
            for (const excludeSelector of regexContext.exclude) {
              if (parent.matches(excludeSelector)) {
                return false;
              }
            }
          }
          return true;
        }
      } catch (error) {
        // セレクタが無効な場合はスキップ
      }
    }
    parent = parent.parentElement;
  }
  
  return false;
}
