// ポップアップのJavaScript

// DOM要素
const translationToggle = document.getElementById('translation-toggle');
const statusText = document.getElementById('status-text');
const currentDomainContainer = document.getElementById('current-domain-container');
const domainName = document.getElementById('domain-name');
const translationAvailable = document.getElementById('translation-available');
const refreshBtn = document.getElementById('refresh-btn');
const optionsBtn = document.getElementById('options-btn');
const githubLink = document.getElementById('github-link');

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  // 現在の設定を読み込む
  const { settings } = await chrome.storage.local.get('settings');
  
  // トグルスイッチの状態を設定
  translationToggle.checked = settings.active;
  updateStatusText(settings.active);
  
  // 現在のタブ情報を取得
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentTab = tabs[0];
  
  if (currentTab && currentTab.url) {
    const url = new URL(currentTab.url);
    const domain = url.hostname;
    
    // ドメイン名を表示
    domainName.textContent = domain;
    
    // このドメインの翻訳が利用可能かチェック
    const domainSetting = settings.domains.find(d => d.domain === domain);
    
    if (domainSetting) {
      translationAvailable.classList.remove('hidden');
      // GitHubリンクを設定
      githubLink.href = getGithubRepoUrl(domainSetting.repository);
    } else {
      translationAvailable.classList.add('hidden');
    }
  }
  
  // イベントリスナーの設定
  translationToggle.addEventListener('change', toggleTranslation);
  refreshBtn.addEventListener('click', refreshTranslation);
  optionsBtn.addEventListener('click', openOptions);
});

// 翻訳の有効/無効を切り替え
async function toggleTranslation() {
  const active = translationToggle.checked;
  
  // 状態テキストを更新
  updateStatusText(active);
  
  // バックグラウンドスクリプトに通知
  chrome.runtime.sendMessage(
    { action: 'toggleTranslation', active },
    response => {
      if (response && response.success) {
        // 現在のタブに反映
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: active ? 'startTranslation' : 'stopTranslation'
            });
          }
        });
      } else {
        console.error('翻訳状態の変更に失敗しました:', response ? response.error : '不明なエラー');
        // エラーが発生した場合は元の状態に戻す
        translationToggle.checked = !active;
        updateStatusText(!active);
      }
    }
  );
}

// 翻訳を再適用
function refreshTranslation() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'startTranslation' });
    }
  });
}

// 設定ページを開く
function openOptions() {
  chrome.runtime.openOptionsPage();
}

// 状態テキストを更新
function updateStatusText(active) {
  statusText.textContent = active ? '有効' : '無効';
  statusText.className = 'status-text ' + (active ? 'active' : 'inactive');
}

// GitHubリポジトリURLからリポジトリ情報を取得
function getGithubRepoUrl(rawUrl) {
  try {
    // 例: https://raw.githubusercontent.com/username/translations/main/github-translations.yml
    // から https://github.com/username/translations を抽出
    const url = new URL(rawUrl);
    const pathParts = url.pathname.split('/');
    
    if (url.hostname === 'raw.githubusercontent.com' && pathParts.length >= 4) {
      const username = pathParts[1];
      const repoName = pathParts[2];
      return `https://github.com/${username}/${repoName}`;
    }
    
    return '#';
  } catch (error) {
    console.error('GitHubリポジトリURLの解析に失敗しました:', error);
    return '#';
  }
}
