// content-github.js - GitHub特殊処理機能
// GitHub固有の翻訳処理を提供

// 重要なキーワードを直接翻訳するユーティリティ関数
function translateDirectKeywords(rootElement) {
  let translatedCount = 0;
  const directTranslations = {
    "Issues": "課題",
    "Pull requests": "プルリクエスト",
    "Marketplace": "マーケットプレイス",
    "Explore": "探索",
    "Code": "コード",
    "Actions": "アクション",
    "Projects": "プロジェクト",
    "Wiki": "ウィキ",
    "Security": "セキュリティ",
    "Insights": "インサイト",
    "Settings": "設定",
    "Discussions": "ディスカッション"
  };
  
  // テキストノードとdata-content属性を検索
  const textWalker = document.createTreeWalker(
    rootElement, 
    NodeFilter.SHOW_TEXT, 
    null, 
    false
  );
  
  // テキストノードを処理
  let textNode;
  while (textNode = textWalker.nextNode()) {
    const text = textNode.textContent.trim();
    if (directTranslations[text]) {
      textNode.textContent = textNode.textContent.replace(
        text,
        directTranslations[text]
      );
      translatedCount++;
      debugLog(`直接翻訳: "${text}" -> "${directTranslations[text]}"`);
    }
  }
  
  // data-content属性を処理
  const elementsWithDataContent = rootElement.querySelectorAll('[data-content]');
  elementsWithDataContent.forEach(el => {
    const content = el.getAttribute('data-content');
    if (directTranslations[content]) {
      el.setAttribute('data-content', directTranslations[content]);
      if (el.textContent.trim() === content) {
        el.textContent = directTranslations[content];
      }
      translatedCount++;
      debugLog(`直接data-content翻訳: "${content}" -> "${directTranslations[content]}"`);
    }
  });
  
  // ActionListItem-label クラスの要素を処理
  const actionListItems = rootElement.querySelectorAll('.ActionListItem-label');
  actionListItems.forEach(el => {
    const text = el.textContent.trim();
    if (directTranslations[text]) {
      el.textContent = directTranslations[text];
      translatedCount++;
      debugLog(`ActionListItem-label翻訳: "${text}" -> "${directTranslations[text]}"`);
    }
  });
  
  return translatedCount;
}

// GitHub固有の要素を翻訳
function processGitHubSpecificElements(rootElement, translationMaps, contextMapping) {
  let translatedCount = 0;
  
  // 特定のキーワードを直接翻訳
  translatedCount += translateDirectKeywords(rootElement);
  
  // 各種特殊要素の処理
  translatedCount += processRepositoryTabs(rootElement, translationMaps, contextMapping);
  translatedCount += processHeaderItems(rootElement, translationMaps, contextMapping);
  translatedCount += processDataContentElements(rootElement, translationMaps, contextMapping);
  translatedCount += processAchievementsElements(rootElement, translationMaps, contextMapping);
  translatedCount += processProfileElements(rootElement, translationMaps, contextMapping);
  translatedCount += processActionListItems(rootElement, translationMaps, contextMapping);
  
  return translatedCount;
}

// 新しいUIのActionListItemを処理する関数
function processActionListItems(rootElement, translationMaps, contextMapping) {
  let translatedCount = 0;
  
  // ActionListItem-labelクラスの要素を処理
  const actionListItems = rootElement.querySelectorAll('.ActionListItem-label');
  debugLog(`ActionListItem-label要素: ${actionListItems.length}個検出`);
  
  actionListItems.forEach(item => {
    const text = item.textContent.trim();
    if (!text) return;
    
    // コンテキストを決定（メインナビゲーションをデフォルトとする）
    let elementContext = "メインナビゲーション";
    
    // 適切なコンテキストで翻訳
    if (translationMaps.byContext[elementContext] && 
        translationMaps.byContext[elementContext][text]) {
      item.textContent = translationMaps.byContext[elementContext][text];
      debugLog(`ActionListItem翻訳（${elementContext}）: "${text}" -> "${translationMaps.byContext[elementContext][text]}"`);
      translatedCount++;
    } 
    // グローバル翻訳を試みる
    else if (contextMapping.settings.empty_context === "global" && 
             translationMaps.global[text]) {
      item.textContent = translationMaps.global[text];
      debugLog(`ActionListItem翻訳（グローバル）: "${text}" -> "${translationMaps.global[text]}"`);
      translatedCount++;
    }
  });
  
  return translatedCount;
}

