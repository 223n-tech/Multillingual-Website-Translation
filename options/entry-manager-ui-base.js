// entry-manager-ui-base.js - UI基本操作

// DOM要素
const entryListEl = document.getElementById('entry-list');
const searchInputEl = document.getElementById('search-input');
const contextFilterEl = document.getElementById('context-filter');
const entryCountDisplayEl = document.getElementById('entry-count-display');
const addEntryBtnEl = document.getElementById('add-entry-btn');
const saveAllBtnEl = document.getElementById('save-all-btn');
const backToOptionsBtnEl = document.getElementById('back-to-options');
const deleteEntryBtnEl = document.getElementById('delete-entry-btn');
const importExportBtnEl = document.getElementById('import-export-btn');

// パネル関連
const panelTitleEl = document.getElementById('panel-title');
const panelActionsEl = document.getElementById('panel-actions');
const noSelectionMessageEl = document.getElementById('no-selection-message');
const tabContainerEl = document.getElementById('tab-container');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  // URLパラメータからドメインIDを取得
  const urlParams = new URLSearchParams(window.location.search);
  const domainId = urlParams.get('domain');
  
  if (!domainId) {
    showError('ドメインパラメータが指定されていません');
    return;
  }
  
  // ドメインデータの取得
  loadDomainData(parseInt(domainId)).then(success => {
    if (success) {
      // 統計情報の更新
      updateStatistics();
      
      // コンテキストフィルターの選択肢を更新
      updateContextFilterOptions();
      
      // エントリーリストを表示
      renderEntryList();
    }
  });
  
  // 基本イベントリスナーの設定
  addEntryBtnEl.addEventListener('click', showAddEntryForm);
  saveAllBtnEl.addEventListener('click', saveTranslationFile);
  backToOptionsBtnEl.addEventListener('click', navigateToOptions);
  deleteEntryBtnEl.addEventListener('click', handleDeleteEntry);
  importExportBtnEl.addEventListener('click', showImportExportModal);
  searchInputEl.addEventListener('input', handleSearch);
  contextFilterEl.addEventListener('change', handleContextFilter);
  
  // タブ切り替え
  document.querySelectorAll('.tab-header').forEach(header => {
    header.addEventListener('click', () => {
      // アクティブクラスをすべて削除
      document.querySelectorAll('.tab-header').forEach(h => h.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      // クリックされたタブをアクティブに
      header.classList.add('active');
      const tabId = header.getAttribute('data-tab') + '-tab';
      document.getElementById(tabId).classList.add('active');
    });
  });
});

// コンテキストフィルターオプションの更新
function updateContextFilterOptions() {
  // コンテキストの一覧を取得
  const contexts = new Set();
  
  currentDomainTranslations.forEach(entry => {
    if (entry.context) {
      contexts.add(entry.context);
    } else {
      contexts.add('');
    }
  });
  
  // 現在の選択を保存
  const currentSelection = contextFilterEl.value;
  
  // 選択肢をクリア（「すべて」は残す）
  while (contextFilterEl.options.length > 1) {
    contextFilterEl.remove(1);
  }
  
  // コンテキストを追加
  const sortedContexts = Array.from(contexts).sort();
  sortedContexts.forEach(context => {
    const option = document.createElement('option');
    option.value = context;
    option.textContent = context || 'グローバル（コンテキストなし）';
    contextFilterEl.appendChild(option);
  });
  
  // 以前の選択を復元（存在すれば）
  if (currentSelection && Array.from(contextFilterEl.options).some(opt => opt.value === currentSelection)) {
    contextFilterEl.value = currentSelection;
  }
}

// 検索処理
function handleSearch() {
  searchTerm = searchInputEl.value.trim();
  renderEntryList();
}

// コンテキストフィルター処理
function handleContextFilter() {
  filterContext = contextFilterEl.value;
  renderEntryList();
}

// エントリー削除処理
function handleDeleteEntry() {
  if (deleteSelectedEntry()) {
    // リスト再描画
    renderEntryList();
    
    // 統計の更新
    updateStatistics();
    
    // パネル表示リセット
    resetPanel();
  }
}

// オプションページに戻る
function navigateToOptions() {
  if (hasUnsavedChanges) {
    if (!confirm('保存されていない変更があります。このまま移動しますか？')) {
      return;
    }
  }
  
  chrome.runtime.openOptionsPage();
}

// パネル表示のリセット
function resetPanel() {
  // タイトルとアクション表示をリセット
  panelTitleEl.textContent = 'エントリーを選択してください';
  panelActionsEl.style.display = 'none';
  
  // 選択なしメッセージを表示
  noSelectionMessageEl.style.display = 'flex';
  tabContainerEl.style.display = 'none';
  
  // 選択状態をリセット
  selectedEntryIndex = -1;
}
