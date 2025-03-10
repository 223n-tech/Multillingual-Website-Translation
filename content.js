// content.js - メインコンテンツスクリプト（簡潔化バージョン）

// デバッグフラグ
const DEBUG = true;

// デバッグログ関数
function debugLog(...args) {
  if (DEBUG) {
    console.log('[翻訳拡張]', ...args);
  }
}

// グローバル変数
let translations = null;
let contextMapping = null;
let translationMaps = null;
let currentDomain = null;
let isTranslating = false;
let processedElements = new WeakSet();
const SKIP_TAGS = ['script', 'style', 'textarea', 'input', 'code', 'pre'];

// 初期化
function initialize() {
  currentDomain = window.location.hostname;
  debugLog('初期化開始', currentDomain);
  
  // メッセージリスナー
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    debugLog('メッセージ受信', message);
    if (message.action === 'startTranslation') {
      loadTranslationsAndMapping();
      sendResponse({success: true});
    } else if (message.action === 'stopTranslation') {
      resetTranslations();
      sendResponse({success: true});
    }
    return true;
  });
  
  // 遅延初期化（DOMがより完成してから）
  setTimeout(() => {
    loadTranslationsAndMapping();
  }, 500);
}

// 翻訳データとコンテキストマッピングの読み込み
function loadTranslationsAndMapping() {
  if (isTranslating) {
    debugLog('すでに翻訳処理中のため、スキップします');
    return;
  }
  
  debugLog('翻訳データ読み込み開始', currentDomain);
  
  chrome.runtime.sendMessage(
    { action: 'getTranslationsAndMapping', domain: currentDomain },
    response => {
      if (response && response.success) {
        try {
          // 翻訳データのYAMLをパース
          if (response.translations) {
            translations = jsyaml.load(response.translations);
          }
          
          // コンテキストマッピングのYAMLをパース
          if (response.contextMapping) {
            contextMapping = jsyaml.load(response.contextMapping);
          } else {
            contextMapping = createDefaultContextMapping();
          }
          
          // 両方のデータが利用可能なら翻訳を実行
          if (translations && contextMapping) {
            startTranslation();
          }
        } catch (yamlError) {
          console.error('YAMLパース失敗:', yamlError);
        }
      } else {
        console.error('翻訳データの取得に失敗しました', response ? response.error : 'レスポンスなし');
      }
    }
  );
}

// 翻訳マップを作成
function createTranslationMap(translationsList) {
  const map = {
    byContext: {},      // コンテキスト別マップ
    regexPatterns: [],  // 正規表現パターン
    global: {}          // グローバル翻訳
  };
  
  translationsList.forEach(entry => {
    const context = entry.context || "";
    
    // 正規表現パターンの場合
    if (entry.regex) {
      try {
        map.regexPatterns.push({
          pattern: new RegExp(entry.original, 'g'),
          replacement: entry.translated,
          context: context
        });
      } catch (error) {
        console.error(`無効な正規表現: ${entry.original}`, error);
      }
    } 
    // 通常のテキストの場合
    else {
      const key = entry.original.trim();
      
      // コンテキストなしの場合はグローバル翻訳
      if (context === "") {
        map.global[key] = entry.translated;
      } 
      // コンテキスト指定ありの場合
      else {
        if (!map.byContext[context]) {
          map.byContext[context] = {};
        }
        map.byContext[context][key] = entry.translated;
      }
    }
  });
  
  return map;
}

// 翻訳の実行
function startTranslation() {
  if (!translations || !translations.translations || !contextMapping) {
    return;
  }
  
  if (isTranslating) {
    return;
  }
  
  debugLog('翻訳開始', translations.translations.length + '個のエントリ');
  isTranslating = true;
  
  try {
    const startTime = performance.now();
    let translatedCount = 0;
    
    // 翻訳マップを作成（初回のみ）
    if (!translationMaps) {
      translationMaps = createTranslationMap(translations.translations);
    }
    
    // 処理済み要素をリセット
    processedElements = new WeakSet();
    
    // バッチ処理で翻訳を適用
    batchProcessTranslation(document.body, function() {
      const endTime = performance.now();
      debugLog(`翻訳完了 (${(endTime - startTime).toFixed(2)}ms)`);
      
      // MutationObserverを設定
      setupMutationObserver();
      
      isTranslating = false;
    });
    
  } catch (error) {
    console.error('翻訳実行エラー:', error);
    isTranslating = false;
  }
}