// リポジトリタブの処理
function processRepositoryTabs(rootElement, translationMaps, contextMapping) {
  let translatedCount = 0;
  
  // UnderlineNav-item (リポジトリタブ)の処理
  const underlineNavItems = rootElement.querySelectorAll('.UnderlineNav-item, .js-selected-navigation-item');
  
  underlineNavItems.forEach(item => {
    // span要素内のテキストを処理
    const spans = item.querySelectorAll('span');
    spans.forEach(span => {
      const text = span.textContent.trim();
      if (!text) return;
      
      // コンテキストを決定
      let elementContext = "リポジトリタブ";
      if (item.hasAttribute('href')) {
        const href = item.getAttribute('href');
        if (href && href.includes('/actions')) {
          elementContext = "アクションタブ";
        } else if (href && href.includes('/projects')) {
          elementContext = "プロジェクトタブ";
        }
      }
      
      // 適切なコンテキストで翻訳
      if (translationMaps.byContext[elementContext] && 
          translationMaps.byContext[elementContext][text]) {
        span.textContent = translationMaps.byContext[elementContext][text];
        debugLog(`リポジトリタブ翻訳（${elementContext}）: "${text}" -> "${translationMaps.byContext[elementContext][text]}"`);
        translatedCount++;
      } 
      // グローバル翻訳を試みる
      else if (contextMapping.settings.empty_context === "global" && 
               translationMaps.global[text]) {
        span.textContent = translationMaps.global[text];
        debugLog(`リポジトリタブ翻訳（グローバル）: "${text}" -> "${translationMaps.global[text]}"`);
        translatedCount++;
      }
    });
    
    // SVGの後ろにあるテキストノードを処理
    for (const child of item.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent.trim();
        if (!text) continue;
        
        // コンテキストを決定（親要素と同じ）
        let elementContext = "リポジトリタブ";
        if (item.hasAttribute('href')) {
          const href = item.getAttribute('href');
          if (href && href.includes('/actions')) {
            elementContext = "アクションタブ";
          } else if (href && href.includes('/projects')) {
            elementContext = "プロジェクトタブ";
          }
        }
        
        // 適切なコンテキストで翻訳
        if (translationMaps.byContext[elementContext] && 
            translationMaps.byContext[elementContext][text]) {
          child.textContent = child.textContent.replace(
            text, 
            translationMaps.byContext[elementContext][text]
          );
          debugLog(`テキストノード翻訳（${elementContext}）: "${text}" -> "${translationMaps.byContext[elementContext][text]}"`);
          translatedCount++;
        }
        // グローバル翻訳を試みる
        else if (contextMapping.settings.empty_context === "global" && 
                 translationMaps.global[text]) {
          child.textContent = child.textContent.replace(
            text, 
            translationMaps.global[text]
          );
          debugLog(`テキストノード翻訳（グローバル）: "${text}" -> "${translationMaps.global[text]}"`);
          translatedCount++;
        }
      }
    }
    
    // data-content属性を処理
    if (item.hasAttribute('data-content')) {
      const content = item.getAttribute('data-content');
      if (!content) return;
      
      // コンテキストを決定
      let elementContext = "リポジトリタブ";
      if (item.hasAttribute('href')) {
        const href = item.getAttribute('href');
        if (href && href.includes('/actions')) {
          elementContext = "アクションタブ";
        } else if (href && href.includes('/projects')) {
          elementContext = "プロジェクトタブ";
        }
      }
      
      // 適切なコンテキストで翻訳
      if (translationMaps.byContext[elementContext] && 
          translationMaps.byContext[elementContext][content]) {
        const translation = translationMaps.byContext[elementContext][content];
        item.setAttribute('data-content', translation);
        
        // テキストが一致する場合は同様に翻訳
        if (item.textContent.trim() === content) {
          item.textContent = translation;
        }
        
        debugLog(`data-content翻訳（${elementContext}）: "${content}" -> "${translation}"`);
        translatedCount++;
      }
      // グローバル翻訳を試みる
      else if (contextMapping.settings.empty_context === "global" && 
               translationMaps.global[content]) {
        const translation = translationMaps.global[content];
        item.setAttribute('data-content', translation);
        
        // テキストが一致する場合は同様に翻訳
        if (item.textContent.trim() === content) {
          item.textContent = translation;
        }
        
        debugLog(`data-content翻訳（グローバル）: "${content}" -> "${translation}"`);
        translatedCount++;
      }
      // 正規表現翻訳を試みる
      else {
        for (const regexEntry of translationMaps.regexPatterns) {
          // コンテキストが一致するか確認
          if (regexEntry.context !== "" && 
              regexEntry.context !== elementContext && 
              !isRegexApplicable(item, regexEntry.context, contextMapping)) {
            continue;
          }
          
          regexEntry.pattern.lastIndex = 0;
          if (regexEntry.pattern.test(content)) {
            regexEntry.pattern.lastIndex = 0;
            const newContent = content.replace(regexEntry.pattern, regexEntry.replacement);
            
            if (newContent !== content) {
              item.setAttribute('data-content', newContent);
              
              // テキストが一致する場合は同様に翻訳
              if (item.textContent.trim() === content) {
                item.textContent = newContent;
              }
              
              debugLog(`data-content正規表現翻訳: "${content}" -> "${newContent}"`);
              translatedCount++;
              break;
            }
          }
        }
      }
    }
  });
  
  return translatedCount;
}

