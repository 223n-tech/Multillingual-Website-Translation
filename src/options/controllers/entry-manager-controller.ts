import * as jsyaml from 'js-yaml';
import { uiDebugLog } from '../../utils/debug';
import { AppSettings, DomainSettings } from '../../types/settings';
import { TranslationData, TranslationEntry } from '../../types/translation';
import { EntryListManager } from './entry-list-manager';
import { EntryFormManager } from './entry-form-manager';
import { RegexTestManager } from './regex-test-manager';
import { EntryDetailManager } from './entry-detail-manager';
import {
  parseGitHubRepoUrl,
  buildGitHubApiUrl,
  getGitHubFileSha,
  updateGitHubFile,
  getWebUrlFromRawUrl,
  GitHubRepoInfo,
} from '../../utils/github-utils';

/**
 * 保存オプション
 */
export interface SaveOptions {
  type: 'download' | 'github';
  commitMessage: string;
}

/**
 * 独立したエントリー管理ページ用のコントローラー
 */
export class EntryManagerController {
  // 現在のドメイン情報と翻訳データ
  private domainIndex: number;
  private currentSettings: AppSettings | null = null;
  private currentDomainSettings: DomainSettings | null = null;
  private currentTranslationData: TranslationData | null = null;
  private currentTranslationYaml: string | null = null;
  private editingEntryIndex: number = -1;

  // DOM要素
  private pageTitle!: HTMLHeadingElement;
  private currentDomain!: HTMLSpanElement;
  private entryCount!: HTMLSpanElement;
  private filteredCount!: HTMLSpanElement;
  private entryList!: HTMLDivElement;
  private searchInput!: HTMLInputElement;
  private contextFilter!: HTMLSelectElement;
  private regexFilter!: HTMLInputElement;
  private addEntryBtn!: HTMLButtonElement;
  private testRegexBtn!: HTMLButtonElement;
  private saveEntriesBtn!: HTMLButtonElement;
  private backBtn!: HTMLButtonElement;

  // エントリー編集フォーム要素
  private entryEditForm!: HTMLDivElement;
  private entryFormTitle!: HTMLHeadingElement;
  private translationEntryForm!: HTMLFormElement;
  private entryOriginal!: HTMLInputElement;
  private entryTranslated!: HTMLInputElement;
  private entryContext!: HTMLInputElement;
  private entryRegex!: HTMLInputElement;
  private entryCancelBtn!: HTMLButtonElement;

  // 正規表現テストツール要素
  private regexTestTool!: HTMLDivElement;
  private regexPattern!: HTMLInputElement;
  private regexReplacement!: HTMLInputElement;
  private regexTestInput!: HTMLTextAreaElement;
  private runRegexTest!: HTMLButtonElement;
  private applyRegexTest!: HTMLButtonElement;
  private regexTestCancel!: HTMLButtonElement;
  private regexTestResult!: HTMLDivElement;

  // エントリー詳細表示要素
  private entryDetail!: HTMLDivElement;
  private detailOriginal!: HTMLDivElement;
  private detailTranslated!: HTMLDivElement;
  private detailContext!: HTMLDivElement;
  private detailRegex!: HTMLDivElement;
  private detailEditBtn!: HTMLButtonElement;
  private detailDeleteBtn!: HTMLButtonElement;

  // 初期メッセージ
  private initialMessage!: HTMLDivElement;

  // 利用可能なコンテキスト一覧
  private availableContexts: Set<string> = new Set<string>();

  // マネージャークラス
  private listManager!: EntryListManager;
  private formManager!: EntryFormManager;
  private regexTestManager!: RegexTestManager;
  private detailManager!: EntryDetailManager;

  constructor(domainIndex: number) {
    this.domainIndex = domainIndex;
  }

  /**
   * 初期化処理
   */
  public async initialize(): Promise<void> {
    try {
      uiDebugLog('エントリーマネージャー初期化開始', { domainIndex: this.domainIndex });

      // DOM要素の取得
      this.initializeElements();

      // サブマネージャーの初期化
      this.initializeManagers();

      // イベントリスナーの設定
      this.initializeEventListeners();

      // 設定を読み込む
      await this.loadSettings();

      // 翻訳データを読み込む
      await this.loadTranslationData();

      // 利用可能なコンテキストを取得
      this.extractAvailableContexts();

      // コンテキストフィルターを設定
      this.setupContextFilter();

      // 翻訳エントリーリストを表示
      this.renderEntryList();

      // 初期状態を表示
      this.showInitialState();

      uiDebugLog('エントリーマネージャー初期化完了', {
        domainSettings: this.currentDomainSettings,
        entriesCount: this.currentTranslationData?.translations.length || 0,
      });
    } catch (error) {
      console.error('エントリーマネージャーの初期化に失敗:', error);
      throw error;
    }
  }

