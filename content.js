// コンテンツスクリプト (さらに改善版)
// ページ内のテキストを翻訳する

// デバッグフラグ
const DEBUG = true;

// デバッグログ関数
function debugLog(...args) {
  if (DEBUG) {
    console.log('[翻訳拡張]', ...args);
  }
}

// 翻訳データ
let translations = null;
let currentDomain = null;
let isTranslating = false;
let processedElements = new WeakSet(); // 処理済み要素を追跡

// 初期化
function initialize() {
  // 現在のドメインを取得
  currentDomain = window.location.hostname;
  debugLog('初期化開始', currentDomain);
  
  // バックグラウンドスクリプトからの指示を待つ
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    debugLog('メッセージ受信', message);
    if (message.action === 'startTranslation') {
      loadTranslations();
      sendResponse({success: true});
    } else if (message.action === 'stopTranslation') {
      resetTranslations();
      sendResponse({success: true});
    }
    return true; // 非同期レスポンスのためにtrueを返す
  });
  
  // 初回実行時にも翻訳データを読み込む
  debugLog('初回翻訳データ読み込み開始');
  loadTranslations();
}

// 翻訳データの読み込み
async function loadTranslations() {
  try {
    // 翻訳中フラグをチェック
    if (isTranslating) {
      debugLog('すでに翻訳処理中のため、スキップします');
      return;
    }
    
    debugLog('翻訳データ読み込み開始', currentDomain);
    
    // バックグラウンドスクリプトから翻訳データを取得
    chrome.runtime.sendMessage(
      { action: 'getTranslations', domain: currentDomain },
      response => {
        debugLog('翻訳データレスポンス受信', response);
        
        if (response && response.success && response.translations) {
          try {
            // YAMLをパース
            debugLog('YAML解析開始');
            translations = jsyaml.load(response.translations);
            debugLog('YAML解析完了', translations);
            
            // 翻訳を実行
            startTranslation();
          } catch (yamlError) {
            console.error('YAMLパース失敗:', yamlError);
            debugLog('YAML解析失敗', yamlError);
          }
        } else {
          console.error('翻訳データの取得に失敗しました', response ? response.error : 'レスポンスなし');
          debugLog('翻訳データ取得失敗', response);
        }
      }
    );
  } catch (error) {
    console.error('翻訳データの読み込みに失敗しました:', error);
    debugLog('翻訳データ読み込み例外', error);
  }
}

// 翻訳の実行
function startTranslation() {
  if (!translations || !translations.translations) {
    debugLog('翻訳データが正しくロードされていないため、翻訳をスキップします', translations);
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
    
    // クリーンな翻訳マップを作成（より効率的な検索のため）
    const translationMap = createTranslationMap(translations.translations);
    debugLog('翻訳マップ作成完了', Object.keys(translationMap).length + '個のエントリ');
    
    // 処理済み要素をリセット
    processedElements = new WeakSet();
    
    // GitHub固有の要素を先に処理
    if (currentDomain.includes('github.com')) {
      translateGitHubSpecificElements(document.body, translationMap);
      
      // data-content属性を持つ要素を特別に処理
      const dataContentElements = document.querySelectorAll('[data-content]');
      debugLog(`data-content属性を持つ要素: ${dataContentElements.length}個検出`);
      
      dataContentElements.forEach(el => {
        const content = el.getAttribute('data-content');
        if (content && translationMap[content]) {
          debugLog(`data-content属性翻訳: "${content}" -> "${translationMap[content]}"`);
          el.setAttribute('data-content', translationMap[content]);
          
          // テキストコンテンツも一致する場合は翻訳
          if (el.textContent.trim() === content) {
            el.textContent = translationMap[content];
          }
          
          translatedCount++;
        }
      });
    }
    
    // ページ内の翻訳対象要素を検索して翻訳
    translatedCount += translateElements(document.body, translationMap);
    
    const endTime = performance.now();
    
    // MutationObserverを設定してDOMの変更を監視
    setupMutationObserver(translationMap);
    
    debugLog(`翻訳完了: ${translatedCount}個の翻訳を適用 (${(endTime - startTime).toFixed(2)}ms)`);
  } catch (error) {
    console.error('翻訳実行エラー:', error);
    debugLog('翻訳実行例外', error);
  } finally {
    isTranslating = false;
  }
}

