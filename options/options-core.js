// options-core.js - 基本設定管理

// DOM要素
const translationActive = document.getElementById('translation-active');
const activeStatus = document.getElementById('active-status');
const domainList = document.getElementById('domain-list');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  // 設定を読み込む
  loadSettings();
  
  // 翻訳有効/無効のイベントリスナー
  translationActive.addEventListener('change', toggleTranslation);
});

// 設定の読み込み
async function loadSettings() {
  try {
    const { settings } = await chrome.storage.local.get('settings');
    
    if (!settings) {
      console.warn('設定が見つかりません。デフォルト設定を使用します。');
      return;
    }
    
    // 翻訳の有効/無効状態を設定
    translationActive.checked = settings.active;
    updateActiveStatus(settings.active);
    
    // ドメインリストを表示
    renderDomainList(settings.domains || []);
  } catch (error) {
    console.error('設定の読み込みに失敗しました:', error);
  }
}

// 翻訳の有効/無効を切り替え
async function toggleTranslation() {
  const active = translationActive.checked;
  updateActiveStatus(active);
  
  try {
    const { settings } = await chrome.storage.local.get('settings');
    settings.active = active;
    await chrome.storage.local.set({ settings });
    
    // バックグラウンドスクリプトに通知
    chrome.runtime.sendMessage({ action: 'toggleTranslation', active });
  } catch (error) {
    console.error('翻訳状態の変更に失敗しました:', error);
  }
}

// アクティブ状態のテキストを更新
function updateActiveStatus(active) {
  activeStatus.textContent = active ? '有効' : '無効';
  activeStatus.style.color = active ? '#28a745' : '#d73a49';
}

// エラーメッセージの表示
function showError(message) {
  alert(message);
  console.error(message);
}
