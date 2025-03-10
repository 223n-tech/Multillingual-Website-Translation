// content-context.js - コンテキスト関連機能
// コンテキスト判定と翻訳マップの管理

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
      }
    },
    regex_contexts: {
      "課題表示": {
        apply_to: [".js-issue-title", ".js-issue-row", ".issue-link", ".gh-header-title"]
      },
      "コード": {
        apply_to: [".repository-meta", ".repo-stats", ".file-navigation"],
        exclude: ["pre", "code", ".highlight"]
      }
    }
  };
}

// コンテキストごとに翻訳マップを作成
function createContextTranslationMaps(translationsList) {
  const maps = {
    byContext: {},      // コンテキスト別の完全一致マップ
    regexPatterns: [],  // 正規表現パターン
    global: {}          // コンテキストなしのグローバル翻訳
  };
  
  translationsList.forEach(entry => {
    const context = entry.context || "";  // コンテキストがなければ空文字列
    
    // 正規表現パターンの場合
    if (entry.regex) {
      try {
        // 正規表現オブジェクトを作成して保存
        const regexPattern = new RegExp(entry.original, 'g');
        maps.regexPatterns.push({
          pattern: regexPattern,
          replacement: entry.translated,
          context: context
        });
        debugLog(`正規表現パターンを追加: ${entry.original} (コンテキスト: ${context || 'グローバル'})`);
      } catch (error) {
        console.error(`無効な正規表現: ${entry.original}`, error);
      }
    } 
    // 通常のテキスト（完全一致）の場合
    else {
      const key = entry.original.trim();
      
      // コンテキストなしの場合はグローバル翻訳として扱う
      if (context === "") {
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

// 要素のコンテキストを判定する
function determineElementContext(element, contextMapping) {
  if (!contextMapping || !contextMapping.contexts) {
    return null;
  }
  
  // データ属性をチェック
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
  for (const [contextName, contextConfig] of Object.entries(contextMapping.contexts)) {
    if (contextConfig.parent_context) {
      for (const parentElement of getParentElements(element)) {
        const parentContext = determineElementContext(parentElement, contextMapping);
        if (parentContext === contextConfig.parent_context) {
          return contextName;
        }
      }
    }
  }
  
  return null;
}

// 親要素のリストを取得（最も近い親から順に）
function getParentElements(element) {
  const parents = [];
  let current = element.parentElement;
  
  while (current) {
    parents.push(current);
    current = current.parentElement;
  }
  
  return parents;
}

// 正規表現パターン適用先を判定
function isRegexApplicable(element, context, contextMapping) {
  if (!contextMapping || !contextMapping.regex_contexts || !contextMapping.regex_contexts[context]) {
    return false;
  }
  
  const regexContext = contextMapping.regex_contexts[context];
  
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
    } catch (error) {
      // セレクタが無効な場合はスキップ
      console.error(`無効なセレクタ: ${selector}`, error);
    }
  }
  
  // 親要素も確認
  for (const parentElement of getParentElements(element)) {
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
      } catch (error) {
        // セレクタが無効な場合はスキップ
      }
    }
  }
  
  return false;
}
