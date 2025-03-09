// 設定ページのJavaScript

// DOM要素
const translationActive = document.getElementById('translation-active');
const activeStatus = document.getElementById('active-status');
const domainList = document.getElementById('domain-list');
const addDomainBtn = document.getElementById('add-domain-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');

// モーダル要素
const domainModal = document.getElementById('domain-modal');
const modalTitle = document.getElementById('modal-title');
const domainForm = document.getElementById('domain-form');
const domainInput = document.getElementById('domain-input');
const nameInput = document.getElementById('name-input');
const repositoryInput = document.getElementById('repository-input');
const descriptionInput = document.getElementById('description-input');
const domainEnabled = document.getElementById('domain-enabled');
const cancelBtn = document.getElementById('cancel-btn');
const closeBtn = document.querySelector('.close');

// 翻訳エントリー管理モーダル要素
const entryModal = document.getElementById('entry-modal');
const entryModalClose = document.getElementById('entry-modal-close');
const entryList = document.getElementById('entry-list');
const addEntryBtn = document.getElementById('add-entry-btn');
const saveEntriesBtn = document.getElementById('save-entries-btn');
const closeEntryModalBtn = document.getElementById('close-entry-modal-btn');

// エントリー編集フォーム要素
const entryEditForm = document.getElementById('entry-edit-form');
const entryFormTitle = document.getElementById('entry-form-title');
const translationEntryForm = document.getElementById('translation-entry-form');
const entryOriginal = document.getElementById('entry-original');
const entryTranslated = document.getElementById('entry-translated');
const entryContext = document.getElementById('entry-context');
const entryRegex = document.getElementById('entry-regex');
const entryCancelBtn = document.getElementById('entry-cancel-btn');

// 正規表現テストツール要素
const testRegexBtn = document.getElementById('test-regex-btn');
const regexTestTool = document.getElementById('regex-test-tool');
const regexPattern = document.getElementById('regex-pattern');
const regexReplacement = document.getElementById('regex-replacement');
const regexTestInput = document.getElementById('regex-test-input');
const runRegexTest = document.getElementById('run-regex-test');
const regexTestCancel = document.getElementById('regex-test-cancel');
const regexTestResult = document.getElementById('regex-test-result');

// 編集中のドメインのインデックス
let editingIndex = -1;

// 現在のドメイン設定と翻訳エントリー
let currentDomainTranslations = [];
let currentDomainIndex = -1;
let editingEntryIndex = -1;
let currentTranslationYaml = null;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  // 設定を読み込む
  loadSettings();
  
  // イベントリスナーの設定 - 基本設定
  translationActive.addEventListener('change', toggleTranslation);
  addDomainBtn.addEventListener('click', showAddDomainModal);
  domainForm.addEventListener('submit', saveDomainSettings);
  cancelBtn.addEventListener('click', closeDomainModal);
  closeBtn.addEventListener('click', closeDomainModal);
  exportBtn.addEventListener('click', exportSettings);
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', importSettings);
  
  // イベントリスナーの設定 - 翻訳エントリー管理
  entryModalClose.addEventListener('click', closeEntryModal);
  closeEntryModalBtn.addEventListener('click', closeEntryModal);
  addEntryBtn.addEventListener('click', showAddEntryForm);
  entryCancelBtn.addEventListener('click', hideEntryForm);
  translationEntryForm.addEventListener('submit', saveEntryForm);
  saveEntriesBtn.addEventListener('click', saveAllEntries);
  
  // 正規表現テストツール
  testRegexBtn.addEventListener('click', showRegexTestTool);
  regexTestCancel.addEventListener('click', hideRegexTestTool);
  runRegexTest.addEventListener('click', performRegexTest);
  
  // モーダルの外側をクリックしたときに閉じる
  window.addEventListener('click', event => {
    if (event.target === domainModal) {
      closeDomainModal();
    }
    if (event.target === entryModal) {
      closeEntryModal();
    }
  });
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

