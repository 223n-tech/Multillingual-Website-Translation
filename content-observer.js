// content-observer.js - DOM変更監視機能
// DOM変更を監視するMutationObserver関連の機能

// DOMの変更を監視するMutationObserverの設定
function setupMutationObserver(translationMaps, contextMapping) {
  // すでに存在するObserverを切断
  if (window.translationObserver) {
    debugLog('既存のMutationObserverを切断');
    window.translationObserver.disconnect();
  }
  
  debugLog('MutationObserver設定開始');
  
  // 新しいObserverを作成
  window.translationObserver = new MutationObserver(mutations => {
    if (isTranslating) return;
    
    isTranslating = true;
    let translatedCount = 0;
    
    try {
      debugLog('DOM変更検出', mutations.length + '個の変更');
      
      // 特定のキーワードを直接翻訳
      translatedCount += translateDirectKeywords(document.body);
      
      // GitHubの特殊要素を処理
      if (currentDomain.includes('github.com')) {
        translatedCount += handleGitHubDynamicChanges(mutations, translationMaps, contextMapping);
      }
      
      // 通常の変更を処理
      mutations.forEach(mutation => {
        // 追加されたノードを処理
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            translatedCount += applyTranslationsWithContextMapping(node, translationMaps, contextMapping);
          }
        });
        
        // 属性変更を処理（クラス変更による表示/非表示など）
        if (mutation.type === 'attributes' && 
            mutation.attributeName !== 'data-content') { // data-contentは別途処理済み
          translatedCount += applyTranslationsWithContextMapping(mutation.target, translationMaps, contextMapping);
        }
        
        // テキスト変更を処理
        if (mutation.type === 'characterData') {
          translatedCount += applyTranslationsWithContextMapping(mutation.target, translationMaps, contextMapping);
        }
      });
      
      if (translatedCount > 0) {
        debugLog(`DOM変更に対して${translatedCount}個の翻訳を適用`);
      }
    } catch (error) {
      console.error('MutationObserver処理エラー:', error);
      debugLog('MutationObserver処理例外', error);
    } finally {
      isTranslating = false;
    }
  });
  
  // より広範なイベントを監視
  window.translationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'aria-label', 'data-content', 'data-view-component', 'title']
  });
  
  debugLog('MutationObserver設定完了');
}

// GitHub特有の動的DOM変更を処理
function handleGitHubDynamicChanges(mutations, translationMaps, contextMapping) {
  let translatedCount = 0;
  
  // 動的に変更されたdata-content属性を持つ要素を処理
  const dataContentElements = collectDataContentElements(mutations);
  if (dataContentElements.length > 0) {
    translatedCount += translateDataContentElements(dataContentElements, translationMaps, contextMapping);
  }
  
  // 動的に追加されたAchievements要素などの特別な要素を処理
  const specialElements = collectSpecialElements(mutations);
  if (specialElements.length > 0) {
    translatedCount += translateSpecialElements(specialElements, translationMaps, contextMapping);
  }
  
  return translatedCount;
}

// mutations内からdata-content属性を持つ要素を収集
function collectDataContentElements(mutations) {
  const elements = [];
  
  // 変更されたdata-content属性を持つ要素を収集
  mutations.forEach(mutation => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'data-content') {
      elements.push(mutation.target);
    }
    
    // 追加されたノード内のdata-content属性を持つ要素を検索
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.hasAttribute('data-content')) {
          elements.push(node);
        }
        
        const childElements = node.querySelectorAll('[data-content]');
        childElements.forEach(el => elements.push(el));
      }
    });
  });
  
  // 重複を除去して返す
  return [...new Set(elements)];
}