// ヘッダー項目の処理
function processHeaderItems(rootElement, translationMaps, contextMapping) {
  let translatedCount = 0;
  
  // reponav-itemクラス (古いUIのリポジトリタブ)
  const repoNavItems = rootElement.querySelectorAll('.reponav-item, .pagehead-tabs-item');
  
  repoNavItems.forEach(item => {
    // span要素内のテキストを処理
    const spans = item.querySelectorAll('span');
    spans.forEach(span => {
      const text = span.textContent.trim();
      if (!text) return;
      
      if (translationMaps.byContext["リポジトリタブ"] && 
          translationMaps.byContext["リポジトリタブ"][text]) {
        span.textContent = translationMaps.byContext["リポジトリタブ"][text];
        debugLog(`ヘッダー項目翻訳: "${text}" -> "${translationMaps.byContext["リポジトリタブ"][text]}"`);
        translatedCount++;
      }
      // グローバル翻訳を試みる
      else if (contextMapping.settings.empty_context === "global" && 
               translationMaps.global[text]) {
        span.textContent = translationMaps.global[text];
        debugLog(`ヘッダー項目翻訳（グローバル）: "${text}" -> "${translationMaps.global[text]}"`);
        translatedCount++;
      }
    });
    
    // data-content属性の処理
    if (item.hasAttribute('data-content')) {
      const content = item.getAttribute('data-content');
      if (!content) return;
      
      if (translationMaps.byContext["リポジトリタブ"] && 
          translationMaps.byContext["リポジトリタブ"][content]) {
        const translation = translationMaps.byContext["リポジトリタブ"][content];
        item.setAttribute('data-content', translation);
        
        // テキストが一致する場合は同様に翻訳
        if (item.textContent.trim() === content) {
          item.textContent = translation;
        }
        
        debugLog(`ヘッダーdata-content翻訳: "${content}" -> "${translation}"`);
        translatedCount++;
      }
      // グローバル翻訳を試みる
      else if (contextMapping.settings.empty_context === "global" && 
               translationMaps.global[content]) {
        const translation = translationMaps.global[content];
        item.setAttribute('data-content', translation);
        
        // テキストが一致する場合は同様に翻訳
        if (item.textContent.trim() === content) {
          item.textContent = translation;
        }
        
        debugLog(`ヘッダーdata-content翻訳（グローバル）: "${content}" -> "${translation}"`);
        translatedCount++;
      }
      // 正規表現翻訳を試みる
      else {
        for (const regexEntry of translationMaps.regexPatterns) {
          // コンテキストが一致するか確認
          if (regexEntry.context !== "" && 
              regexEntry.context !== "リポジトリタブ" && 
              !isRegexApplicable(item, regexEntry.context, contextMapping)) {
            continue;
          }
          
          regexEntry.pattern.lastIndex = 0;
          if (regexEntry.pattern.test(content)) {
            regexEntry.pattern.lastIndex = 0;
            const newContent = content.replace(regexEntry.pattern, regexEntry.replacement);
            
            if (newContent !== content) {
              item.setAttribute('data-content', newContent);
              
              // テキストが一致する場合は同様に翻訳
              if (item.textContent.trim() === content) {
                item.textContent = newContent;
              }
              
              debugLog(`ヘッダーdata-content正規表現翻訳: "${content}" -> "${newContent}"`);
              translatedCount++;
              break;
            }
          }
        }
      }
    }
  });
  
  return translatedCount;
}

