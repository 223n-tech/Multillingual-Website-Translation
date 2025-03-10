import * as jsyaml from 'js-yaml';
import { uiDebugLog } from '../../utils/debug';
import { AppSettings, DomainSettings } from '../../types/settings';
import { TranslationData, TranslationEntry } from '../../types/translation';
import { EntryListManager } from './entry-list-manager';
import { EntryFormManager } from './entry-form-manager';
import { RegexTestManager } from './regex-test-manager';
import { EntryDetailManager } from './entry-detail-manager';

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
          type: 'getTranslationYaml',
          domain: this.currentDomainSettings?.domain,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(`翻訳データの取得に失敗: ${chrome.runtime.lastError.message}`));
            return;
          }

          if (!response || !response.yaml) {
            reject(new Error('翻訳データが見つかりません'));
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
  private handleSaveEntries(): void {
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

      // バックグラウンドスクリプトに保存リクエストを送信
      chrome.runtime.sendMessage(
        {
          type: 'saveTranslationData',
          domain: this.currentDomainSettings.domain,
          yaml: yamlData,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            alert(`保存に失敗しました: ${chrome.runtime.lastError.message}`);
            return;
          }

          if (response && response.success) {
            alert('翻訳エントリーを保存しました');
            this.currentTranslationYaml = yamlData;
          } else {
            alert(
              `保存に失敗しました: ${response && response.error ? response.error : '不明なエラー'}`,
            );
          }
        },
      );
    } catch (error) {
      alert(`YAMLの生成に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
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
