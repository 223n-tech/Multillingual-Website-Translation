// content-observer.js - 超簡潔版 DOM変更監視機能

// DOMの変更を監視するMutationObserverの設定
function setupMutationObserver() {
  // 既存のObserverがあれば切断
  if (window.translationObserver) {
    window.translationObserver.disconnect();
  }
  
  // デバウンスタイマー
  let debounceTimer = null;
  
  // MutationObserverの作成
  window.translationObserver = new MutationObserver(mutations => {
    if (isTranslating) return;
    
    // デバウンス処理（短時間の連続変更をまとめる）
    if (debounceTimer) clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(() => {
      isTranslating = true;
      let batchNodes = [];
      
      try {
        // 変更のあったノードを収集
        mutations.forEach(mutation => {
          // 新しく追加されたノード
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              batchNodes.push(node);
            } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
              translateTextNode(node);
            }
          });
          
          // 属性が変更されたノード
          if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
            translateElementAttributes(mutation.target);
          }
          
          // テキストが変更されたノード
          if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
            translateTextNode(mutation.target);
          }
        });
        
        // バッチノードの処理（最大10個ずつ）
        processBatchNodes(batchNodes, () => {
          isTranslating = false;
        });
      } catch (error) {
        console.error('MutationObserver処理エラー:', error);
        isTranslating = false;
      }
    }, 100); // 100msのデバウンス
  });
  
  // 監視設定
  window.translationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['data-content', 'aria-label', 'title']
  });
}

// バッチノードを少しずつ処理
function processBatchNodes(nodes, callback, index = 0, batchSize = 10) {
  if (index >= nodes.length) {
    callback();
    return;
  }
  
  const endIndex = Math.min(index + batchSize, nodes.length);
  
  for (let i = index; i < endIndex; i++) {
    const node = nodes[i];
    if (!processedElements.has(node)) {
      translateElementAttributes(node);
      
      // 子ノードも処理
      if (node.childNodes && node.childNodes.length > 0) {
        for (const child of node.childNodes) {
          if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
            translateTextNode(child);
          }
        }
      }
      
      processedElements.add(node);
    }
  }
  
  // 残りのノードは非同期で処理
  setTimeout(() => {
    processBatchNodes(nodes, callback, endIndex, batchSize);
  }, 0);
}