// ドメインリストの表示
function renderDomainList(domains) {
  domainList.innerHTML = '';
  
  if (domains.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = 'ドメイン設定がありません。「ドメインを追加」ボタンから設定を追加してください。';
    domainList.appendChild(emptyMessage);
    return;
  }
  
  domains.forEach((domain, index) => {
    const domainItem = document.createElement('div');
    domainItem.className = 'domain-item';
    
    const domainInfo = document.createElement('div');
    domainInfo.className = 'domain-info';
    
    const domainTitle = document.createElement('div');
    domainTitle.className = 'domain-title';
    domainTitle.textContent = domain.name;
    
    const statusBadge = document.createElement('span');
    statusBadge.className = `domain-status ${domain.enabled ? 'enabled' : 'disabled'}`;
    statusBadge.textContent = domain.enabled ? '有効' : '無効';
    domainTitle.appendChild(statusBadge);
    
    const domainUrl = document.createElement('div');
    domainUrl.className = 'domain-url';
    domainUrl.textContent = domain.domain;
    
    const domainDesc = document.createElement('div');
    domainDesc.className = 'domain-description';
    domainDesc.textContent = domain.description || '説明なし';
    
    domainInfo.appendChild(domainTitle);
    domainInfo.appendChild(domainUrl);
    domainInfo.appendChild(domainDesc);
    
    const domainControls = document.createElement('div');
    domainControls.className = 'domain-controls';
    
    // 翻訳管理ボタンを追加
    const manageEntriesBtn = document.createElement('button');
    manageEntriesBtn.className = 'btn secondary icon';
    manageEntriesBtn.textContent = '翻訳管理';
    manageEntriesBtn.addEventListener('click', () => showEntryManageModal(index));
    
    const editBtn = document.createElement('button');
    editBtn.className = 'btn secondary icon';
    editBtn.textContent = '編集';
    editBtn.addEventListener('click', () => showEditDomainModal(index));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn danger icon';
    deleteBtn.textContent = '削除';
    deleteBtn.addEventListener('click', () => deleteDomain(index));
    
    domainControls.appendChild(manageEntriesBtn);
    domainControls.appendChild(editBtn);
    domainControls.appendChild(deleteBtn);
    
    domainItem.appendChild(domainInfo);
    domainItem.appendChild(domainControls);
    
    domainList.appendChild(domainItem);
  });
}

// ドメイン追加モーダルの表示
function showAddDomainModal() {
  modalTitle.textContent = 'ドメインを追加';
  domainForm.reset();
  domainEnabled.checked = true;
  editingIndex = -1;
  domainModal.style.display = 'block';
}

// ドメイン編集モーダルの表示
async function showEditDomainModal(index) {
  try {
    const { settings } = await chrome.storage.local.get('settings');
    const domain = settings.domains[index];
    
    modalTitle.textContent = 'ドメインを編集';
    domainInput.value = domain.domain;
    nameInput.value = domain.name;
    repositoryInput.value = domain.repository;
    descriptionInput.value = domain.description || '';
    domainEnabled.checked = domain.enabled;
    
    editingIndex = index;
    domainModal.style.display = 'block';
  } catch (error) {
    console.error('ドメイン設定の読み込みに失敗しました:', error);
  }
}

// モーダルを閉じる
function closeDomainModal() {
  domainModal.style.display = 'none';
}

// ドメイン設定の保存
async function saveDomainSettings(event) {
  event.preventDefault();
  
  try {
    const { settings } = await chrome.storage.local.get('settings');
    
    if (!settings.domains) {
      settings.domains = [];
    }
    
    const domainData = {
      domain: domainInput.value,
      name: nameInput.value,
      repository: repositoryInput.value,
      description: descriptionInput.value,
      enabled: domainEnabled.checked
    };
    
    if (editingIndex >= 0) {
      // 既存のドメイン設定を更新
      settings.domains[editingIndex] = domainData;
    } else {
      // 新しいドメイン設定を追加
      settings.domains.push(domainData);
    }
    
    await chrome.storage.local.set({ settings });
    
    // UI更新
    renderDomainList(settings.domains);
    closeDomainModal();
  } catch (error) {
    console.error('ドメイン設定の保存に失敗しました:', error);
    alert('エラー: ドメイン設定の保存に失敗しました。詳細はコンソールを確認してください。');
  }
}

// ドメイン設定の削除
async function deleteDomain(index) {
  if (!confirm('このドメイン設定を削除してもよろしいですか？')) {
    return;
  }
  
  try {
    const { settings } = await chrome.storage.local.get('settings');
    
    settings.domains.splice(index, 1);
    await chrome.storage.local.set({ settings });
    
    // UI更新
    renderDomainList(settings.domains);
  } catch (error) {
    console.error('ドメイン設定の削除に失敗しました:', error);
    alert('エラー: ドメイン設定の削除に失敗しました。詳細はコンソールを確認してください。');
  }
}

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

