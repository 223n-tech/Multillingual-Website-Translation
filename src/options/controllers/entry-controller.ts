import * as jsyaml from 'js-yaml';
import { uiDebugLog } from '../../utils/debug';
import { DomainSettings } from '../../types/settings';
import { TranslationData, TranslationEntry } from '../../types/translation';
import { OptionsController } from './options-controller';

/**
 * 翻訳エントリー管理コントローラー
 * ※このクラスはオプションページでのエントリー管理モーダル用です
 * ※独立したエントリー管理ページには別のクラスを使います
 */
export class EntryController {
  // 親コントローラー
  private optionsController: OptionsController;

  // DOM要素
  private entryModal!: HTMLDivElement;
  private entryModalTitle!: HTMLHeadingElement;
  private entryModalClose!: HTMLSpanElement;
  private entryList!: HTMLDivElement;
  private addEntryBtn!: HTMLButtonElement;
  private saveEntriesBtn!: HTMLButtonElement;
  private closeEntryModalBtn!: HTMLButtonElement;

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
  private testRegexBtn!: HTMLButtonElement;
  private regexTestTool!: HTMLDivElement;
  private regexPattern!: HTMLInputElement;
  private regexReplacement!: HTMLInputElement;
  private regexTestInput!: HTMLTextAreaElement;
  private runRegexTest!: HTMLButtonElement;
  private regexTestCancel!: HTMLButtonElement;
  private regexTestResult!: HTMLDivElement;

  // 現在のドメイン情報と翻訳データ
  private currentDomainIndex: number = -1;
  private currentDomainSettings: DomainSettings | null = null;
  private currentTranslationData: TranslationData | null = null;
  private currentTranslationYaml: string | null = null;
  private editingEntryIndex: number = -1;

  constructor(optionsController: OptionsController) {
    this.optionsController = optionsController;
  }

  /**
   * 初期化
   */
  public initialize(): void {
    // DOM要素を取得
    this.initializeElements();

    // イベントリスナーを設定
    this.initializeEventListeners();
  }

  /**
   * DOM要素を取得
   */
  private initializeElements(): void {
    this.entryModal = document.getElementById('entry-modal') as HTMLDivElement;
    this.entryModalTitle = document.getElementById('entry-modal-title') as HTMLHeadingElement;
    this.entryModalClose = document.getElementById('entry-modal-close') as HTMLSpanElement;
    this.entryList = document.getElementById('entry-list') as HTMLDivElement;
    this.addEntryBtn = document.getElementById('add-entry-btn') as HTMLButtonElement;
    this.saveEntriesBtn = document.getElementById('save-entries-btn') as HTMLButtonElement;
    this.closeEntryModalBtn = document.getElementById('close-entry-modal-btn') as HTMLButtonElement;

    // エントリー編集フォーム要素
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

    // 正規表現テストツール要素
    this.testRegexBtn = document.getElementById('test-regex-btn') as HTMLButtonElement;
    this.regexTestTool = document.getElementById('regex-test-tool') as HTMLDivElement;
    this.regexPattern = document.getElementById('regex-pattern') as HTMLInputElement;
    this.regexReplacement = document.getElementById('regex-replacement') as HTMLInputElement;
    this.regexTestInput = document.getElementById('regex-test-input') as HTMLTextAreaElement;
    this.runRegexTest = document.getElementById('run-regex-test') as HTMLButtonElement;
    this.regexTestCancel = document.getElementById('regex-test-cancel') as HTMLButtonElement;
    this.regexTestResult = document.getElementById('regex-test-result') as HTMLDivElement;
  }

  /**
   * イベントリスナーを設定
   */
  private initializeEventListeners(): void {
    // モーダルを閉じるボタン
    this.entryModalClose.addEventListener('click', () => this.closeEntryModal());
    this.closeEntryModalBtn.addEventListener('click', () => this.closeEntryModal());

    // エントリー追加ボタン
    this.addEntryBtn.addEventListener('click', () => this.showAddEntryForm());

    // エントリーフォームのキャンセルボタン
    this.entryCancelBtn.addEventListener('click', () => this.hideEntryForm());

    // 翻訳エントリーフォームの送信イベント
    this.translationEntryForm.addEventListener('submit', (event) => this.saveEntryForm(event));

    // 正規表現テストボタン
    this.testRegexBtn.addEventListener('click', () => this.showRegexTestTool());
    this.regexTestCancel.addEventListener('click', () => this.hideRegexTestTool());
    this.runRegexTest.addEventListener('click', () => this.performRegexTest());

    // すべて保存ボタン
    this.saveEntriesBtn.addEventListener('click', () => this.saveAllEntries());

    // モーダルの外側をクリックしたときに閉じる
    window.addEventListener('click', (event) => {
      if (event.target === this.entryModal) {
        this.closeEntryModal();
      }
    });
  }