// data-content属性を持つ要素の処理
function processDataContentElements(rootElement, translationMaps, contextMapping) {
  let translatedCount = 0;
  
  // data-content属性を持つ要素を取得（より広範なセレクタで）
  const dataContentElements = rootElement.querySelectorAll('[data-content], span[data-content]');
  debugLog(`data-content属性を持つ要素: ${dataContentElements.length}個検出`);
  
  dataContentElements.forEach(el => {
    const content = el.getAttribute('data-content');
    if (!content || !content.trim()) return;
    
    // デバッグ出力を追加
    debugLog(`処理中のdata-content: "${content}", 要素:`, el);
    
    // "Issues"のような特定のキーワードを直接検出して翻訳
    if (content === "Issues") {
      el.setAttribute('data-content', "課題");
      
      // テキストコンテンツも一致する場合は翻訳
      if (el.textContent.trim() === content) {
        el.textContent = "課題";
      }
      
      debugLog(`data-content "Issues" を直接翻訳: "課題"`);
      translatedCount++;
      return;
    }
    
    // 要素のコンテキストを判定（デフォルトを "特殊要素" に設定）
    const elementContext = determineElementContext(el, contextMapping) || "特殊要素";
    debugLog(`data-content要素 "${content}" のコンテキスト: ${elementContext || 'なし'}`);
    
    // 1. コンテキスト指定の翻訳を試みる
    if (elementContext && translationMaps.byContext[elementContext] && 
        translationMaps.byContext[elementContext][content]) {
      const translation = translationMaps.byContext[elementContext][content];
      el.setAttribute('data-content', translation);
      
      // テキストコンテンツも一致する場合は翻訳
      if (el.textContent.trim() === content) {
        el.textContent = translation;
      }
      
      debugLog(`data-content属性翻訳（コンテキスト「${elementContext}」）: "${content}" -> "${translation}"`);
      translatedCount++;
    }
    // メインナビゲーションコンテキストでも翻訳を試みる（Issues対応）
    else if (translationMaps.byContext["メインナビゲーション"] && 
             translationMaps.byContext["メインナビゲーション"][content]) {
      const translation = translationMaps.byContext["メインナビゲーション"][content];
      el.setAttribute('data-content', translation);
      
      // テキストコンテンツも一致する場合は翻訳
      if (el.textContent.trim() === content) {
        el.textContent = translation;
      }
      
      debugLog(`data-content属性翻訳（フォールバック「メインナビゲーション」）: "${content}" -> "${translation}"`);
      translatedCount++;
    }
    // リポジトリタブコンテキストでも翻訳を試みる
    else if (translationMaps.byContext["リポジトリタブ"] && 
             translationMaps.byContext["リポジトリタブ"][content]) {
      const translation = translationMaps.byContext["リポジトリタブ"][content];
      el.setAttribute('data-content', translation);
      
      // テキストコンテンツも一致する場合は翻訳
      if (el.textContent.trim() === content) {
        el.textContent = translation;
      }
      
      debugLog(`data-content属性翻訳（フォールバック「リポジトリタブ」）: "${content}" -> "${translation}"`);
      translatedCount++;
    }
    // 2. グローバル翻訳を試みる
    else if (contextMapping.settings.empty_context === "global" && 
             translationMaps.global[content]) {
      const translation = translationMaps.global[content];
      el.setAttribute('data-content', translation);
      
      // テキストコンテンツも一致する場合は翻訳
      if (el.textContent.trim() === content) {
        el.textContent = translation;
      }
      
      debugLog(`data-content属性翻訳（グローバル）: "${content}" -> "${translation}"`);
      translatedCount++;
    }
    // 3. 正規表現による翻訳を試みる
    else {
      for (const regexEntry of translationMaps.regexPatterns) {
        // コンテキストが一致するか、適用対象か確認
        if (regexEntry.context !== "" && 
            regexEntry.context !== elementContext && 
            !isRegexApplicable(el, regexEntry.context, contextMapping)) {
          continue;
        }
        
        regexEntry.pattern.lastIndex = 0;
        if (regexEntry.pattern.test(content)) {
          regexEntry.pattern.lastIndex = 0;
          const newContent = content.replace(regexEntry.pattern, regexEntry.replacement);
          
          if (newContent !== content) {
            el.setAttribute('data-content', newContent);
            
            // テキストコンテンツも一致する場合は翻訳
            if (el.textContent.trim() === content) {
              el.textContent = newContent;
            }
            
            debugLog(`data-content属性 正規表現翻訳: "${content}" -> "${newContent}"`);
            translatedCount++;
            break;
          }
        }
      }
    }
  });
  
  return translatedCount;
}

