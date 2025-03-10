/**
 * ドメイン設定
 */
export interface DomainSettings {
  /** ドメイン名 (例: github.com) */
  domain: string;
  /** 表示名 */
  name: string;
  /** 翻訳ファイルのリポジトリURL */
  repository: string;
  /** コンテキストマッピングファイルのURL (オプション) */
  contextMapping?: string;
  /** 有効/無効 */
  enabled: boolean;
  /** 説明 */
  description?: string;
}

/**
 * 全体設定
 */
export interface AppSettings {
  /** 拡張機能の有効/無効 */
  active: boolean;
  /** ドメイン設定リスト */
  domains: DomainSettings[];
}

/**
 * 拡張機能のデフォルト設定
 */
export const DEFAULT_SETTINGS: AppSettings = {
  active: true,
  domains: [
    {
      domain: 'github.com',
      name: 'GitHub UI 翻訳',
      repository:
        'https://raw.githubusercontent.com/223n-tech/github-translation/refs/heads/master/translation-config-github.yml',
      contextMapping:
        'https://raw.githubusercontent.com/223n-tech/github-translation/refs/heads/master/context-mapping.yml',
      enabled: true,
      description: 'GitHub UI の日本語翻訳',
    },
  ],
};