// 翻訳マップの作成（高速検索用）
function createTranslationMap(translationsList) {
  const map = {};
  
  translationsList.forEach(entry => {
    // 元のテキストをキーとして使用
    const key = entry.original.trim();
    map[key] = entry.translated;
    
    // スペースの有無による揺らぎに対応
    const keyNoExtraSpaces = key.replace(/\s+/g, ' ');
    if (keyNoExtraSpaces !== key) {
      map[keyNoExtraSpaces] = entry.translated;
    }
  });
  
  return map;
}

// 要素の翻訳（改善版）
function translateElements(rootNode, translationMap) {
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
    const text = rootNode.textContent.trim();
    
    if (text.length > 0) {
      // 翻訳マップで検索
      const translated = translationMap[text];
      
      if (translated) {
        // 翻訳が見つかった場合はテキストを置換
        debugLog('テキスト置換:', text, '->', translated);
        rootNode.textContent = rootNode.textContent.replace(text, translated);
        translatedCount++;
      } else if (text.length > 1) {
        // スペースの正規化を試みる
        const normalizedText = text.replace(/\s+/g, ' ');
        const translatedNormalized = translationMap[normalizedText];
        
        if (translatedNormalized) {
          debugLog('正規化テキスト置換:', normalizedText, '->', translatedNormalized);
          rootNode.textContent = rootNode.textContent.replace(text, translatedNormalized);
          translatedCount++;
        }
      }
    }
    
    return translatedCount;
  }
  
  // 特定の属性を翻訳（aria-label, alt, placeholderなど）
  if (rootNode.nodeType === Node.ELEMENT_NODE) {
    const attributesToTranslate = ['aria-label', 'alt', 'placeholder', 'title', 'data-content'];
    
    attributesToTranslate.forEach(attr => {
      if (rootNode.hasAttribute(attr)) {
        const attrText = rootNode.getAttribute(attr).trim();
        const translated = translationMap[attrText];
        
        if (translated) {
          debugLog('属性置換:', attr, attrText, '->', translated);
          rootNode.setAttribute(attr, translated);
          translatedCount++;
          
          // data-content属性の場合はテキストコンテンツも一致するか確認して置換
          if (attr === 'data-content' && rootNode.textContent.trim() === attrText) {
            rootNode.textContent = translated;
          }
        }
      }
    });
  }
  
  // 子ノードを再帰的に処理
  if (rootNode.childNodes && rootNode.childNodes.length > 0) {
    for (const childNode of rootNode.childNodes) {
      translatedCount += translateElements(childNode, translationMap);
    }
  }
  
  return translatedCount;
}

