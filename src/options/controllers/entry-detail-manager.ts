import { uiDebugLog } from '../../utils/debug';
import { EntryManagerController } from './entry-manager-controller';

/**
 * 翻訳エントリー詳細表示管理クラス
 */
export class EntryDetailManager {
  private controller: EntryManagerController;

  constructor(controller: EntryManagerController) {
    this.controller = controller;
  }

  /**
   * 現在詳細表示しているエントリーのインデックスを取得
   */
  public getCurrentEntryIndex(): number {
    const detailContainer = this.controller.getEntryDetail();
    const indexStr = detailContainer.dataset.index;

    if (!indexStr) {
      return -1;
    }

    return parseInt(indexStr, 10);
  }

  /**
   * 現在詳細表示しているエントリーを削除
   */
  public deleteCurrentEntry(): void {
    const index = this.getCurrentEntryIndex();
    if (index === -1) {
      return;
    }

    const translationData = this.controller.getTranslationData();
    if (
      !translationData ||
      !translationData.translations ||
      index >= translationData.translations.length
    ) {
      return;
    }

    // 削除確認
    const entry = translationData.translations[index];
    const confirmMessage = `次のエントリーを削除してもよろしいですか？\n\n元のテキスト: ${entry.original}\n翻訳後のテキスト: ${entry.translated}`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    // エントリーを削除
    translationData.translations.splice(index, 1);
    uiDebugLog('エントリーを削除しました', { index, entry });

    // 詳細表示を非表示
    this.controller.getEntryDetail().style.display = 'none';

    // エントリーリストを再描画
    this.controller.renderEntryList();

    // 利用可能なコンテキストリストを再構築（この部分は実際のコードでは別の場所に存在する可能性があります）
    // TODO: コンテキストリスト再構築の処理を呼び出す

    // 初期メッセージの表示（エントリーが0件になった場合）
    if (translationData.translations.length === 0) {
      const initialMessage = this.controller.getInitialMessage();
      if (initialMessage) {
        initialMessage.style.display = 'block';
      }
    }
  }

  /**
   * 詳細表示でのコンテキストを強調表示
   */
  public highlightContext(context: string): void {
    const detailContext = this.controller.getDetailContext();
    if (!detailContext || !context) {
      return;
    }

    // コンテキスト表示要素にクラスを追加
    detailContext.classList.add('highlighted');

    // 数秒後に強調表示を解除
    setTimeout(() => {
      detailContext.classList.remove('highlighted');
    }, 2000);
  }

  /**
   * 詳細表示を更新
   */
  public updateEntryDetail(index: number): void {
    const translationData = this.controller.getTranslationData();
    if (
      !translationData ||
      !translationData.translations ||
      index < 0 ||
      index >= translationData.translations.length
    ) {
      return;
    }

    const entry = translationData.translations[index];
    const detailContainer = this.controller.getEntryDetail();

    // 詳細表示に情報を設定
    this.controller.getDetailOriginal().textContent = entry.original;
    this.controller.getDetailTranslated().textContent = entry.translated;
    this.controller.getDetailContext().textContent = entry.context || '(コンテキストなし)';
    this.controller.getDetailRegex().textContent = entry.regex ? 'はい' : 'いいえ';

    // データ属性にインデックスを設定
    detailContainer.dataset.index = index.toString();
  }

  /**
   * 詳細表示を非表示
   */
  public hideEntryDetail(): void {
    this.controller.getEntryDetail().style.display = 'none';
  }

  /**
   * 詳細表示を表示
   */
  public showEntryDetail(): void {
    const detailContainer = this.controller.getEntryDetail();

    // 詳細表示を表示
    detailContainer.style.display = 'block';

    // 他の要素を非表示
    this.controller.getEntryEditForm().style.display = 'none';
    this.controller.getRegexTestTool().style.display = 'none';

    // 初期メッセージを非表示
    this.controller.hideInitialMessage();
  }
}
