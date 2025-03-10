import { uiDebugLog } from '../../utils/debug';
import { EntryManagerController } from './entry-manager-controller';

/**
 * 正規表現テストツール管理クラス
 */
export class RegexTestManager {
  private controller: EntryManagerController;
  private lastTestPattern: string = '';
  private lastTestReplacement: string = '';
  private lastTestResult: string = '';

  constructor(controller: EntryManagerController) {
    this.controller = controller;
  }

  /**
   * 正規表現テストツールを表示
   */
  public showRegexTestTool(): void {
    // 現在編集中または表示中のエントリーのパターンを取得
    const editingIndex = this.controller.getEditingEntryIndex();
    let pattern = '';
    let replacement = '';

    if (editingIndex >= 0) {
      // 編集中のエントリーからパターンを取得
      const translationData = this.controller.getTranslationData();
      if (
        translationData &&
        translationData.translations &&
        editingIndex < translationData.translations.length
      ) {
        const entry = translationData.translations[editingIndex];
        if (entry.regex) {
          pattern = entry.original;
          replacement = entry.translated;
        }
      }
    } else {
      // フォームから値を取得（新規追加のケース）
      const entryOriginal = this.controller.getEntryOriginal();
      const entryTranslated = this.controller.getEntryTranslated();
      const entryRegex = this.controller.getEntryRegex();

      if (entryRegex.checked) {
        pattern = entryOriginal.value;
        replacement = entryTranslated.value;
      }
    }

    // テスト用のフォームに値を設定
    this.controller.getRegexPattern().value = pattern || this.lastTestPattern;
    this.controller.getRegexReplacement().value = replacement || this.lastTestReplacement;
    this.controller.getRegexTestInput().value = '';
    this.controller.getRegexTestResult().innerHTML = '';

    // テストツールを表示して他の要素を非表示
    this.showTestTool();
  }

  /**
   * テストツールを表示して他の要素を非表示
   */
  private showTestTool(): void {
    // テストツールを表示
    this.controller.getRegexTestTool().style.display = 'block';

    // 他の要素を非表示
    this.controller.getEntryEditForm().style.display = 'none';
    this.controller.getEntryDetail().style.display = 'none';

    // 初期メッセージを非表示
    this.controller.hideInitialMessage();

    // パターン入力にフォーカス
    this.controller.getRegexPattern().focus();
  }

  /**
   * 正規表現テストを実行
   */
  public runRegexTest(): void {
    const pattern = this.controller.getRegexPattern().value;
    const replacement = this.controller.getRegexReplacement().value;
    const testInput = this.controller.getRegexTestInput().value;
    const resultContainer = this.controller.getRegexTestResult();

    if (!pattern || !testInput) {
      resultContainer.innerHTML =
        '<div class="test-error">パターンとテスト文字列を入力してください</div>';
      return;
    }

    try {
      // 正規表現オブジェクトを作成
      const regex = new RegExp(pattern, 'g');

      // マッチ結果を表示
      const matches = Array.from(testInput.matchAll(regex));

      if (matches.length === 0) {
        resultContainer.innerHTML =
          '<div class="test-warning">一致する部分はありませんでした</div>';
        return;
      }

      // 置換結果の生成
      const replaced = testInput.replace(regex, replacement);
      this.lastTestResult = replaced;

      // 結果の表示
      let resultHtml = '<div class="test-result">';

      // マッチした部分の表示
      resultHtml += '<div class="match-section"><h4>マッチした部分:</h4><ul>';
      matches.forEach((match, index) => {
        resultHtml += `<li>マッチ ${index + 1}: "${match[0]}" (位置: ${match.index})</li>`;

        // キャプチャグループがある場合
        if (match.length > 1) {
          resultHtml += '<ul class="capture-groups">';
          for (let i = 1; i < match.length; i++) {
            resultHtml += `<li>グループ ${i}: "${match[i]}"</li>`;
          }
          resultHtml += '</ul>';
        }
      });
      resultHtml += '</ul></div>';

      // 置換結果の表示
      resultHtml += `
        <div class="replace-section">
          <h4>置換結果:</h4>
          <div class="replaced-text">${this.escapeHtml(replaced)}</div>
        </div>
      `;

      resultHtml += '</div>';
      resultContainer.innerHTML = resultHtml;

      // 最後に使用したパターンと置換文字列を保存
      this.lastTestPattern = pattern;
      this.lastTestReplacement = replacement;
    } catch (error) {
      resultContainer.innerHTML = `
        <div class="test-error">
          正規表現エラー: ${error instanceof Error ? error.message : String(error)}
        </div>
      `;
    }
  }

  /**
   * 正規表現テスト結果をエントリーフォームに適用
   */
  public applyRegexTest(): void {
    const pattern = this.controller.getRegexPattern().value;
    const replacement = this.controller.getRegexReplacement().value;

    if (!pattern || !replacement) {
      alert('パターンと置換文字列を入力してください');
      return;
    }

    // エントリー編集フォームへの適用
    this.controller.getEntryOriginal().value = pattern;
    this.controller.getEntryTranslated().value = replacement;
    this.controller.getEntryRegex().checked = true;

    // テストツールを非表示
    this.hideRegexTestTool();

    // エントリー編集フォームを表示
    this.controller.getEntryEditForm().style.display = 'block';
  }

  /**
   * 正規表現テストツールを非表示
   */
  public hideRegexTestTool(): void {
    this.controller.getRegexTestTool().style.display = 'none';
  }

  /**
   * HTMLエスケープ
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