// data-content属性を持つ要素を翻訳
function translateDataContentElements(elements, translationMaps, contextMapping) {
  let translatedCount = 0;
  
  elements.forEach(element => {
    const content = element.getAttribute('data-content');
    if (!content || !content.trim()) return;
    
    const elementContext = determineElementContext(element, contextMapping);
    let translated = false;
    let newContent = content;
    
    // 1. コンテキスト指定の翻訳を試みる
    if (elementContext && translationMaps.byContext[elementContext]) {
      const trimmedContent = content.trim();
      if (translationMaps.byContext[elementContext][trimmedContent]) {
        newContent = translationMaps.byContext[elementContext][trimmedContent];
        translated = true;
        debugLog(`動的data-content属性翻訳（コンテキスト「${elementContext}」）: "${trimmedContent}" -> "${newContent}"`);
      }
    }
    
    // 2. グローバル翻訳を試みる
    if (!translated && contextMapping.settings.empty_context === "global") {
      const trimmedContent = content.trim();
      if (translationMaps.global[trimmedContent]) {
        newContent = translationMaps.global[trimmedContent];
        translated = true;
        debugLog(`動的data-content属性翻訳（グローバル）: "${trimmedContent}" -> "${newContent}"`);
      }
    }
    
    // 3. 正規表現での翻訳を試みる
    if (!translated) {
      // すべての正規表現パターンを順番に試す
      for (const regexEntry of translationMaps.regexPatterns) {
        // コンテキストが一致するか、グローバルの場合のみ適用
        if (regexEntry.context !== "" && regexEntry.context !== elementContext &&
            !isRegexApplicable(element, regexEntry.context, contextMapping)) {
          continue;
        }
        
        // 正規表現のテスト
        regexEntry.pattern.lastIndex = 0;
        if (regexEntry.pattern.test(content)) {
          // マッチしたらパターンをリセットして置換を実行
          regexEntry.pattern.lastIndex = 0;
          newContent = content.replace(regexEntry.pattern, regexEntry.replacement);
          
          // テキストが変わった場合のみ更新
          if (newContent !== content) {
            translated = true;
            debugLog(`動的data-content属性 正規表現翻訳（コンテキスト「${regexEntry.context || 'グローバル'}」）: "${content}" -> "${newContent}"`);
            break;
          }
        }
      }
    }
    
    // 翻訳が行われた場合は属性とテキストを更新
    if (translated && newContent !== content) {
      element.setAttribute('data-content', newContent);
      
      // テキストコンテンツも一致する場合は翻訳
      if (element.textContent.trim() === content.trim()) {
        element.textContent = newContent;
      }
      
      translatedCount++;
    }
  });
  
  return translatedCount;
}

// 特殊な要素を収集（Achievementsなど）
function collectSpecialElements(mutations) {
  const elements = [];
  
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // h2要素を探す
        if (node.tagName === 'H2') {
          elements.push(node);
        }
        
        // 特殊な子要素を検索
        const specialSelectors = [
          'h2.h4', 'h2.f4', '.h4.mb-2', '.Link--primary',
          '.profile-rollup-wrapper h2', '.dashboard-sidebar h2',
          '.js-pinned-items-reorder-container h2'
        ];
        
        specialSelectors.forEach(selector => {
          try {
            const childElements = node.querySelectorAll(selector);
            childElements.forEach(el => elements.push(el));
          } catch (error) {
            console.error('無効なセレクタ:', selector, error);
          }
        });
      }
    });
  });
  
  return elements;
}

// 特殊な要素を翻訳（Achievementsなど）
function translateSpecialElements(elements, translationMaps, contextMapping) {
  let translatedCount = 0;
  
  elements.forEach(element => {
    const text = element.textContent.trim();
    if (!text) return;
    
    // 要素のコンテキストを判定
    const elementContext = determineElementContext(element, contextMapping) || "特殊要素";
    
    // 特定のテキストを直接翻訳（Achievementsなど）
    if (text === 'Achievements') {
      element.textContent = '実績';
      debugLog('動的Achievements要素を直接翻訳しました');
      translatedCount++;
      return;
    }
    
    // 1. コンテキスト指定の翻訳を試みる
    if (elementContext && translationMaps.byContext[elementContext] && 
        translationMaps.byContext[elementContext][text]) {
      element.textContent = translationMaps.byContext[elementContext][text];
      debugLog(`特殊要素翻訳（コンテキスト「${elementContext}」）: "${text}" -> "${translationMaps.byContext[elementContext][text]}"`);
      translatedCount++;
      return;
    }
    
    // 2. グローバル翻訳を試みる
    if (contextMapping.settings.empty_context === "global" && translationMaps.global[text]) {
      element.textContent = translationMaps.global[text];
      debugLog(`特殊要素翻訳（グローバル）: "${text}" -> "${translationMaps.global[text]}"`);
      translatedCount++;
      return;
    }
    
    // 3. 正規表現での翻訳を試みる
    for (const regexEntry of translationMaps.regexPatterns) {
      // コンテキストが一致するか、グローバルの場合のみ適用
      if (regexEntry.context !== "" && regexEntry.context !== elementContext &&
          !isRegexApplicable(element, regexEntry.context, contextMapping)) {
        continue;
      }
      
      // 正規表現のテスト
      regexEntry.pattern.lastIndex = 0;
      if (regexEntry.pattern.test(text)) {
        // マッチしたらパターンをリセットして置換を実行
        regexEntry.pattern.lastIndex = 0;
        const newText = text.replace(regexEntry.pattern, regexEntry.replacement);
        
        // テキストが変わった場合のみ更新
        if (newText !== text) {
          element.textContent = newText;
          debugLog(`特殊要素の正規表現翻訳（コンテキスト「${regexEntry.context || 'グローバル'}」）: "${text}" -> "${newText}"`);
          translatedCount++;
          break;
        }
      }
    }
  });
  
  return translatedCount;
}
