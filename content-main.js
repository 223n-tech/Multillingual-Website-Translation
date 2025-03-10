// content-main.js - メイン統合ファイル
// 分割されたJSファイルを統合して実行する

// グローバル変数
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
          if (response && response.success && response.translations) {
            try {
              // YAMLをパース
              debugLog('YAML解析開始 (旧形式翻訳データ)');
              translations = jsyaml.load(response.translations);
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
            console.error('翻訳データの取得に失敗しました', response ? response.error : 'レスポンスなし');
            debugLog('翻訳データ取得失敗', response);
          }
        }
      }
    );
  } catch (error) {
    console.error('翻訳データの読み込みに失敗しました:', error);
    debugLog('翻訳データ読み込み例外', error);
  }
}

// 初期化を実行
debugLog('コンテンツスクリプト読み込み完了、初期化開始');
document.addEventListener('DOMContentLoaded', initialize);
// DOMContentLoadedイベントが既に発生している場合のフォールバック
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  // DOMが既にロード済みの場合は直ちに初期化
  initialize();
}