  /**
   * 翻訳エントリー管理モーダルを表示
   */
  public async showEntryManageModal(domainIndex: number): Promise<void> {
    try {
      // 現在のドメイン設定
      const settings = this.optionsController.getSettings();
      this.currentDomainIndex = domainIndex;
      this.currentDomainSettings = settings.domains[domainIndex];

      if (!this.currentDomainSettings) {
        throw new Error('選択されたドメイン設定が見つかりません');
      }

      // モーダルタイトルを設定
      this.entryModalTitle.textContent = `${this.currentDomainSettings.name} - 翻訳エントリー管理`;

      // 翻訳データを取得
      await this.loadDomainTranslations();

      // 翻訳エントリーリストを表示
      this.renderEntryList();

      // エントリー編集フォームを隠す
      this.hideEntryForm();

      // テストツールを隠す
      this.hideRegexTestTool();

      // モーダルを表示
      this.entryModal.style.display = 'block';
    } catch (error) {
      console.error('翻訳エントリー管理の初期化に失敗しました:', error);
      uiDebugLog('翻訳エントリー管理初期化エラー', error);
      alert(
        'エラー: 翻訳エントリー管理の初期化に失敗しました。' +
          (error instanceof Error ? error.message : '不明なエラー'),
      );
    }
  }

  /**
   * ドメインの翻訳データを読み込む
   */
  private async loadDomainTranslations(): Promise<void> {
    if (!this.currentDomainSettings) {
      throw new Error('ドメイン設定が選択されていません');
    }

    try {
      // リポジトリURLから翻訳ファイルを取得
      const response = await fetch(this.currentDomainSettings.repository);

      if (!response.ok) {
        throw new Error(
          `翻訳ファイルの取得に失敗しました: ${response.status} ${response.statusText}`,
        );
      }

      // 翻訳データをパース
      this.currentTranslationYaml = await response.text();
      this.currentTranslationData = jsyaml.load(this.currentTranslationYaml) as TranslationData;

      if (!this.currentTranslationData || !this.currentTranslationData.translations) {
        throw new Error('無効な翻訳ファイル形式です');
      }

      uiDebugLog('翻訳データ読み込み完了', this.currentTranslationData);
    } catch (error) {
      console.error('翻訳データの読み込みに失敗しました:', error);
      uiDebugLog('翻訳データ読み込みエラー', error);
      throw error;
    }
  }

  /**
   * 翻訳エントリーリストを表示
   */
  private renderEntryList(): void {
    if (!this.currentTranslationData || !this.currentTranslationData.translations) {
      this.entryList.innerHTML =
        '<div class="empty-message">翻訳データが読み込まれていません</div>';
      return;
    }

    this.entryList.innerHTML = '';

    if (this.currentTranslationData.translations.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-message';
      emptyMessage.textContent =
        '翻訳エントリーがありません。「エントリー追加」ボタンから追加してください。';
      this.entryList.appendChild(emptyMessage);
      return;
    }

    this.currentTranslationData.translations.forEach((entry, index) => {
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
      editBtn.addEventListener('click', () => this.showEditEntryForm(index));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn danger icon';
      deleteBtn.textContent = '削除';
      deleteBtn.addEventListener('click', () => this.deleteEntry(index));

      entryControls.appendChild(editBtn);
      entryControls.appendChild(deleteBtn);

      entryItem.appendChild(entryText);
      entryItem.appendChild(entryControls);

      this.entryList.appendChild(entryItem);
    });
  }

  /**
   * エントリー追加フォームを表示
   */
  private showAddEntryForm(): void {
    // フォームをリセット
    this.translationEntryForm.reset();
    this.entryFormTitle.textContent = '翻訳エントリーの追加';
    this.editingEntryIndex = -1;

    // 正規表現テストツールを隠す
    this.hideRegexTestTool();

    // フォームを表示
    this.entryEditForm.style.display = 'block';
  }

  /**
   * エントリー編集フォームを表示
   */
  private showEditEntryForm(index: number): void {
    if (!this.currentTranslationData || !this.currentTranslationData.translations) {
      return;
    }

    const entry = this.currentTranslationData.translations[index];

    // フォームに値を設定
    this.entryOriginal.value = entry.original;
    this.entryTranslated.value = entry.translated;
    this.entryContext.value = entry.context || '';
    this.entryRegex.checked = !!entry.regex;

    this.entryFormTitle.textContent = '翻訳エントリーの編集';
    this.editingEntryIndex = index;

    // 正規表現テストツールを隠す
    this.hideRegexTestTool();

    // フォームを表示
    this.entryEditForm.style.display = 'block';
  }

  /**
   * エントリーフォームを隠す
   */
  private hideEntryForm(): void {
    this.entryEditForm.style.display = 'none';
  }

  /**
   * 正規表現テストツールを表示
   */
  private showRegexTestTool(): void {
    // 現在のエントリー編集フォームの値を取得
    const pattern = this.entryOriginal.value;
    const replacement = this.entryTranslated.value;

    // テストフォームに設定
    this.regexPattern.value = pattern;
    this.regexReplacement.value = replacement;
    this.regexTestInput.value = '';
    this.regexTestResult.innerHTML = '';

    // 編集フォームを隠す
    this.entryEditForm.style.display = 'none';

    // テストツールを表示
    this.regexTestTool.style.display = 'block';
  }

