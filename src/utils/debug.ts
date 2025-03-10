/**
 * デバッグモードフラグ
 * 本番環境では false に設定することを推奨
 */
export const DEBUG = true;

/**
 * バックグラウンド用デバッグロガー
 */
export function debugLog(...args: unknown[]): void {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[翻訳拡張 BG]', ...args);
  }
}

/**
 * コンテンツスクリプト用デバッグロガー
 */
export function contentDebugLog(...args: unknown[]): void {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[翻訳拡張]', ...args);
  }
}

/**
 * ポップアップ/オプション用デバッグロガー
 */
export function uiDebugLog(...args: unknown[]): void {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[翻訳拡張 UI]', ...args);
  }
}

/**
 * パフォーマンス測定開始
 */
export function startPerformanceMeasure(name: string): void {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.time(`[PERF] ${name}`);
  }
}

/**
 * パフォーマンス測定終了
 */
export function endPerformanceMeasure(name: string): void {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.timeEnd(`[PERF] ${name}`);
  }
}
