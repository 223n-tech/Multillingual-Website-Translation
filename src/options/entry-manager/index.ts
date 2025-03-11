import '../options.css';
import './entry-manager.css';
import { uiDebugLog } from '../../utils/debug';
import { EntryManagerController } from '../controllers/entry-manager-controller';

/**
 * 翻訳エントリー管理ページのエントリーポイント
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // URLパラメーターを解析
    const params = new URLSearchParams(window.location.search);
    const domainIndex = params.get('index');

    if (!domainIndex) {
      showErrorMessage(
        'ドメインインデックスが指定されていません。設定ページから正しく開いてください。',
      );
      return;
    }

    const index = parseInt(domainIndex, 10);
    if (isNaN(index)) {
      showErrorMessage('無効なドメインインデックスです');
      return;
    }

    uiDebugLog('エントリー管理ページ初期化', { domainIndex, index });

    // エントリーマネージャーコントローラーを初期化
    const controller = new EntryManagerController(index);
    try {
      await controller.initialize();
    } catch (error) {
      console.error('コントローラー初期化エラー:', error);
      showErrorMessage(
        `コントローラー初期化エラー: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } catch (error) {
    console.error('エントリー管理ページ初期化エラー:', error);
    showErrorMessage(
      `エントリー管理ページの初期化に失敗: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
});

/**
 * エラーメッセージを表示
 */
function showErrorMessage(message: string): void {
  document.body.innerHTML = `
    <div class="container">
      <div class="card">
        <h2>エラー</h2>
        <p>エントリー管理ページの初期化に失敗しました：</p>
        <pre>${message}</pre>
        <button class="btn primary" onclick="window.location.href='options.html'">設定ページに戻る</button>
      </div>
    </div>
  `;
}
