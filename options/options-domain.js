// options-domain.js - ドメイン管理

// DOM要素
const addDomainBtn = document.getElementById('add-domain-btn');
const domainModal = document.getElementById('domain-modal');
const modalTitle = document.getElementById('modal-title');
const domainForm = document.getElementById('domain-form');
const domainInput = document.getElementById('domain-input');
const nameInput = document.getElementById('name-input');
const repositoryInput = document.getElementById('repository-input');
const contextMappingInput = document.getElementById('context-mapping-input');
const descriptionInput = document.getElementById('description-input');
const domainEnabled = document.getElementById('domain-enabled');
const cancelBtn = document.getElementById('cancel-btn');
const closeBtn = document.querySelector('.close');

// 編集中のドメインのインデックス
let editingIndex = -1;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  // ドメイン管理イベントリスナー
  addDomainBtn.addEventListener('click', showAddDomainModal);
  domainForm.addEventListener('submit', saveDomainSettings);
  cancelBtn.addEventListener('click', closeDomainModal);
  closeBtn.addEventListener('click', closeDomainModal);
  
  // モーダルの外側をクリックしたときに閉じる
  window.addEventListener('click', event => {
    if (event.target === domainModal) {
      closeDomainModal();
    }
  });
});

// ドメインリストの表示
function renderDomainList(domains) {
  const domainList = document.getElementById('domain-list');
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
    
    // 翻訳管理ボタンを追加 - 全画面版へのリンク
    const manageEntriesBtn = document.createElement('button');
    manageEntriesBtn.className = 'btn secondary icon';
    manageEntriesBtn.textContent = '翻訳管理';
    manageEntriesBtn.addEventListener('click', () => openEntryManager(index));
    
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
    if (contextMappingInput) {
      contextMappingInput.value = domain.contextMapping || '';
    }
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
      contextMapping: contextMappingInput ? contextMappingInput.value : undefined,
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

// 翻訳エントリー管理ページを開く
function openEntryManager(index) {
  // 全画面版の翻訳エントリー管理ページに移動
  window.open(`entry-manager.html?domain=${index}`, '_blank');
}
