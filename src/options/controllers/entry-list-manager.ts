import { TranslationEntry } from '../../types/translation';
import { uiDebugLog } from '../../utils/debug';
import { EntryManagerController } from './entry-manager-controller';

/**
 * 翻訳エントリーリスト管理クラス
 */
export class EntryListManager {
  private controller: EntryManagerController;

  constructor(controller: EntryManagerController) {
    this.controller = controller;
  }

  /**
   * エントリーリストの表示
   */
  public renderEntryList(): void {
    const entryList = this.controller.getEntryList();
    const translationData = this.controller.getTranslationData();

    if (!translationData || !translationData.translations || !entryList) {
      return;
    }

    // フィルタリング条件を取得
    const searchText = this.controller.getSearchInput().value.toLowerCase();
    const contextFilter = this.controller.getContextFilter().value;
    const regexFilter = this.controller.getRegexFilter().checked;

    // エントリーリストをクリア
    entryList.innerHTML = '';

    // フィルタリングされたエントリーを取得
    const filteredEntries = this.filterEntries(
      translationData.translations,
      searchText,
      contextFilter,
      regexFilter,
    );

    // エントリー数の更新
    this.controller.updateEntryCountPublic(filteredEntries.length);

    if (filteredEntries.length === 0) {
      // 表示するエントリーがない場合
      this.showNoEntriesMessage(entryList);
      return;
    }

    // 初期メッセージを非表示
    this.controller.hideInitialMessage();

    // エントリーをリストに追加
    this.addEntriesToList(entryList, filteredEntries);
  }

  /**
   * エントリーのフィルタリング
   */
  private filterEntries(
    entries: TranslationEntry[],
    searchText: string,
    contextFilter: string,
    regexFilter: boolean,
  ): TranslationEntry[] {
    return entries.filter((entry, _index) => {
      // 検索テキストのフィルタリング
      const matchesSearch =
        searchText === '' ||
        entry.original.toLowerCase().includes(searchText) ||
        entry.translated.toLowerCase().includes(searchText) ||
        (entry.context && entry.context.toLowerCase().includes(searchText));

      // コンテキストのフィルタリング
      let matchesContext = true;
      if (contextFilter) {
        if (contextFilter === '__empty__') {
          // 空のコンテキストのみ表示
          matchesContext = !entry.context || entry.context === '';
        } else {
          // 指定されたコンテキストのみ表示
          matchesContext = entry.context === contextFilter;
        }
      }

      // 正規表現のフィルタリング
      const matchesRegex = !regexFilter || entry.regex === true;

      return matchesSearch && matchesContext && matchesRegex;
    });
  }

  /**
   * エントリーがない場合のメッセージを表示
   */
  private showNoEntriesMessage(container: HTMLDivElement): void {
    const message = document.createElement('div');
    message.className = 'no-entries-message';
    message.textContent = '表示するエントリーがありません';
    container.appendChild(message);
  }

  /**
   * エントリーをリストに追加
   */
  private addEntriesToList(container: HTMLDivElement, entries: TranslationEntry[]): void {
    entries.forEach((entry, filteredIndex) => {
      // 元の配列でのインデックスを検索
      const originalIndex = this.findOriginalIndex(entry);

      // エントリーカードの作成
      const card = this.createEntryCard(entry, originalIndex, filteredIndex);
      container.appendChild(card);
    });
  }

  /**
   * 元の配列でのインデックスを検索
   */
  private findOriginalIndex(entry: TranslationEntry): number {
    const translationData = this.controller.getTranslationData();
    if (!translationData || !translationData.translations) {
      return -1;
    }

    return translationData.translations.findIndex(
      (e) =>
        e.original === entry.original &&
        e.translated === entry.translated &&
        e.context === entry.context,
    );
  }

  /**
   * エントリーカードの作成
   */
  private createEntryCard(
    entry: TranslationEntry,
    originalIndex: number,
    _filteredIndex: number,
  ): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'entry-card';
    card.dataset.index = originalIndex.toString();

    // 元のテキスト
    const original = document.createElement('div');
    original.className = 'entry-original';
    original.textContent = this.truncateText(entry.original, 100);

    // 翻訳済みテキスト
    const translated = document.createElement('div');
    translated.className = 'entry-translated';
    translated.textContent = this.truncateText(entry.translated, 100);

    // メタデータ行（コンテキストと正規表現フラグ）
    const meta = document.createElement('div');
    meta.className = 'entry-meta';

    // コンテキスト情報
    if (entry.context) {
      const contextBadge = document.createElement('span');
      contextBadge.className = 'context-badge';
      contextBadge.textContent = entry.context;
      meta.appendChild(contextBadge);
    }

    // 正規表現フラグがある場合
    if (entry.regex) {
      const regexBadge = document.createElement('span');
      regexBadge.className = 'regex-badge';
      regexBadge.textContent = '正規表現';
      meta.appendChild(regexBadge);
    }

    // カードに要素を追加
    card.appendChild(original);
    card.appendChild(translated);
    card.appendChild(meta);

    // クリックイベントの追加
    card.addEventListener('click', () => {
      this.handleEntryClick(originalIndex, card);
    });

    return card;
  }

  /**
   * エントリーカードのクリック処理
   */
  private handleEntryClick(index: number, clickedCard: HTMLElement): void {
    uiDebugLog('エントリーカードがクリックされました', { index });

    // 以前の選択を解除
    const allCards = this.controller.getEntryList().querySelectorAll('.entry-card');
    allCards.forEach((card) => card.classList.remove('selected'));

    // クリックされたカードを選択状態にする
    clickedCard.classList.add('selected');

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

    // 詳細表示を表示
    detailContainer.style.display = 'block';

    // フォームと正規表現テストツールを非表示
    this.controller.getEntryEditForm().style.display = 'none';
    this.controller.getRegexTestTool().style.display = 'none';

    // 初期メッセージを非表示
    this.controller.hideInitialMessage();

    // スマホ表示の場合は右パネルにスクロール
    if (window.innerWidth <= 768) {
      const rightPanel = document.querySelector('.right-panel');
      if (rightPanel) {
        rightPanel.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  /**
   * テキストの表示を適切な長さに切り詰める
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }
}
