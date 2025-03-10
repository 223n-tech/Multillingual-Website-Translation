// entry-manager-io.js - インポート/エクスポート機能

// モーダル要素
const importExportModalEl = document.getElementById('import-export-modal');
const closeImportExportModalEl = document.getElementById('close-import-export-modal');
const exportEntriesBtnEl = document.getElementById('export-entries-btn');
const importEntriesBtnEl = document.getElementById('import-entries-btn');
const importFileEl = document.getElementById('import-file');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  // インポート/エクスポートモーダル関連のイベントリスナー
  closeImportExportModalEl.addEventListener('click', hideImportExportModal);
  exportEntriesBtnEl.addEventListener('click', exportEntries);
  importEntriesBtnEl.addEventListener('click', () => importFileEl.click());
  importFileEl.addEventListener('change', importEntries);
  
  // モーダルの外側をクリックしたときに閉じる
  window.addEventListener('click', event => {
    if (event.target === importExportModalEl) {
      hideImportExportModal();
    }
  });
});

// インポート/エクスポートモーダルの表示
function showImportExportModal() {
  importExportModalEl.style.display = 'block';
}

// インポート/エクスポートモーダルの非表示
function hideImportExportModal() {
  importExportModalEl.style.display = 'none';
}

// エントリーのエクスポート
function exportEntries() {
  try {
    if (!currentDomainTranslations || currentDomainTranslations.length === 0) {
      showError('エクスポートするエントリーがありません');
      return;
    }
    
    // 元のYAMLをロード
    const originalYaml = jsyaml.load(currentTranslationYaml);
    
    // 現在の翻訳エントリーを使用
    originalYaml.translations = currentDomainTranslations;
    
    // JSONデータも用意
    const jsonData = JSON.stringify(originalYaml, null, 2);
    
    // エクスポート形式の選択（簡易版）
    const format = prompt('エクスポート形式を選択してください (yaml/json):', 'yaml');
    
    if (format === 'json') {
      // JSONとしてエクスポート
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const filename = `${originalYaml.site || 'translation'}.json`;
      
      downloadFile(url, filename);
    } else {
      // YAMLとしてエクスポート（デフォルト）
      const yamlContent = jsyaml.dump(originalYaml);
      const blob = new Blob([yamlContent], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const filename = `${originalYaml.site || 'translation'}.yml`;
      
      downloadFile(url, filename);
    }
    
    hideImportExportModal();
  } catch (error) {
    showError(`エクスポートに失敗しました: ${error.message}`);
  }
}

// エントリーのインポート
function importEntries(event) {
  try {
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const fileContent = e.target.result;
        let importedData;
        
        // ファイル形式に応じたパース
        if (file.name.endsWith('.json')) {
          importedData = JSON.parse(fileContent);
        } else {
          // YAMLとして解析
          importedData = jsyaml.load(fileContent);
        }
        
        // データの検証
        if (!importedData || !importedData.translations || !Array.isArray(importedData.translations)) {
          throw new Error('無効なファイル形式です。translations配列が見つかりません。');
        }
        
        // インポート方法の選択
        const importMethod = confirm(
          `${importedData.translations.length}件のエントリーを含むファイルです。\n` +
          '既存のエントリーを置き換えますか？\n' +
          '「キャンセル」を選択すると、既存のエントリーに追加されます。'
        );
        
        if (importMethod) {
          // 既存のエントリーを置き換え
          currentDomainTranslations = importedData.translations;
        } else {
          // 既存のエントリーに追加（重複は無視）
          const existingKeys = new Set();
          currentDomainTranslations.forEach(entry => {
            existingKeys.add(`${entry.original}|${entry.context || ''}`);
          });
          
          // 重複しないエントリーを追加
          importedData.translations.forEach(entry => {
            const key = `${entry.original}|${entry.context || ''}`;
            if (!existingKeys.has(key)) {
              currentDomainTranslations.push(entry);
              existingKeys.add(key);
            }
          });
        }
        
        // UI更新
        updateStatistics();
        updateContextFilterOptions();
        renderEntryList();
        
        // 変更フラグを設定
        hasUnsavedChanges = true;
        
        // 完了メッセージ
        alert(`${importedData.translations.length}件のエントリーをインポートしました。`);
        
        hideImportExportModal();
      } catch (error) {
        showError(`インポートに失敗しました: ${error.message}`);
      }
    };
    
    reader.onerror = () => {
      showError('ファイルの読み込みに失敗しました');
    };
    
    reader.readAsText(file);
  } catch (error) {
    showError(`インポートに失敗しました: ${error.message}`);
  } finally {
    // ファイル入力をリセット（同じファイルを再選択できるように）
    importFileEl.value = '';
  }
}

// ファイルのダウンロード
function downloadFile(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  // リソース解放
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}
