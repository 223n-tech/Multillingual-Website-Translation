/**
 * 翻訳エントリー
 */
export interface TranslationEntry {
  /** 元のテキスト */
  original: string;
  /** 翻訳後のテキスト */
  translated: string;
  /** コンテキスト (省略可) */
  context?: string;
  /** 正規表現フラグ */
  regex?: boolean;
}

/**
 * 翻訳ファイル
 */
export interface TranslationData {
  /** サイト名 */
  site: string;
  /** 言語 */
  language: string;
  /** 説明 */
  description: string;
  /** バージョン */
  version: string;
  /** 作者 */
  author: string;
  /** 最終更新日 */
  last_updated: string;
  /** 翻訳エントリーのリスト */
  translations: TranslationEntry[];
}

/**
 * 処理用に整形された翻訳マップ
 */
export interface TranslationMaps {
  /** コンテキスト別の完全一致翻訳マップ */
  byContext: Record<string, Record<string, string>>;
  /** 正規表現パターンリスト */
  regexPatterns: RegexPattern[];
  /** グローバル翻訳マップ (コンテキストなし) */
  global: Record<string, string>;
}

/**
 * 正規表現パターン
 */
export interface RegexPattern {
  /** 正規表現オブジェクト */
  pattern: RegExp;
  /** 置換テキスト */
  replacement: string;
  /** コンテキスト */
  context: string;
}
