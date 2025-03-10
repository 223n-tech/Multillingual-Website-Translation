import '../options.css';
import { uiDebugLog } from '../../utils/debug';
import { EntryManagerController } from '../controllers/entry-controller';

/**
 * 翻訳エントリー管理ページのエントリーポイント
 */
document.addEventListener('DOMContentLoaded', () => {
  // URL パラメーターを解析
  const params = new URLSearchParams(window.location.search);
  const domainId = params.get('domainId');

  if (!domainId) {
    // ドメインIDがない場合はエラーメッセージを表示
    document.body.innerHTML = `
      <div class="container">
        <div class="card">
          <h2>エラー</h2>
          <p>ドメインIDが指定されていません。設定ページから正しく開いてください。</p>
          <button class="btn primary" onclick="window.location.href='options.html'">設定ページに戻る</button>
        </div>
      </div>
    `;
    return;
  }

  uiDebugLog('エントリー管理ページ初期化', { domainId });

  // エントリーマネージャーコントローラーを初期化
  const controller = new EntryManagerController(domainId);
  controller.initialize().catch((error: Error) => {
    console.error('エントリーマネージャーの初期化に失敗:', error);

    // エラー時のUIを表示
    document.body.innerHTML = `
      <div class="container">
        <div class="card">
          <h2>エラー</h2>
          <p>エントリー管理ページの初期化に失敗しました：</p>
          <pre>${error.message}</pre>
          <button class="btn primary" onclick="window.location.href='options.html'">設定ページに戻る</button>
        </div>
      </div>
    `;
  });
});
