/**
 * コンテキスト設定
 */
export interface ContextConfig {
  /** 要素を選択するセレクタリスト */
  selectors: string[];
  /** 除外セレクタリスト (省略可) */
  exclude_selectors?: string[];
  /** 親コンテキスト (省略可) */
  parent_context?: string;
  /** 説明 */
  description?: string;
}

/**
 * 正規表現コンテキスト設定
 */
export interface RegexContextConfig {
  /** 適用セレクタリスト */
  apply_to: string[];
  /** 除外セレクタリスト (省略可) */
  exclude?: string[];
}

/**
 * コンテキストマッピング設定
 */
export interface ContextMappingData {
  /** 基本設定 */
  settings: {
    /** 未知のコンテキストの処理方法 ("ignore" | "apply") */
    unknown_context: string;
    /** 空コンテキストの処理方法 ("global" | "ignore") */
    empty_context: string;
  };
  /** コンテキスト定義 */
  contexts: Record<string, ContextConfig>;
  /** 正規表現コンテキスト定義 (省略可) */
  regex_contexts?: Record<string, RegexContextConfig>;
}

/**
 * デフォルトのコンテキストマッピング
 */
export const DEFAULT_CONTEXT_MAPPING: ContextMappingData = {
  settings: {
    unknown_context: 'ignore',
    empty_context: 'global',
  },
  contexts: {
    メインナビゲーション: {
      selectors: ['.AppHeader-globalBar a', '.header-nav-item', '.HeaderMenu-link'],
      description: 'ヘッダー部分のナビゲーションメニュー',
    },
    リポジトリタブ: {
      selectors: ['.UnderlineNav-item', '.js-selected-navigation-item', '.reponav-item'],
      description: 'リポジトリページのタブメニュー',
    },
    ボタン: {
      selectors: ['button', '.btn', '[role="button"]'],
      exclude_selectors: ['.btn[data-content]'],
      description: '各種ボタン要素',
    },
    特殊要素: {
      selectors: ['[data-content]', '.h4.mb-2', 'h2.h4', 'h2.f4', '.Link--primary'],
      description: '特殊UI要素',
    },
    コード: {
      selectors: ['.repository-content', '.file-navigation'],
      exclude_selectors: ['pre', 'code', '.highlight', '.blob-code'],
      description: 'コードビュー関連',
    },
    フッター: {
      selectors: [
        '.Link--secondary.Link',
        'footer a',
        '[data-analytics-event*="Footer"]',
        '.footer-links a',
        '.footer a',
      ],
      description: 'フッター要素',
    },
  },
  regex_contexts: {
    課題表示: {
      apply_to: ['.js-issue-title', '.js-issue-row', '.issue-link', '.gh-header-title'],
    },
    コード: {
      apply_to: ['.repository-meta', '.repo-stats', '.file-navigation'],
      exclude: ['pre', 'code', '.highlight'],
    },
  },
};