// --- 翻訳エントリー管理機能 ---

// 翻訳エントリー管理モーダルの表示
async function showEntryManageModal(domainIndex) {
  try {
    const { settings } = await chrome.storage.local.get('settings');
    const domain = settings.domains[domainIndex];
    
    // 翻訳エントリーを取得
    currentDomainIndex = domainIndex;
    
    // リポジトリURLから翻訳ファイルを取得
    const response = await fetch(domain.repository);
    
    if (!response.ok) {
      throw new Error(`翻訳ファイルの取得に失敗しました: ${response.status} ${response.statusText}`);
    }
    
    const yamlContent = await response.text();
    // 元のYAMLを保存（後で正確に更新するため）
    currentTranslationYaml = yamlContent;
    
    const translationData = jsyaml.load(yamlContent);
    
    if (!translationData || !translationData.translations) {
      throw new Error('無効な翻訳ファイル形式です。');
    }
    
    currentDomainTranslations = translationData.translations;
    
    // モーダルタイトルを設定
    document.getElementById('entry-modal-title').textContent = `${domain.name} - 翻訳エントリー管理`;
    
    // エントリーリストを表示
    renderEntryList();
    
    // 編集フォームを隠す
    entryEditForm.style.display = 'none';
    
    // テストツールを隠す
    regexTestTool.style.display = 'none';
    
    // モーダルを表示
    entryModal.style.display = 'block';
  } catch (error) {
    console.error('翻訳エントリーの読み込みに失敗しました:', error);
    alert('エラー: 翻訳エントリーの読み込みに失敗しました。' + error.message);
  }
}

// 翻訳エントリーリストの表示
function renderEntryList() {
  entryList.innerHTML = '';
  
  if (currentDomainTranslations.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = '翻訳エントリーがありません。「エントリー追加」ボタンから追加してください。';
    entryList.appendChild(emptyMessage);
    return;
  }
  
  currentDomainTranslations.forEach((entry, index) => {
    const entryItem = document.createElement('div');
    entryItem.className = 'entry-item';
    
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
    
    const entryControls = document.createElement('div');
    entryControls.className = 'entry-controls';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'btn secondary icon';
    editBtn.textContent = '編集';
    editBtn.addEventListener('click', () => showEditEntryForm(index));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn danger icon';
    deleteBtn.textContent = '削除';
    deleteBtn.addEventListener('click', () => deleteEntry(index));
    
    entryControls.appendChild(editBtn);
    entryControls.appendChild(deleteBtn);
    
    entryItem.appendChild(entryText);
    entryItem.appendChild(entryControls);
    
    entryList.appendChild(entryItem);
  });
}

// エントリー追加フォームの表示
function showAddEntryForm() {
  // フォームをリセット
  translationEntryForm.reset();
  entryFormTitle.textContent = '翻訳エントリーの追加';
  editingEntryIndex = -1;
  
  // 正規表現テストツールを隠す
  regexTestTool.style.display = 'none';
  
  // フォームを表示
  entryEditForm.style.display = 'block';
}

// エントリー編集フォームの表示
function showEditEntryForm(index) {
  const entry = currentDomainTranslations[index];
  
  // フォームに値を設定
  entryOriginal.value = entry.original;
  entryTranslated.value = entry.translated;
  entryContext.value = entry.context || '';
  entryRegex.checked = !!entry.regex;
  
  entryFormTitle.textContent = '翻訳エントリーの編集';
  editingEntryIndex = index;
  
  // 正規表現テストツールを隠す
  regexTestTool.style.display = 'none';
  
  // フォームを表示
  entryEditForm.style.display = 'block';
}

// エントリーフォームを隠す
function hideEntryForm() {
  entryEditForm.style.display = 'none';
}

// 正規表現テストツールを表示
function showRegexTestTool() {
  // 現在のエントリー編集フォームの値を取得
  const pattern = entryOriginal.value;
  const replacement = entryTranslated.value;
  
  // テストフォームに設定
  regexPattern.value = pattern;
  regexReplacement.value = replacement;
  regexTestInput.value = '';
  regexTestResult.innerHTML = '';
  
  // 編集フォームを隠す
  entryEditForm.style.display = 'none';
  
  // テストツールを表示
  regexTestTool.style.display = 'block';
}

