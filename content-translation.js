// content-translation.js - 翻訳実行機能
// 翻訳の実行、要素の翻訳処理

// 翻訳の実行
function startTranslation() {
  if (!translations || !translations.translations) {
    debugLog('翻訳データが正しくロードされていないため、翻訳をスキップします', translations);
    return;
  }
  
  if (!contextMapping) {
    debugLog('コンテキストマッピングが正しくロードされていないため、翻訳をスキップします', contextMapping);
    return;
  }
  
  if (isTranslating) {
    debugLog('すでに翻訳処理中のため、スキップします');
    return;
  }
  
  debugLog('翻訳開始', translations.translations.length + '個のエントリ');
  isTranslating = true;
  
  try {
    // 翻訳対象カウンター
    let translatedCount = 0;
    
    // ページ内のテキストノードをすべて検索して翻訳
    const startTime = performance.now();
    
    // コンテキストごとに分類した翻訳マップを作成
    const translationMaps = createContextTranslationMaps(translations.translations);
    debugLog('翻訳マップ作成完了', Object.keys(translationMaps.byContext).length + '個のコンテキスト');
    
    // 正規表現パターン用の翻訳マップ
    debugLog('正規表現パターン数', translationMaps.regexPatterns.length + '個');
    
    // 処理済み要素をリセット
    processedElements = new WeakSet();
    
    // コンテキストマッピングに基づいて翻訳を適用
    translatedCount += applyTranslationsWithContextMapping(document.body, translationMaps, contextMapping);
    
    // GitHub固有の特殊要素を処理
    if (currentDomain.includes('github.com')) {
      translatedCount += processGitHubSpecificElements(document.body, translationMaps, contextMapping);
    }
    
    const endTime = performance.now();
    
    // MutationObserverを設定してDOMの変更を監視
    setupMutationObserver(translationMaps, contextMapping);
    
    debugLog(`翻訳完了: ${translatedCount}個の翻訳を適用 (${(endTime - startTime).toFixed(2)}ms)`);
  } catch (error) {
    console.error('翻訳実行エラー:', error);
    debugLog('翻訳実行例外', error);
  } finally {
    isTranslating = false;
  }
}

// テキストノードの翻訳処理（コンテキスト対応版）
function translateTextNode(node, translationMaps, contextMapping) {
  if (!node.textContent.trim()) return false;
  
  const originalText = node.textContent;
  let text = originalText;
  let translated = false;
  
  // 要素のコンテキストを判定
  const parentElement = node.parentElement;
  if (!parentElement) return false;
  
  const elementContext = determineElementContext(parentElement, contextMapping);
  debugLog(`要素のコンテキスト: ${elementContext || 'なし'}`, parentElement);
  
  // 1. コンテキスト指定の翻訳を試みる
  if (elementContext && translationMaps.byContext[elementContext]) {
    const trimmedText = text.trim();
    if (translationMaps.byContext[elementContext][trimmedText]) {
      // 前後の空白を保持する処理
      const leadingSpace = text.match(/^\s*/)[0];
      const trailingSpace = text.match(/\s*$/)[0];
      text = leadingSpace + translationMaps.byContext[elementContext][trimmedText] + trailingSpace;
      translated = true;
      debugLog(`テキスト翻訳（コンテキスト「${elementContext}」）: "${trimmedText}" -> "${translationMaps.byContext[elementContext][trimmedText]}"`);
    }
  }
  
  // 2. グローバル翻訳（コンテキストなし）を試みる
  if (!translated && contextMapping.settings.empty_context === "global") {
    const trimmedText = text.trim();
    if (translationMaps.global[trimmedText]) {
      // 前後の空白を保持する処理
      const leadingSpace = text.match(/^\s*/)[0];
      const trailingSpace = text.match(/\s*$/)[0];
      text = leadingSpace + translationMaps.global[trimmedText] + trailingSpace;
      translated = true;
      debugLog(`テキスト翻訳（グローバル）: "${trimmedText}" -> "${translationMaps.global[trimmedText]}"`);
    }
  }
  
  // 3. 正規表現での翻訳を試みる
  if (!translated) {
    // すべての正規表現パターンを順番に試す
    for (const regexEntry of translationMaps.regexPatterns) {
      // コンテキストが一致するか、グローバル（空文字列）の場合のみ適用
      if (regexEntry.context !== "" && regexEntry.context !== elementContext && 
          !isRegexApplicable(parentElement, regexEntry.context, contextMapping)) {
        continue;
      }
      
      // 正規表現のテスト
      regexEntry.pattern.lastIndex = 0; // 毎回検索位置をリセット
      if (regexEntry.pattern.test(text)) {
        // マッチしたらパターンをリセットして置換を実行
        regexEntry.pattern.lastIndex = 0;
        const newText = text.replace(regexEntry.pattern, regexEntry.replacement);
        
        // テキストが変わった場合のみ更新
        if (newText !== text) {
          text = newText;
          translated = true;
          debugLog(`正規表現による翻訳（コンテキスト「${regexEntry.context || 'グローバル'}」）: "${originalText}" -> "${text}"`);
          break; // 最初にマッチしたパターンで翻訳を終了
        }
      }
    }
  }
  
  // 翻訳が行われた場合はテキストを更新
  if (translated && text !== originalText) {
    node.textContent = text;
    return true;
  }
  
  return false;
}

