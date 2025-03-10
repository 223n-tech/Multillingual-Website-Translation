/**
 * バックグラウンドスクリプトとコンテンツスクリプト間の通信メッセージ
 */
export interface Message {
  action: string;
  [key: string]: unknown; // TODO: Specify a more precise type;
}

/**
 * 翻訳データとマッピングのリクエストメッセージ
 */
export interface GetTranslationsMessage extends Message {
  action: 'getTranslationsAndMapping';
  domain: string;
}

/**
 * 翻訳切り替えメッセージ
 */
export interface ToggleTranslationMessage extends Message {
  action: 'toggleTranslation';
  active: boolean;
}

/**
 * 翻訳開始メッセージ
 */
export interface StartTranslationMessage extends Message {
  action: 'startTranslation';
  domain: string;
}

/**
 * 翻訳停止メッセージ
 */
export interface StopTranslationMessage extends Message {
  action: 'stopTranslation';
}

/**
 * 翻訳データとマッピングのレスポンス
 */
export interface TranslationsResponse {
  success: boolean;
  translations?: string;
  contextMapping?: string;
  error?: string;
}

/**
 * 一般的なレスポンス
 */
export interface GenericResponse {
  success: boolean;
  error?: string;
}