// バッチ処理で翻訳
function batchProcessTranslation(rootElement, callback) {
  // 要素のリストを取得
  const elements = [];
  const textNodes = [];
  
  // 要素を収集する関数
  function collectElements(node) {
    if (!node) return;
    
    // 要素ノードの場合
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (processedElements.has(node)) return;
      
      const tagName = node.tagName.toLowerCase();
      if (SKIP_TAGS.includes(tagName) || node.isContentEditable) {
        return;
      }
      
      elements.push(node);
      processedElements.add(node);
    }
    // テキストノードの場合
    else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      textNodes.push(node);
    }
    
    // 子ノードを処理
    if (node.childNodes && node.childNodes.length > 0) {
      for (const child of node.childNodes) {
        collectElements(child);
      }
    }
  }
  
  // 要素の収集を開始
  collectElements(rootElement);
  
  // バッチ処理のパラメータ
  const BATCH_SIZE = 200;
  let elementIndex = 0;
  let textNodeIndex = 0;
  
  // 要素バッチの処理
  function processElementBatch() {
    if (elementIndex >= elements.length) {
      // 要素処理が終わったらテキストノードへ
      processTextNodeBatch();
      return;
    }
    
    const endIndex = Math.min(elementIndex + BATCH_SIZE, elements.length);
    
    for (let i = elementIndex; i < endIndex; i++) {
      translateElementAttributes(elements[i]);
    }
    
    elementIndex = endIndex;
    setTimeout(processElementBatch, 0);
  }
  
  // テキストノードバッチの処理
  function processTextNodeBatch() {
    if (textNodeIndex >= textNodes.length) {
      // 全て完了したらGitHub特殊処理へ
      if (currentDomain.includes('github.com')) {
        processGitHubElements();
      } else {
        callback();
      }
      return;
    }
    
    const endIndex = Math.min(textNodeIndex + BATCH_SIZE, textNodes.length);
    
    for (let i = textNodeIndex; i < endIndex; i++) {
      translateTextNode(textNodes[i]);
    }
    
    textNodeIndex = endIndex;
    setTimeout(processTextNodeBatch, 0);
  }
  
  // GitHub特殊要素の処理
  function processGitHubElements() {
    // フッター要素の処理
    if (currentDomain.includes('github.com')) {
      processFooterElements(rootElement);
      processHeaderElements(rootElement);
    }
    
    callback();
  }
  
  // バッチ処理の開始
  processElementBatch();
}