// コンテキストマッピングに基づいて翻訳を適用
function applyTranslationsWithContextMapping(rootNode, translationMaps, contextMapping) {
  let translatedCount = 0;
  
  // 処理済みならスキップ
  if (processedElements.has(rootNode)) {
    return 0;
  }
  
  // 翻訳対象外の要素はスキップ
  if (rootNode.nodeType === Node.ELEMENT_NODE) {
    const tagName = rootNode.tagName.toLowerCase();
    if (tagName === 'script' || tagName === 'style' || tagName === 'textarea' || 
        tagName === 'input' || rootNode.isContentEditable) {
      return 0;
    }
    
    // データ属性でスキップフラグがある場合はスキップ
    if (rootNode.dataset && rootNode.dataset.noTranslate === 'true') {
      return 0;
    }
    
    processedElements.add(rootNode);
  }
  
  // テキストノードの場合
  if (rootNode.nodeType === Node.TEXT_NODE) {
    if (translateTextNode(rootNode, translationMaps, contextMapping)) {
      translatedCount++;
    }
    return translatedCount;
  }
  
  // 特定の属性を翻訳
  if (rootNode.nodeType === Node.ELEMENT_NODE) {
    translatedCount += translateElementAttributes(rootNode, translationMaps, contextMapping);
  }
  
  // 子ノードを再帰的に処理
  if (rootNode.childNodes && rootNode.childNodes.length > 0) {
    for (const childNode of rootNode.childNodes) {
      translatedCount += applyTranslationsWithContextMapping(childNode, translationMaps, contextMapping);
    }
  }
  
  return translatedCount;
}

// 要素の属性を翻訳
function translateElementAttributes(element, translationMaps, contextMapping) {
  let translatedCount = 0;
  const attributesToTranslate = ['aria-label', 'alt', 'placeholder', 'title', 'data-content'];
  const elementContext = determineElementContext(element, contextMapping);
  
  attributesToTranslate.forEach(attr => {
    if (element.hasAttribute(attr)) {
      const attrText = element.getAttribute(attr);
      if (!attrText.trim()) return;
      
      let translated = false;
      let newText = attrText;
      
      // 1. コンテキスト指定の翻訳を試みる
      if (elementContext && translationMaps.byContext[elementContext]) {
        const trimmedAttrText = attrText.trim();
        if (translationMaps.byContext[elementContext][trimmedAttrText]) {
          newText = translationMaps.byContext[elementContext][trimmedAttrText];
          translated = true;
          debugLog(`属性翻訳（コンテキスト「${elementContext}」）: ${attr}="${trimmedAttrText}" -> "${newText}"`);
        }
      }
      
      // 2. グローバル翻訳を試みる
      if (!translated && contextMapping.settings.empty_context === "global") {
        const trimmedAttrText = attrText.trim();
        if (translationMaps.global[trimmedAttrText]) {
          newText = translationMaps.global[trimmedAttrText];
          translated = true;
          debugLog(`属性翻訳（グローバル）: ${attr}="${trimmedAttrText}" -> "${newText}"`);
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
          if (regexEntry.pattern.test(attrText)) {
            // マッチしたらパターンをリセットして置換を実行
            regexEntry.pattern.lastIndex = 0;
            newText = attrText.replace(regexEntry.pattern, regexEntry.replacement);
            
            // テキストが変わった場合のみ更新
            if (newText !== attrText) {
              translated = true;
              debugLog(`属性の正規表現翻訳（コンテキスト「${regexEntry.context || 'グローバル'}」）: ${attr}="${attrText}" -> "${newText}"`);
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
        if (attr === 'data-content' && element.textContent.trim() === attrText.trim()) {
          element.textContent = newText;
        }
      }
    }
  });
  
  return translatedCount;
}
