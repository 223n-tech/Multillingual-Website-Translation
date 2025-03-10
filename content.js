// content.js - メインコンテンツスクリプト
// 分割ファイルを参照してまとめる

// デバッグフラグ
const DEBUG = true;

// デバッグログ関数
function debugLog(...args) {
  if (DEBUG) {
    console.log('[翻訳拡張]', ...args);
  }
}

// 翻訳データとコンテキスト関連の変数
let translations = null;
let contextMapping = null;
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
      loadTranslationsAndMapping();
      sendResponse({success: true});
    } else if (message.action === 'stopTranslation') {
      resetTranslations();
      sendResponse({success: true});
    }
    return true; // 非同期レスポンスのためにtrueを返す
  });
  
  // 初回実行時にも翻訳データを読み込む
  debugLog('初回翻訳データ読み込み開始');
  loadTranslationsAndMapping();
  
  // 遅延再翻訳（動的コンテンツ対応）
  setTimeout(() => {
    debugLog('遅延翻訳実行');
    loadTranslationsAndMapping();
  }, 2000); // 2秒後に再度翻訳を実行
}

// 翻訳データとコンテキストマッピングの読み込み
async function loadTranslationsAndMapping() {
  try {
    // 翻訳中フラグをチェック
    if (isTranslating) {
      debugLog('すでに翻訳処理中のため、スキップします');
      return;
    }
    
    debugLog('翻訳データ読み込み開始', currentDomain);
    
    // バックグラウンドスクリプトから翻訳データとコンテキストマッピングを取得
    chrome.runtime.sendMessage(
      { action: 'getTranslationsAndMapping', domain: currentDomain },
      response => {
        debugLog('翻訳データレスポンス受信', response);
        
        if (response && response.success) {
          try {
            // 翻訳データのYAMLをパース
            if (response.translations) {
              debugLog('YAML解析開始 (翻訳データ)');
              translations = jsyaml.load(response.translations);
              debugLog('YAML解析完了 (翻訳データ)', translations);
            }
            
            // コンテキストマッピングのYAMLをパース
            if (response.contextMapping) {
              debugLog('YAML解析開始 (コンテキストマッピング)');
              contextMapping = jsyaml.load(response.contextMapping);
              debugLog('YAML解析完了 (コンテキストマッピング)', contextMapping);
            } else {
              debugLog('コンテキストマッピングデータなし、デフォルト設定を使用します');
              contextMapping = createDefaultContextMapping();
            }
            
            // 両方のデータが利用可能なら翻訳を実行
            if (translations && contextMapping) {
              startTranslation();
            }
          } catch (yamlError) {
            console.error('YAMLパース失敗:', yamlError);
            debugLog('YAML解析失敗', yamlError);
          }
        } else {
          // 後方互換性のために旧メッセージタイプもサポート
          chrome.runtime.sendMessage(
            { action: 'getTranslations', domain: currentDomain },
            legacyResponse => {
              if (legacyResponse && legacyResponse.success && legacyResponse.translations) {
                try {
                  // YAMLをパース
                  debugLog('YAML解析開始 (旧形式翻訳データ)');
                  translations = jsyaml.load(legacyResponse.translations);
                  debugLog('YAML解析完了 (旧形式翻訳データ)', translations);
                  
                  // デフォルトのコンテキストマッピングを使用
                  contextMapping = createDefaultContextMapping();
                  
                  // 翻訳を実行
                  startTranslation();
                } catch (yamlError) {
                  console.error('YAMLパース失敗:', yamlError);
                  debugLog('YAML解析失敗', yamlError);
                }
              } else {
                console.error('翻訳データの取得に失敗しました', legacyResponse ? legacyResponse.error : 'レスポンスなし');
                debugLog('翻訳データ取得失敗', legacyResponse);
              }
            }
          );
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

    // 特定のキーワードを直接翻訳
    translatedCount += translateDirectKeywords(document.body);
    
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

// 重要なキーワードを直接翻訳するユーティリティ関数
function translateDirectKeywords(rootElement) {
  let translatedCount = 0;
  const directTranslations = {
    "Issues": "課題",
    "Pull requests": "プルリクエスト",
    "Marketplace": "マーケットプレイス",
    "Explore": "探索"
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

// 初期化を実行
debugLog('コンテンツスクリプト読み込み完了、初期化開始');
// DOMContentLoadedイベントが既に発生している場合のフォールバック
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  initialize();
} else {
  document.addEventListener('DOMContentLoaded', initialize);
}
