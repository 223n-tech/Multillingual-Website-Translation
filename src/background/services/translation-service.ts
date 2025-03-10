import { debugLog } from '../../utils/debug';

/**
 * 翻訳サービス
 * 翻訳ファイルのフェッチと処理を行う
 */
export class TranslationService {
  /**
   * 翻訳ファイルをフェッチ
   */
  public async fetchTranslationFile(url: string): Promise<string> {
    try {
      debugLog('翻訳ファイルをフェッチ中:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `翻訳ファイルの取得に失敗しました: ${response.status} ${response.statusText}`,
        );
      }

      const text = await response.text();
      debugLog('翻訳ファイルのフェッチ成功', text.slice(0, 200) + '...');
      return text;
    } catch (error) {
      console.error('翻訳ファイルのフェッチに失敗:', error);
      throw error;
    }
  }

  /**
   * コンテキストマッピングファイルをフェッチ
   */
  public async fetchContextMappingFile(url: string): Promise<string> {
    try {
      debugLog('コンテキストマッピングファイルをフェッチ中:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `コンテキストマッピングファイルの取得に失敗しました: ${response.status} ${response.statusText}`,
        );
      }

      const text = await response.text();
      debugLog('コンテキストマッピングファイルのフェッチ成功', text.slice(0, 200) + '...');
      return text;
    } catch (error) {
      console.error('コンテキストマッピングファイルのフェッチに失敗:', error);
      throw error;
    }
  }
}
