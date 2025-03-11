// src/types/message-types.ts

/**
 * すべてのメッセージの基本インターフェース
 */
export interface BaseMessage {
  action: string;
  [key: string]: unknown;
}

/**
 * 翻訳開始メッセージ
 */
export interface StartTranslationMessage extends BaseMessage {
  action: 'startTranslation';
  domain: string;
}

/**
 * 翻訳停止メッセージ
 */
export interface StopTranslationMessage extends BaseMessage {
  action: 'stopTranslation';
}

/**
 * 翻訳データ取得メッセージ
 */
export interface GetTranslationsMessage extends BaseMessage {
  action: 'getTranslations' | 'getTranslationsAndMapping';
  domain: string;
}

/**
 * 翻訳YAML取得メッセージ
 */
export interface GetTranslationYamlMessage extends BaseMessage {
  action: 'getTranslationYaml';
  domain: string;
}

/**
 * 翻訳トグルメッセージ
 */
export interface ToggleTranslationMessage extends BaseMessage {
  action: 'toggleTranslation';
  active: boolean;
}

/**
 * 翻訳レスポンス
 */
export interface TranslationsResponse {
  success: boolean;
  translations?: string;
  contextMapping?: string;
  error?: string;
}

/**
 * 翻訳YAML取得レスポンス
 */
export interface TranslationYamlResponse {
  success: boolean;
  yaml?: string;
  error?: string;
}

/**
 * 一般的なレスポンス
 */
export interface GenericResponse {
  success: boolean;
  error?: string;
}

/**
 * メッセージレスポンスコールバック
 */
export type MessageResponseCallback = (response?: unknown) => void;
