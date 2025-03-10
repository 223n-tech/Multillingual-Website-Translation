// options-io.js - 設定のインポート/エクスポート機能

// DOM要素
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  // インポート/エクスポートボタンのイベントリスナー
  exportBtn.addEventListener('click', exportSettings);
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', importSettings);
});

// 設定のエクスポート
async function exportSettings() {
  try {
    const { settings } = await chrome.storage.local.get('settings');
    
    // 設定をYAML形式に変換
    const yamlContent = jsyaml.dump(settings);
    
    // ダウンロード用のリンクを作成
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'translation-settings.yml';
    a.click();
    
    // クリーンアップ
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('設定のエクスポートに失敗しました:', error);
    alert('エラー: 設定のエクスポートに失敗しました。詳細はコンソールを確認してください。');
  }
}

// 設定のインポート
async function importSettings(event) {
  try {
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const yamlContent = e.target.result;
        const importedSettings = jsyaml.load(yamlContent);
        
        // 設定の検証
        if (!importedSettings || typeof importedSettings !== 'object') {
          throw new Error('無効な設定ファイルです。');
        }
        
        // 設定を保存
        await chrome.storage.local.set({ settings: importedSettings });
        
        // UI更新
        loadSettings();
        
        alert('設定のインポートが完了しました。');
      } catch (error) {
        console.error('設定のインポートに失敗しました:', error);
        alert('エラー: 設定のインポートに失敗しました。詳細はコンソールを確認してください。');
      }
    };
    
    reader.onerror = () => {
      console.error('ファイルの読み込みに失敗しました。');
      alert('エラー: ファイルの読み込みに失敗しました。');
    };
    
    reader.readAsText(file);
  } catch (error) {
    console.error('設定のインポートに失敗しました:', error);
    alert('エラー: 設定のインポートに失敗しました。詳細はコンソールを確認してください。');
  } finally {
    // 同じファイルを再度選択できるようにする
    event.target.value = '';
  }
}