  /**
   * DOM要素の取得
   */
  private initializeElements(): void {
    // 基本情報要素
    this.pageTitle = document.getElementById('page-title') as HTMLHeadingElement;
    this.currentDomain = document.getElementById('current-domain') as HTMLSpanElement;
    this.entryCount = document.getElementById('entry-count') as HTMLSpanElement;
    this.filteredCount = document.getElementById('filtered-count') as HTMLSpanElement;

    // リストと検索
    this.entryList = document.getElementById('entry-list') as HTMLDivElement;
    this.searchInput = document.getElementById('search-input') as HTMLInputElement;
    this.contextFilter = document.getElementById('context-filter') as HTMLSelectElement;
    this.regexFilter = document.getElementById('regex-filter') as HTMLInputElement;

    // アクションボタン
    this.addEntryBtn = document.getElementById('add-entry-btn') as HTMLButtonElement;
    this.testRegexBtn = document.getElementById('test-regex-btn') as HTMLButtonElement;
    this.saveEntriesBtn = document.getElementById('save-entries-btn') as HTMLButtonElement;
    this.backBtn = document.getElementById('back-btn') as HTMLButtonElement;

    // エントリー編集フォーム
    this.entryEditForm = document.getElementById('entry-edit-form') as HTMLDivElement;
    this.entryFormTitle = document.getElementById('entry-form-title') as HTMLHeadingElement;
    this.translationEntryForm = document.getElementById(
      'translation-entry-form',
    ) as HTMLFormElement;
    this.entryOriginal = document.getElementById('entry-original') as HTMLInputElement;
    this.entryTranslated = document.getElementById('entry-translated') as HTMLInputElement;
    this.entryContext = document.getElementById('entry-context') as HTMLInputElement;
    this.entryRegex = document.getElementById('entry-regex') as HTMLInputElement;
    this.entryCancelBtn = document.getElementById('entry-cancel-btn') as HTMLButtonElement;

    // 正規表現テストツール
    this.regexTestTool = document.getElementById('regex-test-tool') as HTMLDivElement;
    this.regexPattern = document.getElementById('regex-pattern') as HTMLInputElement;
    this.regexReplacement = document.getElementById('regex-replacement') as HTMLInputElement;
    this.regexTestInput = document.getElementById('regex-test-input') as HTMLTextAreaElement;
    this.runRegexTest = document.getElementById('run-regex-test') as HTMLButtonElement;
    this.applyRegexTest = document.getElementById('apply-regex-test') as HTMLButtonElement;
    this.regexTestCancel = document.getElementById('regex-test-cancel') as HTMLButtonElement;
    this.regexTestResult = document.getElementById('regex-test-result') as HTMLDivElement;

    // エントリー詳細表示
    this.entryDetail = document.getElementById('entry-detail') as HTMLDivElement;
    this.detailOriginal = document.getElementById('detail-original') as HTMLDivElement;
    this.detailTranslated = document.getElementById('detail-translated') as HTMLDivElement;
    this.detailContext = document.getElementById('detail-context') as HTMLDivElement;
    this.detailRegex = document.getElementById('detail-regex') as HTMLDivElement;
    this.detailEditBtn = document.getElementById('detail-edit-btn') as HTMLButtonElement;
    this.detailDeleteBtn = document.getElementById('detail-delete-btn') as HTMLButtonElement;

    // 初期メッセージ
    this.initialMessage = document.getElementById('initial-message') as HTMLDivElement;

    // DOM要素が正しく取得できているか確認
    this.validateElements();
  }

  /**
   * サブマネージャーの初期化
   */
  private initializeManagers(): void {
    this.listManager = new EntryListManager(this);
    this.formManager = new EntryFormManager(this);
    this.regexTestManager = new RegexTestManager(this);
    this.detailManager = new EntryDetailManager(this);
  }

  /**
   * DOM要素が正しく取得できているか確認
   */
  private validateElements(): void {
    const requiredElements = [
      { name: 'entryList', element: this.entryList },
      { name: 'addEntryBtn', element: this.addEntryBtn },
      { name: 'searchInput', element: this.searchInput },
      { name: 'contextFilter', element: this.contextFilter },
      { name: 'saveEntriesBtn', element: this.saveEntriesBtn },
      { name: 'backBtn', element: this.backBtn },
      { name: 'entryEditForm', element: this.entryEditForm },
      { name: 'regexTestTool', element: this.regexTestTool },
      { name: 'entryDetail', element: this.entryDetail },
      { name: 'initialMessage', element: this.initialMessage },
    ];

    for (const item of requiredElements) {
      if (!item.element) {
        throw new Error(`必要なDOM要素「${item.name}」が見つかりません`);
      }
    }
  }

