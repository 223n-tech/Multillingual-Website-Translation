// entry-manager-core.js - 翻訳エントリー管理の中核機能

// グローバル変数
let currentDomainTranslations = []; // 現在の翻訳エントリー
let originalTranslationData = null; // 元のデータ（比較用）
let currentDomainData = null;       // 現在のドメイン設定
let currentTranslationYaml = null;  // 元のYAML文字列
let selectedEntryIndex = -1;        // 選択中のエントリーインデックス
let editingEntryIndex = -1;         // 編集中のエントリーインデックス
let hasUnsavedChanges = false;      // 未保存の変更があるフラグ

// 検索・フィルタリング用
let filterContext = 'all';
let searchTerm = '';

// ドメインデータの読み込み
async function loadDomainData(domainId) {
  try {
    const { settings } = await chrome.storage.local.get('settings');
    
    if (!settings || !settings.domains || domainId >= settings.domains.length) {
      showError('ドメイン設定が見つかりません');
      return false;
    }
    
    const domain = settings.domains[domainId];
    currentDomainData = domain;
    
    // ドメイン情報の表示
    document.getElementById('domain-name').textContent = domain.name;
    document.getElementById('domain-details').textContent = `${domain.domain} - ${domain.description || '説明なし'}`;
    
    // 翻訳ファイルを取得
    const response = await fetch(domain.repository);
    
    if (!response.ok) {
      throw new Error(`翻訳ファイルの取得に失敗しました: ${response.status} ${response.statusText}`);
    }
    
    const yamlContent = await response.text();
    // 元のYAMLを保存
    currentTranslationYaml = yamlContent;
    
    const translationData = jsyaml.load(yamlContent);
    originalTranslationData = { ...translationData };
    
    if (!translationData || !translationData.translations) {
      throw new Error('無効な翻訳ファイル形式です');
    }
    
    // 最終更新日の表示更新
    if (translationData.last_updated) {
      document.getElementById('domain-details').textContent = `${domain.domain} - 最終更新: ${translationData.last_updated}`;
    }
    
    // 翻訳エントリーを保存
    currentDomainTranslations = translationData.translations;
    
    return true;
    
  } catch (error) {
    showError(`翻訳データの読み込みに失敗しました: ${error.message}`);
    return false;
  }
}

// 統計情報の更新
function updateStatistics() {
  document.getElementById('total-entries').textContent = currentDomainTranslations.length;
  
  // コンテキスト数をカウント
  const contexts = new Set();
  let regexCount = 0;
  
  currentDomainTranslations.forEach(entry => {
    if (entry.context) {
      contexts.add(entry.context);
    }
    if (entry.regex) {
      regexCount++;
    }
  });
  
  document.getElementById('total-contexts').textContent = contexts.size;
  document.getElementById('regex-entries').textContent = regexCount;
  
  // 表示件数の更新
  updateEntryCountDisplay();
}

// フィルタリング・検索に基づいてエントリーをフィルタリング
function getFilteredEntries() {
  return currentDomainTranslations.filter(entry => {
    // コンテキストフィルター
    if (filterContext !== 'all' && entry.context !== filterContext) {
      return false;
    }
    
    // 検索テキスト
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        (entry.original && entry.original.toLowerCase().includes(searchLower)) ||
        (entry.translated && entry.translated.toLowerCase().includes(searchLower)) ||
        (entry.context && entry.context.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });
}

// エントリーの追加または更新
function saveEntry(entryData) {
  // エントリーの検証
  if (!entryData.original || !entryData.translated) {
    showError('元のテキストと翻訳後テキストは必須です');
    return false;
  }
  
  // 空値のプロパティを削除
  Object.keys(entryData).forEach(key => {
    if (entryData[key] === undefined || entryData[key] === '') {
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
  
  // 変更フラグを設定
  hasUnsavedChanges = true;
  
  return true;
}

// エントリーの削除
function deleteSelectedEntry() {
  if (selectedEntryIndex < 0 || selectedEntryIndex >= currentDomainTranslations.length) {
    return false;
  }
  
  if (!confirm('このエントリーを削除してもよろしいですか？')) {
    return false;
  }
  
  // エントリーを削除
  currentDomainTranslations.splice(selectedEntryIndex, 1);
  
  // 変更フラグを設定
  hasUnsavedChanges = true;
  
  // 選択をリセット
  selectedEntryIndex = -1;
  
  return true;
}

// 翻訳ファイルの保存
async function saveTranslationFile() {
  try {
    if (!currentDomainData || !originalTranslationData) {
      throw new Error('保存するデータがありません');
    }
    
    // 元のYAMLをロード
    const originalYaml = jsyaml.load(currentTranslationYaml);
    
    // 翻訳エントリーだけを更新
    originalYaml.translations = currentDomainTranslations;
    
    // 最終更新日を更新
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD形式
    originalYaml.last_updated = dateString;
    
    // 更新したYAMLを生成
    const updatedYaml = jsyaml.dump(originalYaml);
    
    // ローカルにダウンロード
    const blob = new Blob([updatedYaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const filename = currentDomainData.repository.split('/').pop() || 'translation-config.yml';
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    // クリーンアップ
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
    
    // 変更フラグをリセット
    hasUnsavedChanges = false;
    
    // 保存成功メッセージ
    alert('翻訳ファイルをダウンロードしました。このファイルをGitHubリポジトリに手動でアップロードしてください。');
    
    return true;
  } catch (error) {
    showError(`翻訳ファイルの保存に失敗しました: ${error.message}`);
    return false;
  }
}

// 正規表現テストの実行
function performRegexTest(pattern, replacement, testInput) {
  if (!pattern || !testInput) {
    return {
      success: false,
      message: 'パターンまたはテスト文字列が入力されていません'
    };
  }
  
  try {
    // 正規表現オブジェクトを作成
    const regex = new RegExp(pattern, 'g');
    
    // マッチするか確認
    const matches = testInput.match(regex);
    
    if (!matches) {
      return {
        success: false,
        message: 'マッチするテキストがありませんでした'
      };
    }
    
    // 置換結果
    const replacedText = testInput.replace(regex, replacement);
    
    // 結果の表示用オブジェクト
    return {
      success: true,
      matches: matches,
      matchCount: matches.length,
      original: testInput,
      replaced: replacedText
    };
  } catch (error) {
    return {
      success: false,
      message: `エラー: ${error.message}`
    };
  }
}

// エラーメッセージの表示
function showError(message) {
  alert(message);
  console.error(message);
}

// 表示件数表示の更新
function updateEntryCountDisplay() {
  const totalCount = currentDomainTranslations.length;
  const filteredCount = getFilteredEntries().length;
  
  document.getElementById('entry-count-display').textContent = 
    `${filteredCount} 件表示中 / 合計 ${totalCount} 件`;
}

// ページを離れる前の確認
window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges) {
    e.preventDefault();
    e.returnValue = '変更が保存されていません。このページを離れますか？';
    return e.returnValue;
  }
});
