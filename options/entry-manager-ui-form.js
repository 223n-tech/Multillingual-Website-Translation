// entry-manager-ui-form.js - フォーム操作関連機能

// フォーム要素
const entryFormEl = document.getElementById('translation-entry-form');
const entryOriginalEl = document.getElementById('entry-original');
const entryTranslatedEl = document.getElementById('entry-translated');
const entryContextEl = document.getElementById('entry-context');
const entryRegexEl = document.getElementById('entry-regex');
const cancelEditBtnEl = document.getElementById('cancel-edit-btn');

// 正規表現テスト要素
const regexPatternEl = document.getElementById('regex-pattern');
const regexReplacementEl = document.getElementById('regex-replacement');
const regexTestInputEl = document.getElementById('regex-test-input');
const regexTestResultEl = document.getElementById('regex-test-result');
const runRegexTestEl = document.getElementById('run-regex-test');
const regexTestCopyEl = document.getElementById('regex-test-copy');
const regexTestClearEl = document.getElementById('regex-test-clear');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  // フォーム関連のイベントリスナー
  entryFormEl.addEventListener('submit', handleFormSubmit);
  cancelEditBtnEl.addEventListener('click', handleCancelEdit);
  
  // 正規表現テスト関連のイベントリスナー
  runRegexTestEl.addEventListener('click', handleRunRegexTest);
  regexTestCopyEl.addEventListener('click', handleCopyRegexResult);
  regexTestClearEl.addEventListener('click', handleClearRegexTest);
  
  // 正規表現チェックボックスの変更リスナー
  entryRegexEl.addEventListener('change', () => {
    // 正規表現チェックボックスのトグル時に説明文のスタイルを変更
    const helpText = entryRegexEl.nextElementSibling.nextElementSibling;
    helpText.style.opacity = entryRegexEl.checked ? '1' : '0.7';
  });
});

// 新規エントリー追加フォームの表示
function showAddEntryForm() {
  // フォームをリセット
  entryFormEl.reset();
  
  // パネルタイトルと操作ボタンを更新
  panelTitleEl.textContent = '新しい翻訳エントリー';
  panelActionsEl.style.display = 'none';
  
  // 選択なしメッセージを非表示、タブコンテナを表示
  noSelectionMessageEl.style.display = 'none';
  tabContainerEl.style.display = 'flex';
  
  // 編集モードをリセット
  editingEntryIndex = -1;
  
  // 編集タブを選択
  document.querySelector('[data-tab="edit"]').click();
  
  // フォーカスを設定
  entryOriginalEl.focus();
}

// フォーム送信処理
function handleFormSubmit(event) {
  event.preventDefault();
  
  // フォームデータの取得
  const entryData = {
    original: entryOriginalEl.value,
    translated: entryTranslatedEl.value,
    context: entryContextEl.value || undefined,
    regex: entryRegexEl.checked || undefined
  };
  
  // エントリーの保存
  if (saveEntry(entryData)) {
    // リスト再描画
    renderEntryList();
    
    // 統計の更新
    updateStatistics();
    
    // エントリーが追加された場合、そのエントリーを選択
    if (editingEntryIndex < 0) {
      // 新規追加の場合は最後のエントリーになる
      selectedEntryIndex = currentDomainTranslations.length - 1;
      updateEditPanel(currentDomainTranslations[selectedEntryIndex]);
    }
    
    // 保存成功メッセージ
    showNotification('エントリーを保存しました');
  }
}

// 編集キャンセル処理
function handleCancelEdit() {
  if (selectedEntryIndex >= 0) {
    // 選択中のエントリーがある場合はその表示に戻す
    updateEditPanel(currentDomainTranslations[selectedEntryIndex]);
  } else {
    // 選択中のエントリーがない場合はパネルをリセット
    resetPanel();
  }
}

// 正規表現テスト実行
function handleRunRegexTest() {
  const pattern = regexPatternEl.value;
  const replacement = regexReplacementEl.value;
  const testInput = regexTestInputEl.value;
  
  // テスト実行
  const result = performRegexTest(pattern, replacement, testInput);
  
  // 結果表示
  if (result.success) {
    let resultHtml = '<span class="successful-match">マッチ成功!</span><br><br>';
    resultHtml += `<strong>マッチした数:</strong> ${result.matchCount}<br>`;
    resultHtml += `<strong>マッチしたテキスト:</strong> ${result.matches.join(', ')}<br><br>`;
    resultHtml += `<strong>置換前:</strong> ${result.original}<br>`;
    resultHtml += `<strong>置換後:</strong> ${result.replaced}`;
    
    regexTestResultEl.innerHTML = resultHtml;
    
    // 成功したら編集フォームにも値を反映
    entryOriginalEl.value = pattern;
    entryTranslatedEl.value = replacement;
    entryRegexEl.checked = true;
  } else {
    regexTestResultEl.innerHTML = `<span class="no-match">${result.message}</span>`;
  }
}

// 正規表現テスト結果をコピー
function handleCopyRegexResult() {
  const resultText = regexTestResultEl.textContent;
  navigator.clipboard.writeText(resultText).then(() => {
    showNotification('結果をクリップボードにコピーしました');
  }).catch(err => {
    console.error('コピーに失敗しました:', err);
    showError('コピーに失敗しました');
  });
}

// 正規表現テストフォームをクリア
function handleClearRegexTest() {
  regexPatternEl.value = '';
  regexReplacementEl.value = '';
  regexTestInputEl.value = '';
  regexTestResultEl.innerHTML = '';
}

// 通知メッセージの表示
function showNotification(message) {
  // 簡易的な通知表示（実装はプロジェクトに合わせて調整）
  alert(message);
}