  /**
   * イベントリスナーの設定
   */
  private initializeEventListeners(): void {
    // 検索・フィルター関連
    this.searchInput.addEventListener('input', this.handleSearch.bind(this));
    this.contextFilter.addEventListener('change', this.handleContextFilter.bind(this));
    this.regexFilter.addEventListener('change', this.handleRegexFilter.bind(this));

    // アクションボタン
    this.addEntryBtn.addEventListener('click', this.handleAddEntry.bind(this));
    this.testRegexBtn.addEventListener('click', this.handleOpenRegexTest.bind(this));
    this.saveEntriesBtn.addEventListener('click', this.handleSaveEntries.bind(this));
    this.backBtn.addEventListener('click', this.handleBack.bind(this));

    // エントリー編集フォーム
    this.translationEntryForm.addEventListener('submit', this.handleEntryFormSubmit.bind(this));
    this.entryCancelBtn.addEventListener('click', this.handleEntryFormCancel.bind(this));

    // 詳細表示
    this.detailEditBtn.addEventListener('click', this.handleDetailEdit.bind(this));
    this.detailDeleteBtn.addEventListener('click', this.handleDetailDelete.bind(this));

    // 正規表現テスト
    this.runRegexTest.addEventListener('click', this.handleRunRegexTest.bind(this));
    this.applyRegexTest.addEventListener('click', this.handleApplyRegexTest.bind(this));
    this.regexTestCancel.addEventListener('click', this.handleRegexTestCancel.bind(this));
  }

  /**
   * 設定の読み込み
   */
  private async loadSettings(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      chrome.storage.local.get('settings', (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`設定の読み込みに失敗: ${chrome.runtime.lastError.message}`));
          return;
        }

        const settings = result.settings as AppSettings;
        if (!settings) {
          reject(new Error('設定が見つかりません'));
          return;
        }

        this.currentSettings = settings;

        // ドメインインデックスが有効か確認
        if (this.domainIndex < 0 || this.domainIndex >= settings.domains.length) {
          reject(new Error(`無効なドメインインデックス: ${this.domainIndex}`));
          return;
        }

        this.currentDomainSettings = settings.domains[this.domainIndex];

        // ページタイトルとドメイン名を設定
        if (this.pageTitle) {
          this.pageTitle.textContent = `翻訳エントリー管理: ${this.currentDomainSettings.name}`;
        }

        if (this.currentDomain) {
          this.currentDomain.textContent = this.currentDomainSettings.domain;
        }

        uiDebugLog('設定を読み込みました', {
          domain: this.currentDomainSettings?.domain,
          repository: this.currentDomainSettings.repository,
        });

