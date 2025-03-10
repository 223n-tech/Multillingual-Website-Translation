import { TranslationEntry } from '../../types/translation';
import { uiDebugLog } from '../../utils/debug';
import { EntryManagerController } from './entry-manager-controller';

/**
 * 翻訳エントリー編集フォーム管理クラス
 */
export class EntryFormManager {
  private controller: EntryManagerController;
  private previousContexts: string[] = [];

  constructor(controller: EntryManagerController) {
    this.controller = controller;
  }

  /**
   * エントリー編集フォームを表示
   * @param index 編集するエントリーのインデックス。-1の場合は新規追加
   */
  public showEntryForm(index: number): void {
    const translationData = this.controller.getTranslationData();
    if (!translationData) {
      return;
    }

    // 編集中のインデックスを設定
    this.controller.setEditingEntryIndex(index);

    // フォームタイトルの設定
    const formTitle = this.controller.getEntryFormTitle();
    formTitle.textContent = index === -1 ? '新規エントリー追加' : 'エントリー編集';

    // フォームに値を設定
    const entryOriginal = this.controller.getEntryOriginal();
    const entryTranslated = this.controller.getEntryTranslated();
    const entryContext = this.controller.getEntryContext();
    const entryRegex = this.controller.getEntryRegex();

    if (index === -1) {
      // 新規エントリーの場合は空の値を設定
      entryOriginal.value = '';
      entryTranslated.value = '';
      entryContext.value = '';
      entryRegex.checked = false;
    } else {
      // 既存エントリーの編集の場合は値を設定
      const entry = translationData.translations[index];
      entryOriginal.value = entry.original;
      entryTranslated.value = entry.translated;
      entryContext.value = entry.context || '';
      entryRegex.checked = entry.regex === true;
    }

    // コンテキスト入力のデータリスト更新
    this.setupContextDatalist();

    // フォームを表示して他の要素を非表示
    this.showForm();
  }

  /**
   * コンテキスト入力のデータリスト（オートコンプリート）を設定
   */
  private setupContextDatalist(): void {
    // 既存のデータリストを取得または作成
    let datalist = document.getElementById('context-datalist') as HTMLDataListElement;
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = 'context-datalist';
      document.body.appendChild(datalist);
    }

    // データリストをクリアして再設定
    datalist.innerHTML = '';

    // 最近使ったコンテキストを先頭に追加（最大5つ）
    const recentContexts = this.previousContexts.slice(0, 5);

    // 利用可能なすべてのコンテキストを追加
    const allContexts = Array.from(this.controller.getAvailableContexts())
      .filter((context) => context !== '') // 空のコンテキストは除外
      .filter((context) => !recentContexts.includes(context)); // 重複を避ける

    // 全てのコンテキストをソート
    const sortedContexts = [...recentContexts, ...allContexts].sort();

    // データリストにオプションを追加
    sortedContexts.forEach((context) => {
      const option = document.createElement('option');
      option.value = context;
      datalist.appendChild(option);
    });

    // 入力要素にデータリストを関連付け
    const entryContext = this.controller.getEntryContext();
    entryContext.setAttribute('list', 'context-datalist');
  }

  /**
   * フォームを表示して他の要素を非表示
   */
  private showForm(): void {
    // フォームを表示
    this.controller.getEntryEditForm().style.display = 'block';

    // 他の要素を非表示
    this.controller.getEntryDetail().style.display = 'none';
    this.controller.getRegexTestTool().style.display = 'none';

    // 初期メッセージを非表示
    this.controller.hideInitialMessage();

    // フォーカスを設定
    this.controller.getEntryOriginal().focus();
  }

  /**
   * エントリー編集フォームを非表示
   */
  public hideEntryForm(): void {
    this.controller.getEntryEditForm().style.display = 'none';
  }

  /**
   * エントリーフォームの送信処理
   */
  public submitEntryForm(): void {
    const translationData = this.controller.getTranslationData();
    if (!translationData) {
      return;
    }

    // フォームから値を取得
    const original = this.controller.getEntryOriginal().value.trim();
    const translated = this.controller.getEntryTranslated().value.trim();
    const context = this.controller.getEntryContext().value.trim();
    const regex = this.controller.getEntryRegex().checked;

    // 入力チェック
    if (!original || !translated) {
      alert('元のテキストと翻訳後のテキストを入力してください');
      return;
    }

    // 正規表現として有効かチェック
    if (regex) {
      try {
        new RegExp(original);
      } catch (error) {
        alert(`正規表現が無効です: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
    }

    // 翻訳エントリーの作成
    const entry: TranslationEntry = {
      original,
      translated,
    };

    // コンテキストが入力されている場合のみ追加
    if (context) {
      entry.context = context;

      // 使用したコンテキストを履歴に追加
      if (!this.previousContexts.includes(context)) {
        this.previousContexts.unshift(context);
        this.previousContexts = this.previousContexts.slice(0, 10); // 最大10件保持
      }
    }

    // 正規表現フラグが有効な場合のみ追加
    if (regex) {
      entry.regex = true;
    }

    // 編集中のインデックスを取得
    const editingIndex = this.controller.getEditingEntryIndex();

    if (editingIndex === -1) {
      // 新規追加の場合
      translationData.translations.push(entry);
      uiDebugLog('新規エントリーを追加しました', { entry });
    } else {
      // 編集の場合
      translationData.translations[editingIndex] = entry;
      uiDebugLog('エントリーを更新しました', { index: editingIndex, entry });
    }

    // コンテキスト一覧を更新
    if (context) {
      this.controller.getAvailableContexts().add(context);
    }

    // コンテキストフィルターの再設定
    // TODO: controllers/*.tsが共通の型をもつようにリファクタリングするのが理想的です
    // この場合、コントローラー側にsetupContextFilter()を呼び出す公開メソッドが必要

    // フォームを非表示
    this.hideEntryForm();

    // エントリーリストを再描画
    this.controller.renderEntryList();
  }
}
