// entry-manager-ui-list.js - リスト表示関連機能

// 翻訳エントリーリストの表示（フィルタリング対応）
function renderEntryList() {
  entryListEl.innerHTML = '';
  
  // フィルターと検索条件を適用
  const filteredEntries = getFilteredEntries();
  
  // 表示件数の更新
  updateEntryCountDisplay();
  
  if (filteredEntries.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = '表示できる翻訳エントリーがありません。';
    entryListEl.appendChild(emptyMessage);
    return;
  }
  
  // 各エントリーを表示
  filteredEntries.forEach(entry => {
    const originalIndex = currentDomainTranslations.indexOf(entry);
    const entryItem = createEntryListItem(entry, originalIndex);
    entryListEl.appendChild(entryItem);
  });
  
  // 以前選択されていたエントリーがある場合、選択状態を復元
  if (selectedEntryIndex >= 0) {
    const selectedItem = entryListEl.querySelector(`[data-index="${selectedEntryIndex}"]`);
    if (selectedItem) {
      selectedItem.classList.add('selected');
    } else {
      // 選択されていたエントリーがフィルタリングで非表示になっている場合
      resetPanel();
    }
  }
}

// エントリーリストアイテムの作成
function createEntryListItem(entry, index) {
  const entryItem = document.createElement('div');
  entryItem.className = 'entry-item';
  entryItem.dataset.index = index;
  
  // 選択されているエントリーの場合はselectedクラスを追加
  if (index === selectedEntryIndex) {
    entryItem.classList.add('selected');
  }
  
  const entryText = document.createElement('div');
  entryText.className = 'entry-text';
  
  const entryOriginalText = document.createElement('div');
  entryOriginalText.className = 'entry-original';
  entryOriginalText.textContent = entry.original;
  
  const entryTranslatedText = document.createElement('div');
  entryTranslatedText.className = 'entry-translated';
  entryTranslatedText.textContent = `→ ${entry.translated}`;
  
  entryText.appendChild(entryOriginalText);
  entryText.appendChild(entryTranslatedText);
  
  const entryInfo = document.createElement('div');
  entryInfo.className = 'entry-info';
  
  if (entry.context) {
    const contextBadge = document.createElement('span');
    contextBadge.className = 'entry-badge';
    contextBadge.textContent = entry.context;
    entryInfo.appendChild(contextBadge);
  }
  
  if (entry.regex) {
    const regexBadge = document.createElement('span');
    regexBadge.className = 'entry-badge regex';
    regexBadge.textContent = '正規表現';
    entryInfo.appendChild(regexBadge);
  }
  
  entryText.appendChild(entryInfo);
  entryItem.appendChild(entryText);
  
  // クリックイベント - エントリー選択
  entryItem.addEventListener('click', () => {
    // 前の選択を解除
    document.querySelectorAll('.entry-item.selected').forEach(item => {
      item.classList.remove('selected');
    });
    
    // このアイテムを選択状態に
    entryItem.classList.add('selected');
    selectedEntryIndex = index;
    
    // 編集パネルの表示更新
    updateEditPanel(entry);
  });
  
  return entryItem;
}

// エントリー選択時の編集パネル更新
function updateEditPanel(entry) {
  // パネルタイトルと操作ボタンを表示
  panelTitleEl.textContent = '翻訳エントリーの編集';
  panelActionsEl.style.display = 'block';
  
  // 選択なしメッセージを非表示、タブコンテナを表示
  noSelectionMessageEl.style.display = 'none';
  tabContainerEl.style.display = 'flex';
  
  // フォームに値を設定
  document.getElementById('entry-original').value = entry.original;
  document.getElementById('entry-translated').value = entry.translated;
  document.getElementById('entry-context').value = entry.context || '';
  document.getElementById('entry-regex').checked = !!entry.regex;
  
  // 編集モードをセット
  editingEntryIndex = selectedEntryIndex;
  
  // 編集タブを選択
  document.querySelector('[data-tab="edit"]').click();
  
  // 正規表現エントリーの場合、テストタブにも値を設定
  if (entry.regex) {
    document.getElementById('regex-pattern').value = entry.original;
    document.getElementById('regex-replacement').value = entry.translated;
    document.getElementById('regex-test-input').value = '';
    document.getElementById('regex-test-result').innerHTML = '';
  }
}