// GitHub固有の要素を翻訳
function translateGitHubSpecificElements(rootElement, translationMap) {
  let translatedCount = 0;
  
  // UnderlineNav-item (リポジトリタブ)の処理
  const underlineNavItems = rootElement.querySelectorAll('.UnderlineNav-item, .js-selected-navigation-item');
  
  underlineNavItems.forEach(item => {
    // span要素内のテキストを取得
    const spans = item.querySelectorAll('span');
    spans.forEach(span => {
      const text = span.textContent.trim();
      const translated = translationMap[text];
      
      if (translated) {
        debugLog('GitHub UnderlineNav 置換:', text, '->', translated);
        span.textContent = translated;
        translatedCount++;
      }
    });
    
    // SVGの後ろにあるテキストノードを処理
    for (const child of item.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent.trim();
        if (text && translationMap[text]) {
          child.textContent = child.textContent.replace(text, translationMap[text]);
          translatedCount++;
        }
      }
    }
    
    // data-content属性を確認
    if (item.hasAttribute('data-content')) {
      const content = item.getAttribute('data-content');
      const translated = translationMap[content];
      
      if (translated) {
        debugLog('GitHub data-content 置換:', content, '->', translated);
        item.setAttribute('data-content', translated);
        translatedCount++;
      }
    }
  });
  
  // 特別処理: reponav-itemクラス (古いUIのリポジトリタブ)
  const repoNavItems = rootElement.querySelectorAll('.reponav-item');
  
  repoNavItems.forEach(item => {
    // span要素内のテキストを確認
    const spans = item.querySelectorAll('span');
    spans.forEach(span => {
      const text = span.textContent.trim();
      const translated = translationMap[text];
      
      if (translated) {
        debugLog('GitHub repoNav 置換:', text, '->', translated);
        span.textContent = translated;
        translatedCount++;
      }
    });
  });
  
  // リポジトリヘッダーのdata-content属性を持つ要素を特別処理
  const headerLinks = rootElement.querySelectorAll('.pagehead-tabs-item');
  
  headerLinks.forEach(link => {
    if (link.hasAttribute('data-content')) {
      const content = link.getAttribute('data-content');
      const translated = translationMap[content];
      
      if (translated) {
        debugLog('GitHub header data-content 置換:', content, '->', translated);
        link.setAttribute('data-content', translated);
        
        // テキストも置換
        if (link.textContent.trim() === content) {
          link.textContent = translated;
        }
        
        translatedCount++;
      }
    }
  });
  
  return translatedCount;
}

// DOMの変更を監視するMutationObserverの設定
function setupMutationObserver(translationMap) {
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
      
      // GitHubの特殊なdata-content要素を処理
      if (currentDomain.includes('github.com')) {
        const dataContentElements = [];
        
        // 変更されたdata-content属性を持つ要素を収集
        mutations.forEach(mutation => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-content') {
            dataContentElements.push(mutation.target);
          }
          
          // 追加されたノード内のdata-content属性を持つ要素を検索
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.hasAttribute('data-content')) {
                dataContentElements.push(node);
              }
              
              const childDataContentElements = node.querySelectorAll('[data-content]');
              childDataContentElements.forEach(el => dataContentElements.push(el));
            }
          });
        });
        
        // 重複を除去
        const uniqueElements = [...new Set(dataContentElements)];
        
        // data-content属性を翻訳
        uniqueElements.forEach(el => {
          const content = el.getAttribute('data-content');
          if (content && translationMap[content]) {
            debugLog(`動的data-content属性翻訳: "${content}" -> "${translationMap[content]}"`);
            el.setAttribute('data-content', translationMap[content]);
            
            // テキストコンテンツも一致する場合は翻訳
            if (el.textContent.trim() === content) {
              el.textContent = translationMap[content];
            }
            
            translatedCount++;
          }
        });
      }
      
      // 通常の変更を処理
      mutations.forEach(mutation => {
        // 追加されたノードを処理
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
            translatedCount += translateElements(node, translationMap);
          }
        });
        
        // 属性変更を処理（クラス変更による表示/非表示など）
        if (mutation.type === 'attributes' && 
            mutation.attributeName !== 'data-content') { // data-contentは既に処理済み
          translatedCount += translateElements(mutation.target, translationMap);
        }
        
        // テキスト変更を処理
        if (mutation.type === 'characterData') {
          translatedCount += translateElements(mutation.target, translationMap);
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
  
  // Observerを開始（属性変化も監視）
  window.translationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'aria-label', 'data-content', 'data-view-component']
  });
  
  debugLog('MutationObserver設定完了');
}

// 翻訳をリセットする関数
function resetTranslations() {
  debugLog('翻訳リセット開始');
  
  // MutationObserverを切断
  if (window.translationObserver) {
    window.translationObserver.disconnect();
    window.translationObserver = null;
    debugLog('MutationObserver切断完了');
  }
  
  // 処理済み要素リストをクリア
  processedElements = new WeakSet();
  
  debugLog('ページ再読み込み実行');
  // ここでは簡単化のためページの再読み込みを行う
  window.location.reload();
}

// 初期化を実行
debugLog('コンテンツスクリプト読み込み完了、初期化開始');
initialize();