// テキストノードの翻訳
function translateTextNode(node) {
  if (!node.textContent.trim()) return false;
  
  const originalText = node.textContent;
  let text = originalText;
  let translated = false;
  
  // 親要素のコンテキストを判定
  const parentElement = node.parentElement;
  if (!parentElement) return false;
  
  const elementContext = determineElementContext(parentElement, contextMapping);
  
  // 1. コンテキスト指定の翻訳
  if (elementContext && translationMaps.byContext[elementContext]) {
    const trimmedText = text.trim();
    if (translationMaps.byContext[elementContext][trimmedText]) {
      text = text.replace(
        trimmedText, 
        translationMaps.byContext[elementContext][trimmedText]
      );
      translated = true;
    }
  }
  
  // 2. グローバル翻訳
  if (!translated && contextMapping.settings.empty_context === "global") {
    const trimmedText = text.trim();
    if (translationMaps.global[trimmedText]) {
      text = text.replace(
        trimmedText, 
        translationMaps.global[trimmedText]
      );
      translated = true;
    }
  }
  
  // 3. 正規表現での翻訳
  if (!translated) {
    for (const regexEntry of translationMaps.regexPatterns) {
      // コンテキストチェック
      if (regexEntry.context !== "" && 
          regexEntry.context !== elementContext && 
          !isRegexApplicable(parentElement, regexEntry.context, contextMapping)) {
        continue;
      }
      
      // 正規表現をリセット
      regexEntry.pattern.lastIndex = 0;
      
      // テスト実行
      if (regexEntry.pattern.test(text)) {
        regexEntry.pattern.lastIndex = 0;
        const newText = text.replace(regexEntry.pattern, regexEntry.replacement);
        
        if (newText !== text) {
          text = newText;
          translated = true;
          break;
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

// 要素の属性を翻訳
function translateElementAttributes(element) {
  const attributesToTranslate = ['aria-label', 'alt', 'placeholder', 'title', 'data-content'];
  const elementContext = determineElementContext(element, contextMapping);
  let translatedCount = 0;
  
  attributesToTranslate.forEach(attr => {
    if (!element.hasAttribute(attr)) return;
    
    const attrText = element.getAttribute(attr);
    if (!attrText.trim()) return;
    
    let translated = false;
    let newText = attrText;
    
    // 1. コンテキスト指定の翻訳
    if (elementContext && translationMaps.byContext[elementContext]) {
      const trimmedAttrText = attrText.trim();
      if (translationMaps.byContext[elementContext][trimmedAttrText]) {
        newText = translationMaps.byContext[elementContext][trimmedAttrText];
        translated = true;
      }
    }
    
    // 2. グローバル翻訳
    if (!translated && contextMapping.settings.empty_context === "global") {
      const trimmedAttrText = attrText.trim();
      if (translationMaps.global[trimmedAttrText]) {
        newText = translationMaps.global[trimmedAttrText];
        translated = true;
      }
    }
    
    // 3. 正規表現での翻訳
    if (!translated) {
      for (const regexEntry of translationMaps.regexPatterns) {
        if (regexEntry.context !== "" && 
            regexEntry.context !== elementContext &&
            !isRegexApplicable(element, regexEntry.context, contextMapping)) {
          continue;
        }
        
        regexEntry.pattern.lastIndex = 0;
        if (regexEntry.pattern.test(attrText)) {
          regexEntry.pattern.lastIndex = 0;
          const replacedText = attrText.replace(regexEntry.pattern, regexEntry.replacement);
          
          if (replacedText !== attrText) {
            newText = replacedText;
            translated = true;
            break;
          }
        }
      }
    }
    
    // 翻訳が行われた場合は属性を更新
    if (translated && newText !== attrText) {
      element.setAttribute(attr, newText);
      translatedCount++;
      
      // data-content属性の場合はテキストも更新
      if (attr === 'data-content' && element.textContent.trim() === attrText.trim()) {
        element.textContent = newText;
      }
    }
  });
  
  return translatedCount;
}

// フッター要素の処理
function processFooterElements(rootElement) {
  // フッター要素を検索
  const footerElements = rootElement.querySelectorAll(
    'footer a, [data-analytics-event*="Footer"], .footer-links a, .Link--secondary.Link'
  );
  
  footerElements.forEach(element => {
    if (processedElements.has(element)) return;
    
    const text = element.textContent.trim();
    if (!text) return;
    
    // フッターのコンテキストで翻訳
    if (translationMaps.byContext["フッター"] && 
        translationMaps.byContext["フッター"][text]) {
      element.textContent = translationMaps.byContext["フッター"][text];
      processedElements.add(element);
      return;
    }
    
    // グローバル翻訳
    if (contextMapping.settings.empty_context === "global" && 
        translationMaps.global[text]) {
      element.textContent = translationMaps.global[text];
      processedElements.add(element);
    }
  });
}

// ヘッダー要素の処理
function processHeaderElements(rootElement) {
  // 直接翻訳キーワード
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
  
  // ヘッダー要素を検索
  const headerElements = rootElement.querySelectorAll(
    '.AppHeader-globalBar a, .HeaderMenu-link, .header-nav-item'
  );
  
  headerElements.forEach(element => {
    if (processedElements.has(element)) return;
    
    const text = element.textContent.trim();
    if (directTranslations[text]) {
      element.textContent = directTranslations[text];
      processedElements.add(element);
    }
  });
}

// MutationObserver設定
function setupMutationObserver() {
  if (window.translationObserver) {
    window.translationObserver.disconnect();
  }
  
  // デバウンスタイマー
  let debounceTimer = null;
  
  window.translationObserver = new MutationObserver(mutations => {
    if (isTranslating) return;
    
    // 短時間に連続する変更をまとめて処理
    if (debounceTimer) clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(() => {
      isTranslating = true;
      
      try {
        // 変更されたノードを収集
        const changedNodes = new Set();
        
        mutations.forEach(mutation => {
          // 追加されたノード
          mutation.addedNodes.forEach(node => {
            if ((node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) && 
                !processedElements.has(node)) {
              changedNodes.add(node);
            }
          });
          
          // 変更されたノード
          if (mutation.type === 'attributes' || mutation.type === 'characterData') {
            changedNodes.add(mutation.target);
          }
        });
        
        // 収集したノードを処理
        if (changedNodes.size > 0) {
          changedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (!processedElements.has(node)) {
                batchProcessTranslation(node, () => {
                  isTranslating = false;
                });
              }
            } else if (node.nodeType === Node.TEXT_NODE) {
              translateTextNode(node);
            }
          });
        } else {
          isTranslating = false;
        }
      } catch (error) {
        console.error('MutationObserver処理エラー:', error);
        isTranslating = false;
      }
    }, 100); // 100msのデバウンス
  });
  
  // 必要な属性のみを監視
  window.translationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-content', 'aria-label', 'title', 'placeholder']
  });
}

// 翻訳のリセット
function resetTranslations() {
  debugLog('翻訳リセット開始');
  
  if (window.translationObserver) {
    window.translationObserver.disconnect();
    window.translationObserver = null;
  }
  
  processedElements = new WeakSet();
  window.location.reload();
}

// 初期化を実行
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  initialize();
} else {
  document.addEventListener('DOMContentLoaded', initialize);
}