// Achievements要素の処理
function processAchievementsElements(rootElement, translationMaps, contextMapping) {
  let translatedCount = 0;
  
  // プロフィールページのAchievements要素を探す
  const headingElements = rootElement.querySelectorAll('h2');
  headingElements.forEach(heading => {
    const text = heading.textContent.trim();
    if (!text) return;
    
    // 「Achievements」という固定テキストを直接翻訳
    if (text === 'Achievements') {
      heading.textContent = '実績';
      debugLog('Achievements要素を直接翻訳しました');
      translatedCount++;
      return;
    }
    
    // 見出しテキストを翻訳マップで確認
    if (translationMaps.byContext["特殊要素"] && 
        translationMaps.byContext["特殊要素"][text]) {
      heading.textContent = translationMaps.byContext["特殊要素"][text];
      debugLog(`見出し要素翻訳: "${text}" -> "${translationMaps.byContext["特殊要素"][text]}"`);
      translatedCount++;
    }
    // グローバル翻訳を試みる
    else if (contextMapping.settings.empty_context === "global" && 
             translationMaps.global[text]) {
      heading.textContent = translationMaps.global[text];
      debugLog(`見出し要素翻訳（グローバル）: "${text}" -> "${translationMaps.global[text]}"`);
      translatedCount++;
    }
  });
  
  // 特殊なAchievements要素のセレクタによる検索
  const achievementElements = rootElement.querySelectorAll('h2.h4, h2.f4, .h4.mb-2, .Link--primary');
  achievementElements.forEach(element => {
    const text = element.textContent.trim();
    if (!text) return;
    
    if (text === 'Achievements') {
      element.textContent = '実績';
      debugLog('特殊Achievements要素を直接翻訳しました');
      translatedCount++;
    }
  });
  
  return translatedCount;
}