  /**
   * 正規表現テストツールを隠す
   */
  private hideRegexTestTool(): void {
    this.regexTestTool.style.display = 'none';
  }

  /**
   * 正規表現テストを実行
   */
  private performRegexTest(): void {
    const pattern = this.regexPattern.value;
    const replacement = this.regexReplacement.value;
    const testInput = this.regexTestInput.value;

    if (!pattern || !testInput) {
      this.regexTestResult.innerHTML =
        '<span class="no-match">パターンまたはテスト文字列が入力されていません</span>';
      return;
    }

    try {
      // 正規表現オブジェクトを作成
      const regex = new RegExp(pattern, 'g');

      // マッチするか確認
      const matches = testInput.match(regex);

      if (!matches) {
        this.regexTestResult.innerHTML =
          '<span class="no-match">マッチするテキストがありませんでした</span>';
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

      this.regexTestResult.innerHTML = resultHtml;

      // パターンと置換テキストを編集フォームに反映
      this.entryOriginal.value = pattern;
      this.entryTranslated.value = replacement;

      // エントリーフォームの正規表現チェックボックスを有効化
      this.entryRegex.checked = true;
    } catch (error) {
      this.regexTestResult.innerHTML = `<span class="no-match">エラー: ${error instanceof Error ? error.message : '不明なエラー'}</span>`;
    }
  }

  /**
   * 翻訳エントリーモーダルを閉じる
   */
  private closeEntryModal(): void {
    this.entryModal.style.display = 'none';

    // 状態をリセット
    this.currentDomainIndex = -1;
    this.currentDomainSettings = null;
    this.currentTranslationData = null;
    this.currentTranslationYaml = null;
    this.editingEntryIndex = -1;
  }

  /**
   * 翻訳エントリーフォームを保存
   */
  private saveEntryForm(event: Event): void {
    event.preventDefault();

    if (!this.currentTranslationData || !this.currentTranslationData.translations) {
      alert('翻訳データが読み込まれていません');
      return;
    }

    try {
      const entryData: TranslationEntry = {
        original: this.entryOriginal.value,
        translated: this.entryTranslated.value,
        context: this.entryContext.value || undefined,
        regex: this.entryRegex.checked || undefined,
      };

      // 空値のプロパティを削除
      Object.keys(entryData).forEach((key) => {
        const k = key as keyof TranslationEntry;
        if (entryData[k] === undefined) {
          delete entryData[k];
        }
      });

      if (this.editingEntryIndex >= 0) {
        // 既存のエントリーを更新
        this.currentTranslationData.translations[this.editingEntryIndex] = entryData;
      } else {
        // 新しいエントリーを追加
        this.currentTranslationData.translations.push(entryData);
      }

      // リストを更新
      this.renderEntryList();

      // フォームを隠す
      this.hideEntryForm();

      uiDebugLog('翻訳エントリー保存', entryData);
    } catch (error) {
      console.error('翻訳エントリーの保存に失敗しました:', error);
      uiDebugLog('翻訳エントリー保存エラー', error);
      alert(
        'エラー: 翻訳エントリーの保存に失敗しました。' +
          (error instanceof Error ? error.message : '不明なエラー'),
      );
    }
  }

  /**
   * 翻訳エントリーの削除
   */
  private deleteEntry(index: number): void {
    if (!this.currentTranslationData || !this.currentTranslationData.translations) {
      return;
    }

    if (!confirm('このエントリーを削除してもよろしいですか？')) {
      return;
    }

    // エントリーを削除
    this.currentTranslationData.translations.splice(index, 1);

    // リストを更新
    this.renderEntryList();

    uiDebugLog('翻訳エントリー削除', index);
  }

  /**
   * 全ての翻訳エントリーを保存
   */
  private async saveAllEntries(): Promise<void> {
    if (
      !this.currentDomainSettings ||
      !this.currentTranslationData ||
      !this.currentTranslationYaml
    ) {
      alert('翻訳データが読み込まれていません');
      return;
    }

    try {
      // 元のYAMLをロード
      const originalData = jsyaml.load(this.currentTranslationYaml) as TranslationData;

      // 翻訳エントリーだけを更新
      originalData.translations = this.currentTranslationData.translations;

      // 更新したYAMLを生成
      const updatedYaml = jsyaml.dump(originalData);

      // ダウンロード用ファイル名を設定
      const fileName =
        this.currentDomainSettings.repository.split('/').pop() || 'translation-config.yml';

      // YAMLファイルをダウンロード
      this.downloadYamlFile(updatedYaml, fileName);

      alert(
        '翻訳ファイルをダウンロードしました。このファイルをGitHubリポジトリに手動でアップロードしてください。',
      );
    } catch (error) {
      console.error('翻訳エントリーの保存に失敗しました:', error);
      uiDebugLog('翻訳エントリー保存エラー', error);
      alert(
        'エラー: 翻訳エントリーの保存に失敗しました。' +
          (error instanceof Error ? error.message : '不明なエラー'),
      );
    }
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
}