// 正規表現テストツールを隠す
function hideRegexTestTool() {
  regexTestTool.style.display = 'none';
  
  // 元の編集フォームを表示
  entryEditForm.style.display = 'block';
}

// 正規表現テストの実行
function performRegexTest() {
  const pattern = regexPattern.value;
  const replacement = regexReplacement.value;
  const testInput = regexTestInput.value;
  
  if (!pattern || !testInput) {
    regexTestResult.innerHTML = '<span class="no-match">パターンまたはテスト文字列が入力されていません</span>';
    return;
  }
  
  try {
    // 正規表現オブジェクトを作成
    const regex = new RegExp(pattern, 'g');
    
    // マッチするか確認
    const matches = testInput.match(regex);
    
    if (!matches) {
      regexTestResult.innerHTML = '<span class="no-match">マッチするテキストがありませんでした</span>';
      return;
    }
    
    // 置換結果
    const replacedText = testInput.replace(regex, replacement);
    
    // 結果の表示
    let resultHtml = '<span class="successful-match">マッチ成功!</span><br><br>';
    resultHtml += `<strong>マッチした数:</strong> ${matches.length}<br>`;
    resultHtml += `<strong>マッチしたテキスト:</strong> ${matches.join(', ')}<br><br>`;
    resultHtml += `<strong>置換前:</strong> ${testInput}<br>`;
    resultHtml += `<strong>置換後:</strong> ${replacedText}`;
    
    regexTestResult.innerHTML = resultHtml;
    
    // パターンと置換テキストを編集フォームに反映
    entryOriginal.value = pattern;
    entryTranslated.value = replacement;
  } catch (error) {
    regexTestResult.innerHTML = `<span class="no-match">エラー: ${error.message}</span>`;
  }
}

// 翻訳エントリーの保存
function saveEntryForm(event) {
  event.preventDefault();
  
  const entryData = {
    original: entryOriginal.value,
    translated: entryTranslated.value,
    context: entryContext.value || undefined,
    regex: entryRegex.checked || undefined
  };
  
  // 空値のプロパティを削除
  Object.keys(entryData).forEach(key => {
    if (entryData[key] === undefined) {
      delete entryData[key];
    }
  });
  
  if (editingEntryIndex >= 0) {
    // 既存のエントリーを更新
    currentDomainTranslations[editingEntryIndex] = entryData;
  } else {
    // 新しいエントリーを追加
    currentDomainTranslations.push(entryData);
  }
  
  // リストを更新
  renderEntryList();
  
  // フォームを隠す
  hideEntryForm();
}

// 翻訳エントリーの削除
function deleteEntry(index) {
  if (!confirm('このエントリーを削除してもよろしいですか？')) {
    return;
  }
  
  currentDomainTranslations.splice(index, 1);
  renderEntryList();
}

// 全ての翻訳エントリーを保存
async function saveAllEntries() {
  try {
    const { settings } = await chrome.storage.local.get('settings');
    const domain = settings.domains[currentDomainIndex];
    
    if (!domain || !domain.repository) {
      throw new Error('ドメイン設定が不正です。');
    }
    
    // 元のYAMLをロード
    const originalYaml = jsyaml.load(currentTranslationYaml);
    
    // 翻訳エントリーだけを更新
    originalYaml.translations = currentDomainTranslations;
    
    // 更新したYAMLを生成
    const updatedYaml = jsyaml.dump(originalYaml);
    
    // ここで、GitHubリポジトリに保存する処理が必要ですが、
    // 拡張機能からは直接GitHubリポジトリへの書き込みはできないため、
    // ローカルにダウンロードしてユーザーに手動で更新してもらう
    
    const blob = new Blob([updatedYaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const filename = domain.repository.split('/').pop();
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'translation-config.yml';
    a.click();
    
    // クリーンアップ
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
    
    alert('翻訳ファイルをダウンロードしました。このファイルをGitHubリポジトリに手動でアップロードしてください。');
    
    // モーダルを閉じる
    closeEntryModal();
  } catch (error) {
    console.error('翻訳エントリーの保存に失敗しました:', error);
    alert('エラー: 翻訳エントリーの保存に失敗しました。' + error.message);
  }
}

// 翻訳エントリーモーダルを閉じる
function closeEntryModal() {
  entryModal.style.display = 'none';
  // 状態をリセット
  currentDomainTranslations = [];
  currentDomainIndex = -1;
  editingEntryIndex = -1;
}