        resolve();
      });
    });
  }

  /**
   * 翻訳データの読み込み
   */
  private async loadTranslationData(): Promise<void> {
    if (!this.currentDomainSettings) {
      throw new Error('ドメイン設定が読み込まれていません');
    }

    return new Promise<void>((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'getTranslationYaml',
          domain: this.currentDomainSettings?.domain,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('翻訳データ取得エラー:', chrome.runtime.lastError);
            reject(new Error(`翻訳データの取得に失敗: ${chrome.runtime.lastError.message}`));
            return;
          }

          if (!response || !response.success) {
            console.error('翻訳データ取得失敗:', response?.error || '不明なエラー');
            reject(new Error(response?.error || '翻訳データが見つかりません'));
            return;
          }

          try {
            this.currentTranslationYaml = response.yaml;
            this.currentTranslationData = jsyaml.load(response.yaml) as TranslationData;

            if (!this.currentTranslationData || !this.currentTranslationData.translations) {
              throw new Error('翻訳データの形式が正しくありません');
            }

            // エントリー数を表示
            this.updateEntryCount(this.currentTranslationData.translations.length);

            uiDebugLog('翻訳データを読み込みました', {
              entriesCount: this.currentTranslationData.translations.length,
              site: this.currentTranslationData.site,
              language: this.currentTranslationData.language,
            });

            resolve();
          } catch (error) {
            reject(
              new Error(
                `YAMLのパースに失敗: ${error instanceof Error ? error.message : String(error)}`,
              ),
            );
          }
        },
      );
    });
  }

  /**
   * 利用可能なコンテキストを抽出
   */
  private extractAvailableContexts(): void {
    if (!this.currentTranslationData || !this.currentTranslationData.translations) {
      return;
    }

    this.availableContexts.clear();
    this.availableContexts.add(''); // 空のコンテキスト用

    for (const entry of this.currentTranslationData.translations) {
      if (entry.context) {
        this.availableContexts.add(entry.context);
      }
    }

    uiDebugLog('利用可能なコンテキスト', { contexts: Array.from(this.availableContexts) });
  }

  /**
   * コンテキストフィルターの設定
   */
  private setupContextFilter(): void {
    // 既存のオプションをクリア
    this.contextFilter.innerHTML = '';

    // すべてのオプションを追加
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'すべてのコンテキスト';
    this.contextFilter.appendChild(allOption);

    // 空のコンテキストオプション
    const emptyOption = document.createElement('option');
    emptyOption.value = '__empty__';
    emptyOption.textContent = '空のコンテキスト';
    this.contextFilter.appendChild(emptyOption);

    // 各コンテキストのオプションを追加（空以外）
    const sortedContexts = Array.from(this.availableContexts)
      .filter((context) => context !== '')
      .sort();

    for (const context of sortedContexts) {
      const option = document.createElement('option');
      option.value = context;
      option.textContent = context;
      this.contextFilter.appendChild(option);
    }
  }

  /**
   * エントリーリストの表示
   */
  public renderEntryList(): void {
    if (this.listManager) {
      this.listManager.renderEntryList();
    }
  }

  /**
   * エントリー数の更新
   */
  private updateEntryCount(filteredCount: number): void {
    const totalCount = this.currentTranslationData?.translations.length || 0;

    if (this.entryCount) {
      this.entryCount.textContent = totalCount.toString();
    }

    if (this.filteredCount) {
      this.filteredCount.textContent = filteredCount.toString();
    }
  }

  /**
   * 検索処理
   */
  private handleSearch(): void {
    this.renderEntryList();
  }

  /**
   * コンテキストフィルター処理
   */
  private handleContextFilter(): void {
    this.renderEntryList();
  }

  /**
   * 正規表現フィルター処理
   */
  private handleRegexFilter(): void {
    this.renderEntryList();
  }

  /**
   * 新規エントリー追加処理
   */
  private handleAddEntry(): void {
    if (this.formManager) {
      this.formManager.showEntryForm(-1);
    }
  }

  /**
   * 正規表現テストツールを開く
   */
  private handleOpenRegexTest(): void {
    if (this.regexTestManager) {
      this.regexTestManager.showRegexTestTool();
    }
  }

  /**
   * エントリーフォーム送信処理
   */
  private handleEntryFormSubmit(e: Event): void {
    e.preventDefault();
    if (this.formManager) {
      this.formManager.submitEntryForm();
    }
  }

  /**
   * エントリーフォームキャンセル処理
   */
  private handleEntryFormCancel(): void {
    if (this.formManager) {
      this.formManager.hideEntryForm();
    }
  }

  /**
   * 詳細から編集処理
   */
  private handleDetailEdit(): void {
    if (!this.detailManager || !this.formManager) return;

    const index = this.detailManager.getCurrentEntryIndex();
    if (index >= 0) {
      this.formManager.showEntryForm(index);
    }
  }

  /**
   * 詳細から削除処理
   */
  private handleDetailDelete(): void {
    if (this.detailManager) {
      this.detailManager.deleteCurrentEntry();
    }
  }

  /**
   * 正規表現テスト実行
   */
  private handleRunRegexTest(): void {
    if (this.regexTestManager) {
      this.regexTestManager.runRegexTest();
    }
  }

  /**
   * 正規表現テスト結果の適用
   */
  private handleApplyRegexTest(): void {
    if (this.regexTestManager) {
      this.regexTestManager.applyRegexTest();
    }
  }

  /**
   * 正規表現テストのキャンセル
   */
  private handleRegexTestCancel(): void {
    if (this.regexTestManager) {
      this.regexTestManager.hideRegexTestTool();
    }
  }

  /**
   * エントリーの保存処理
   */
  private async handleSaveEntries(): Promise<void> {
    if (!this.currentTranslationData || !this.currentDomainSettings) {
      alert('保存するデータがありません');
      return;
    }

    try {
      // 翻訳データをYAML形式に変換
      const yamlData = jsyaml.dump(this.currentTranslationData, {
        lineWidth: -1, // 自動改行を無効化
        noRefs: true, // 参照を使用しない
      });

      // 保存オプションを選択するダイアログを表示
      const saveOptions = await this.showSaveOptionsDialog();

      if (!saveOptions) {
        // キャンセルの場合
        return;
      }

      // オプションに応じた処理を実行
      if (saveOptions.type === 'download') {
        // ダウンロード用ファイル名を設定
        const fileName = this.getSaveFileName();

        // YAMLファイルをダウンロード
        this.downloadYamlFile(yamlData, fileName);

        alert(
          '翻訳ファイルをダウンロードしました。このファイルをGitHubリポジトリに手動でアップロードしてください。',
        );
      } else if (saveOptions.type === 'github') {
        // GitHubリポジトリに直接保存
        const success = await this.saveToGitHub(yamlData, saveOptions.commitMessage);

        if (success) {
          alert('翻訳データをGitHubリポジトリに保存しました。');
          // 保存後に現在のYAMLデータを更新
          this.currentTranslationYaml = yamlData;
        } else {
          alert('GitHubリポジトリへの保存に失敗しました。');
        }
      }
    } catch (error) {
      console.error('翻訳エントリーの保存に失敗しました:', error);
      uiDebugLog('翻訳エントリー保存エラー', error);
      alert(
        `翻訳エントリーの保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 保存オプションの選択ダイアログを表示
   */
  private showSaveOptionsDialog(): Promise<SaveOptions | null> {
    return new Promise((resolve) => {
      // ダイアログを作成
      const dialogHTML = `
    <div class="save-dialog-overlay">
      <div class="save-dialog">
        <h3>保存方法を選択</h3>
        <div class="save-options">
          <div class="save-option">
            <input type="radio" name="save-type" id="save-download" value="download" checked>
            <label for="save-download">YAMLファイルとしてダウンロード</label>
            <p class="option-description">翻訳データをYAMLファイルとしてダウンロードします。その後、GitHubリポジトリに手動でアップロードする必要があります。</p>
          </div>
          <div class="save-option">
            <input type="radio" name="save-type" id="save-github" value="github">
            <label for="save-github">GitHubリポジトリに直接保存 (ベータ機能)</label>
            <p class="option-description">翻訳データをGitHubリポジトリに直接保存します。この機能はベータ版です。</p>
            <div class="github-options" style="display: none;">
              <div class="form-group">
                <label for="commit-message">コミットメッセージ:</label>
                <input type="text" id="commit-message" value="翻訳エントリーの更新">
              </div>
            </div>
          </div>
        </div>
        <div class="dialog-buttons">
          <button id="save-dialog-confirm" class="btn primary">保存</button>
          <button id="save-dialog-cancel" class="btn">キャンセル</button>
        </div>
      </div>
    </div>
    `;

      // ダイアログのスタイル
      const dialogStyle = document.createElement('style');
      dialogStyle.textContent = `
      .save-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .save-dialog {
        background-color: white;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 24px;
        width: 500px;
        max-width: 90%;
      }
      .save-options {
        margin: 20px 0;
      }
      .save-option {
        margin-bottom: 16px;
        padding: 12px;
        border: 1px solid #e1e4e8;
        border-radius: 6px;
      }
      .save-option input[type="radio"] {
        margin-right: 8px;
      }
      .save-option label {
        font-weight: 600;
      }
      .option-description {
        margin-top: 8px;
        font-size: 14px;
        color: #586069;
      }
      .github-options {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px dashed #e1e4e8;
      }
      .dialog-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 20px;
      }
    `;

      // ダイアログをDOMに追加
      document.body.appendChild(dialogStyle);
      const dialogContainer = document.createElement('div');
      dialogContainer.innerHTML = dialogHTML;
      document.body.appendChild(dialogContainer);

      // イベントリスナーを設定
      const saveGithubRadio = document.getElementById('save-github') as HTMLInputElement;
      const githubOptions = document.querySelector('.github-options') as HTMLDivElement;
      const commitMessageInput = document.getElementById('commit-message') as HTMLInputElement;
      const confirmButton = document.getElementById('save-dialog-confirm') as HTMLButtonElement;
      const cancelButton = document.getElementById('save-dialog-cancel') as HTMLButtonElement;

      // GitHubオプションの表示/非表示
      saveGithubRadio.addEventListener('change', () => {
        githubOptions.style.display = saveGithubRadio.checked ? 'block' : 'none';
      });

      // 保存ボタンのクリックイベント
      confirmButton.addEventListener('click', () => {
        const saveType = (
          document.querySelector('input[name="save-type"]:checked') as HTMLInputElement
        ).value;
        const commitMessage = commitMessageInput.value.trim() || '翻訳エントリーの更新';

        // ダイアログを閉じる
        document.body.removeChild(dialogContainer);
        document.body.removeChild(dialogStyle);

        resolve({
          type: saveType as 'download' | 'github',
          commitMessage: commitMessage,
        });
      });

      // キャンセルボタンのクリックイベント
      cancelButton.addEventListener('click', () => {
        // ダイアログを閉じる
        document.body.removeChild(dialogContainer);
        document.body.removeChild(dialogStyle);
        resolve(null);
      });
    });
  }

  /**
   * 保存用のファイル名を取得
   */
  private getSaveFileName(): string {
    if (!this.currentDomainSettings) {
      return 'translation-config.yml';
    }

    // リポジトリURLからファイル名を抽出
    const urlParts = this.currentDomainSettings.repository.split('/');
    const fileName = urlParts[urlParts.length - 1] || 'translation-config.yml';

    return fileName;
  }

  /**
   * YAMLファイルをダウンロード
   */
  private downloadYamlFile(yamlContent: string, fileName: string): void {
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();

    // クリーンアップ
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * GitHubリポジトリに直接保存（拡張版）
   */
  private async saveToGitHub(yamlContent: string, commitMessage: string): Promise<boolean> {
    try {
      // GitHub APIトークンが必要
      const accessToken = await this.getGitHubAccessToken();
      if (!accessToken) {
        // トークンが取得できない場合はダウンロード処理にフォールバック
        alert(
          'GitHub APIトークンが設定されていないため、GitHubリポジトリに直接保存できません。YAMLファイルをダウンロードします。',
        );
        const fileName = this.getSaveFileName();
        this.downloadYamlFile(yamlContent, fileName);
        return false;
      }

      // 保存中ダイアログを表示
      this.showSavingDialog();

      // リポジトリ情報を解析
      const repoInfo = this.parseRepositoryUrl();
      if (!repoInfo) {
        this.hideSavingDialog();
        alert('有効なGitHubリポジトリURLを指定してください。');
        return false;
      }

      // GitHub APIのURLを構築
      const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contents/${repoInfo.path}`;

      // ファイルの現在のSHAを取得
      let fileSha: string | null = null;
      try {
        const fileInfo = await this.getGitHubFileSha(apiUrl, accessToken);
        fileSha = fileInfo?.sha || null;
      } catch (error) {
        console.warn('既存ファイルのSHA取得に失敗、新規ファイルとして作成します:', error);
      }

      // GitHub APIでファイルを更新
      const success = await this.updateGitHubFile(
        apiUrl,
        yamlContent,
        fileSha,
        commitMessage,
        repoInfo.branch,
        accessToken,
      );

      // 保存中ダイアログを非表示
      this.hideSavingDialog();

      if (success) {
        // 保存成功ダイアログを表示
        this.showSaveSuccessDialog(repoInfo);

        // 保存成功後、現在のYAMLデータを更新
        this.currentTranslationYaml = yamlContent;
        return true;
      } else {
        // 保存失敗ダイアログを表示
        this.showSaveErrorDialog();
        return false;
      }
    } catch (error) {
      // 保存中ダイアログを非表示
      this.hideSavingDialog();

      console.error('GitHubリポジトリへの保存に失敗しました:', error);
      uiDebugLog('GitHubリポジトリ保存エラー', error);

      // エラーダイアログを表示
      this.showSaveErrorDialog();
      return false;
    }
  }

  /**
   * GitHub APIトークンを取得
   * 注: 実際の実装では、セキュアにトークンを管理する必要があります
   */
  private async getGitHubAccessToken(): Promise<string | null> {
    return new Promise((resolve) => {
      // APIトークン入力ダイアログを表示
      const dialogHTML = `
    <div class="token-dialog-overlay">
      <div class="token-dialog">
        <h3>GitHub APIトークン</h3>
        <p>GitHubリポジトリに変更を保存するには、アクセストークンが必要です。</p>
        <p class="note">注: トークンは<strong>repo</strong>スコープを持つ必要があります。<a href="https://github.com/settings/tokens" target="_blank">GitHubでトークンを作成</a></p>
        <div class="form-group">
          <label for="github-token">GitHub APIトークン:</label>
          <input type="password" id="github-token" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx">
        </div>
        <div class="checkbox-group">
          <input type="checkbox" id="remember-token">
          <label for="remember-token">このブラウザでトークンを記憶する (注: 安全なデバイスでのみ使用してください)</label>
        </div>
        <div class="dialog-buttons">
          <button id="token-dialog-confirm" class="btn primary">OK</button>
          <button id="token-dialog-cancel" class="btn">キャンセル</button>
        </div>
      </div>
    </div>
    `;

      // ダイアログをDOMに追加
      const dialogContainer = document.createElement('div');
      dialogContainer.innerHTML = dialogHTML;
      document.body.appendChild(dialogContainer);

      // イベントリスナーを設定
      const tokenInput = document.getElementById('github-token') as HTMLInputElement;
      const rememberCheckbox = document.getElementById('remember-token') as HTMLInputElement;
      const confirmButton = document.getElementById('token-dialog-confirm') as HTMLButtonElement;
      const cancelButton = document.getElementById('token-dialog-cancel') as HTMLButtonElement;

      // 保存済みのトークンがあれば読み込み
      chrome.storage.local.get('githubToken', (result) => {
        if (result.githubToken) {
          tokenInput.value = result.githubToken;
          rememberCheckbox.checked = true;
        }
      });

      // OKボタンのクリックイベント
      confirmButton.addEventListener('click', () => {
        const token = tokenInput.value.trim();
        if (token) {
          // トークンを記憶するかどうか
          if (rememberCheckbox.checked) {
            chrome.storage.local.set({ githubToken: token });
          }

          // ダイアログを閉じる
          document.body.removeChild(dialogContainer);
          resolve(token);
        } else {
          alert('有効なGitHub APIトークンを入力してください。');
        }
      });

      // キャンセルボタンのクリックイベント
      cancelButton.addEventListener('click', () => {
        // ダイアログを閉じる
        document.body.removeChild(dialogContainer);
        resolve(null);
      });
    });
  }

  /**
   * リポジトリURLを解析
   */
  private parseRepositoryUrl(): GitHubRepoInfo | null {
    if (!this.currentDomainSettings || !this.currentDomainSettings.repository) {
      return null;
    }

    // リポジトリURLを解析
    try {
      const url = new URL(this.currentDomainSettings.repository);

      // GitHub Raw URLであるか確認
      if (url.hostname !== 'raw.githubusercontent.com') {
        return null;
      }

      // URLパスを分解 (/username/repo/branch/path/to/file.yml)
      const pathParts = url.pathname.split('/').filter((part) => part.length > 0);

      if (pathParts.length < 4) {
        return null; // 有効なGitHub Raw URLではない
      }

      const owner = pathParts[0];
      const repo = pathParts[1];
      const branch = pathParts[2];

      // ファイル名を取得
      const filename = pathParts[pathParts.length - 1];

      // ファイルパスを構築 (owner/repo/branchを除く)
      const path = pathParts.slice(3).join('/');

      return {
        owner,
        repo,
        branch,
        path,
        filename,
      };
    } catch (error) {
      console.error('GitHubリポジトリURL解析エラー:', error);
      return null;
    }
  }

  /**
   * GitHub APIを使用してファイルのSHAを取得
   */
  private async getGitHubFileSha(
    apiUrl: string,
    accessToken: string,
  ): Promise<{ sha: string } | null> {
    try {
      const response = await fetch(apiUrl, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // ファイルが存在しないのは問題なし
          return null;
        }
        throw new Error(`GitHub API エラー: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return { sha: data.sha };
    } catch (error) {
      console.error('GitHub APIファイル情報取得エラー:', error);
      throw error;
    }
  }

  /**
   * GitHub APIを使用してファイルを更新
   */
  private async updateGitHubFile(
    apiUrl: string,
    content: string,
    sha: string | null,
    message: string,
    branch: string,
    accessToken: string,
  ): Promise<boolean> {
    try {
      // コンテンツをBase64エンコード
      const encodedContent = btoa(unescape(encodeURIComponent(content)));

      // リクエストペイロードを作成
      const payload: Record<string, unknown> = {
        message,
        content: encodedContent,
        branch,
      };

      // 既存ファイルを更新する場合はSHAを指定
      if (sha) {
        payload.sha = sha;
      }

      // GitHub APIリクエスト
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `GitHub API エラー: ${response.status} ${response.statusText} - ${errorData.message}`,
        );
      }

      return true;
    } catch (error) {
      console.error('GitHub APIファイル更新エラー:', error);
      throw error;
    }
  }

  /**
   * 保存成功ダイアログを表示
   */
  private showSaveSuccessDialog(repoInfo: GitHubRepoInfo): void {
    const webUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/${repoInfo.branch}/${repoInfo.path}`;

    const dialogHTML = `
  <div class="save-dialog-overlay">
    <div class="save-dialog">
      <div class="save-result">
        <div class="icon success">✓</div>
        <div class="message">GitHubリポジトリに保存しました</div>
        <div class="description">
          ファイルは正常にGitHubリポジトリに保存されました。
        </div>
        <a href="${webUrl}" target="_blank" class="btn primary">GitHubで確認する</a>
      </div>
      <div class="dialog-buttons">
        <button id="success-close-btn" class="btn">閉じる</button>
      </div>
    </div>
  </div>
  `;

    const dialogContainer = document.createElement('div');
    dialogContainer.innerHTML = dialogHTML;
    document.body.appendChild(dialogContainer);

    // 閉じるボタンのクリックイベント
    const closeButton = document.getElementById('success-close-btn');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        document.body.removeChild(dialogContainer);
      });
    }
  }

  /**
   * 保存エラーダイアログを表示
   */
  private showSaveErrorDialog(): void {
    const dialogHTML = `
  <div class="save-dialog-overlay">
    <div class="save-dialog">
      <div class="save-result">
        <div class="icon error">✗</div>
        <div class="message">GitHubリポジトリへの保存に失敗しました</div>
        <div class="description">
          エラーが発生したため、GitHubリポジトリへの保存に失敗しました。
          代わりにYAMLファイルをダウンロードしますか？
        </div>
      </div>
      <div class="dialog-buttons">
        <button id="download-fallback-btn" class="btn primary">YAMLをダウンロード</button>
        <button id="error-close-btn" class="btn">閉じる</button>
      </div>
    </div>
  </div>
  `;

    const dialogContainer = document.createElement('div');
    dialogContainer.innerHTML = dialogHTML;
    document.body.appendChild(dialogContainer);

    // ダウンロードボタンのクリックイベント
    const downloadButton = document.getElementById('download-fallback-btn');
    if (downloadButton) {
      downloadButton.addEventListener('click', () => {
        document.body.removeChild(dialogContainer);

        if (this.currentTranslationData) {
          const yamlContent = jsyaml.dump(this.currentTranslationData, {
            lineWidth: -1,
            noRefs: true,
          });
          const fileName = this.getSaveFileName();
          this.downloadYamlFile(yamlContent, fileName);
        }
      });
    }

    // 閉じるボタンのクリックイベント
    const closeButton = document.getElementById('error-close-btn');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        document.body.removeChild(dialogContainer);
      });
    }
  }

  /**
   * 保存中ダイアログを表示
   */
  private showSavingDialog(): void {
    const dialogHTML = `
    <div class="saving-dialog-overlay">
      <div class="saving-dialog">
        <div class="spinner"></div>
        <p>GitHubリポジトリに保存中です...</p>
      </div>
    </div>
  `;

    const container = document.createElement('div');
    container.id = 'saving-dialog-container';
    container.innerHTML = dialogHTML;
    document.body.appendChild(container);
  }

  /**
   * 保存中ダイアログを非表示
   */
  private hideSavingDialog(): void {
    const container = document.getElementById('saving-dialog-container');
    if (container) {
      document.body.removeChild(container);
    }
  }

  /**
   * 設定ページに戻る
   */
  private handleBack(): void {
    // 変更があれば確認ダイアログを表示
    if (this.hasUnsavedChanges()) {
      const confirmed = window.confirm('保存されていない変更があります。保存せずに戻りますか？');
      if (!confirmed) {
        return;
      }
    }

    window.location.href = 'options.html';
  }

  /**
   * 保存されていない変更があるかどうか
   */
  private hasUnsavedChanges(): boolean {
    if (!this.currentTranslationData || !this.currentTranslationYaml) {
      return false;
    }

    try {
      const currentYaml = jsyaml.dump(this.currentTranslationData, {
        lineWidth: -1,
        noRefs: true,
      });

      return currentYaml !== this.currentTranslationYaml;
    } catch (error) {
      console.error('変更チェックでエラー:', error);
      return true; // エラーが発生した場合は安全のため変更があるとみなす
    }
  }

  /**
   * 初期状態を表示
   */
  private showInitialState(): void {
    // 編集フォームとテストツールを非表示
    if (this.entryEditForm) {
      this.entryEditForm.style.display = 'none';
    }

    if (this.regexTestTool) {
      this.regexTestTool.style.display = 'none';
    }

    if (this.entryDetail) {
      this.entryDetail.style.display = 'none';
    }

    // 初期メッセージを表示
    if (this.initialMessage) {
      this.initialMessage.style.display = 'block';
    }
  }

  /**
   * 初期メッセージを非表示
   */
  public hideInitialMessage(): void {
    if (this.initialMessage) {
      this.initialMessage.style.display = 'none';
    }
  }

  /**
   * 初期メッセージ要素を取得
   */
  public getInitialMessage(): HTMLDivElement {
    return this.initialMessage;
  }

  // ゲッターメソッド
  public getDomainSettings(): DomainSettings | null {
    return this.currentDomainSettings;
  }

  public getTranslationData(): TranslationData | null {
    return this.currentTranslationData;
  }

  public getSearchInput(): HTMLInputElement {
    return this.searchInput;
  }

  public getContextFilter(): HTMLSelectElement {
    return this.contextFilter;
  }

  public getRegexFilter(): HTMLInputElement {
    return this.regexFilter;
  }

  public getEntryList(): HTMLDivElement {
    return this.entryList;
  }

  public getEntryEditForm(): HTMLDivElement {
    return this.entryEditForm;
  }

  public getEntryFormTitle(): HTMLHeadingElement {
    return this.entryFormTitle;
  }

  public getEntryOriginal(): HTMLInputElement {
    return this.entryOriginal;
  }

  public getEntryTranslated(): HTMLInputElement {
    return this.entryTranslated;
  }

  public getEntryContext(): HTMLInputElement {
    return this.entryContext;
  }

  public getEntryRegex(): HTMLInputElement {
    return this.entryRegex;
  }

  public getRegexTestTool(): HTMLDivElement {
    return this.regexTestTool;
  }

  public getRegexPattern(): HTMLInputElement {
    return this.regexPattern;
  }

  public getRegexReplacement(): HTMLInputElement {
    return this.regexReplacement;
  }

  public getRegexTestInput(): HTMLTextAreaElement {
    return this.regexTestInput;
  }

  public getRegexTestResult(): HTMLDivElement {
    return this.regexTestResult;
  }

  public getEntryDetail(): HTMLDivElement {
    return this.entryDetail;
  }

  public getDetailOriginal(): HTMLDivElement {
    return this.detailOriginal;
  }

  public getDetailTranslated(): HTMLDivElement {
    return this.detailTranslated;
  }

  public getDetailContext(): HTMLDivElement {
    return this.detailContext;
  }

  public getDetailRegex(): HTMLDivElement {
    return this.detailRegex;
  }

  public getAvailableContexts(): Set<string> {
    return this.availableContexts;
  }

  // セッターメソッド
  public setTranslationData(data: TranslationData): void {
    this.currentTranslationData = data;
  }

  public setEditingEntryIndex(index: number): void {
    this.editingEntryIndex = index;
  }

  public getEditingEntryIndex(): number {
    return this.editingEntryIndex;
  }

  public updateEntryCountPublic(filteredCount: number): void {
    this.updateEntryCount(filteredCount);
  }
}
