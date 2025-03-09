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

// 編集中のドメインのインデックス
let editingIndex = -1;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  // 設定を読み込む
  loadSettings();
  
  // イベントリスナーの設定
  translationActive.addEventListener('change', toggleTranslation);
  addDomainBtn.addEventListener('click', showAddDomainModal);
  domainForm.addEventListener('submit', saveDomainSettings);
  cancelBtn.addEventListener('click', closeDomainModal);
  closeBtn.addEventListener('click', closeDomainModal);
  exportBtn.addEventListener('click', exportSettings);
  importBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', importSettings);
  
  // モーダルの外側をクリックしたときに閉じる
  window.addEventListener('click', event => {
    if (event.target === domainModal) {
      closeDomainModal();
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
    
    const editBtn = document.createElement('button');
    editBtn.className = 'btn secondary icon';
    editBtn.textContent = '編集';
    editBtn.addEventListener('click', () => showEditDomainModal(index));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn danger icon';
    deleteBtn.textContent = '削除';
    deleteBtn.addEventListener('click', () => deleteDomain(index));
    
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