// プロフィール要素の処理
function processProfileElements(rootElement, translationMaps, contextMapping) {
  let translatedCount = 0;
  
  // プロフィールページのナビゲーション要素
  const profileNavItems = rootElement.querySelectorAll('.UnderlineNav-item[data-tab-item], .user-profile-nav');
  
  profileNavItems.forEach(item => {
    const spans = item.querySelectorAll('span');
    spans.forEach(span => {
      const text = span.textContent.trim();
      if (!text) return;
      
      if (translationMaps.byContext["プロフィール"] && 
          translationMaps.byContext["プロフィール"][text]) {
        span.textContent = translationMaps.byContext["プロフィール"][text];
        debugLog(`プロフィール要素翻訳: "${text}" -> "${translationMaps.byContext["プロフィール"][text]}"`);
        translatedCount++;
      }
      // グローバル翻訳を試みる
      else if (contextMapping.settings.empty_context === "global" && 
               translationMaps.global[text]) {
        span.textContent = translationMaps.global[text];
        debugLog(`プロフィール要素翻訳（グローバル）: "${text}" -> "${translationMaps.global[text]}"`);
        translatedCount++;
      }
    });
    
    // テキストノードも処理
    for (const child of item.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent.trim();
        if (!text) continue;
        
        if (translationMaps.byContext["プロフィール"] && 
            translationMaps.byContext["プロフィール"][text]) {
          child.textContent = child.textContent.replace(
            text, 
            translationMaps.byContext["プロフィール"][text]
          );
          debugLog(`プロフィールテキストノード翻訳: "${text}" -> "${translationMaps.byContext["プロフィール"][text]}"`);
          translatedCount++;
        }
        // グローバル翻訳を試みる
        else if (contextMapping.settings.empty_context === "global" && 
                 translationMaps.global[text]) {
          child.textContent = child.textContent.replace(
            text, 
            translationMaps.global[text]
          );
          debugLog(`プロフィールテキストノード翻訳（グローバル）: "${text}" -> "${translationMaps.global[text]}"`);
          translatedCount++;
        }
      }
    }
  });
  
  // 貢献活動要素の処理
  const contributionElements = rootElement.querySelectorAll('.profile-rollup-wrapper h2, .js-profile-timeline-year-list h2');
  
  contributionElements.forEach(element => {
    const text = element.textContent.trim();
    if (!text) return;
    
    // 貢献活動のテキストを翻訳
    if (text === 'Contribution activity') {
      element.textContent = '貢献活動';
      debugLog('貢献活動要素を直接翻訳しました');
      translatedCount++;
      return;
    }
    
    // 正規表現での翻訳を試みる
    for (const regexEntry of translationMaps.regexPatterns) {
      // コンテキストが適切か確認
      if (regexEntry.context !== "プロフィールページ" && 
          regexEntry.context !== "" && 
          !isRegexApplicable(element, regexEntry.context, contextMapping)) {
        continue;
      }
      
      regexEntry.pattern.lastIndex = 0;
      if (regexEntry.pattern.test(text)) {
        regexEntry.pattern.lastIndex = 0;
        const newText = text.replace(regexEntry.pattern, regexEntry.replacement);
        
        if (newText !== text) {
          element.textContent = newText;
          debugLog(`プロフィール要素の正規表現翻訳: "${text}" -> "${newText}"`);
          translatedCount++;
          break;
        }
      }
    }
  });
  
  return translatedCount;
}