import { uiDebugLog } from '../utils/debug';
import { AppSettings, DomainSettings } from '../types/settings';

/**
 * ポップアップUI用コントローラー
 */
export class PopupController {
  // DOM要素
  private translationToggle!: HTMLInputElement;
  private statusText!: HTMLSpanElement;
  private domainName!: HTMLDivElement;
  private translationAvailable!: HTMLDivElement;
  private refreshBtn!: HTMLButtonElement;
  private optionsBtn!: HTMLButtonElement;
  private githubLink!: HTMLAnchorElement;

  // 現在のタブ情報
  private currentTabId: number | null = null;
  private currentDomain: string | null = null;
  private currentSettings: AppSettings | null = null;
  private currentDomainSettings: DomainSettings | null = null;

  /**
   * 初期化
   */
  public async initialize(): Promise<void> {
    // DOM要素を取得
    this.initializeElements();

    // イベントリスナーの設定
    this.initializeEventListeners();

    // 現在の設定を読み込む
    await this.loadCurrentSettings();

    // 現在のタブ情報を取得
    await this.loadCurrentTabInfo();

    // UIを更新
    this.updateUI();
  }

  /**
   * DOM要素を取得
   */
  private initializeElements(): void {
    this.translationToggle = document.getElementById('translation-toggle') as HTMLInputElement;
    this.statusText = document.getElementById('status-text') as HTMLSpanElement;
    this.domainName = document.getElementById('domain-name') as HTMLDivElement;
    this.translationAvailable = document.getElementById('translation-available') as HTMLDivElement;
    this.refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;
    this.optionsBtn = document.getElementById('options-btn') as HTMLButtonElement;
    this.githubLink = document.getElementById('github-link') as HTMLAnchorElement;
  }

  /**
   * イベントリスナーの設定
   */
  private initializeEventListeners(): void {
    // 翻訳トグルの変更イベント
    this.translationToggle.addEventListener('change', () => this.handleToggleChange());

    // 再翻訳ボタンのクリックイベント
    this.refreshBtn.addEventListener('click', () => this.handleRefreshClick());

    // 設定ボタンのクリックイベント
    this.optionsBtn.addEventListener('click', () => this.handleOptionsClick());
  }

  /**
   * 現在の設定を読み込む
   */
  private async loadCurrentSettings(): Promise<void> {
    try {
      const data = await chrome.storage.local.get('settings');
      this.currentSettings = data.settings as AppSettings;
      uiDebugLog('現在の設定を読み込みました', this.currentSettings);
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
      uiDebugLog('設定の読み込みに失敗', error);
    }
  }

  /**
   * 現在のタブ情報を取得
   */
  private async loadCurrentTabInfo(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (currentTab && currentTab.url && currentTab.id) {
        const url = new URL(currentTab.url);
        this.currentDomain = url.hostname;
        this.currentTabId = currentTab.id;

        uiDebugLog('現在のタブ情報', { domain: this.currentDomain, tabId: this.currentTabId });

        // このドメインの翻訳設定を取得
        if (this.currentSettings && this.currentDomain) {
          this.currentDomainSettings =
            this.currentSettings.domains.find(
              (d) => d.domain === this.currentDomain && d.enabled,
            ) || null;

          uiDebugLog('現在のドメイン設定', this.currentDomainSettings);
        }
      }
    } catch (error) {
      console.error('タブ情報の取得に失敗しました:', error);
      uiDebugLog('タブ情報取得エラー', error);
    }
  }

  /**
   * UIを更新
   */
  private updateUI(): void {
    // 設定が存在しない場合は何もしない
    if (!this.currentSettings) return;

    // 翻訳の有効/無効状態を設定
    this.translationToggle.checked = this.currentSettings.active;
    this.updateStatusText(this.currentSettings.active);

    // ドメイン情報を表示
    if (this.currentDomain) {
      this.domainName.textContent = this.currentDomain;

      // このドメインで翻訳が利用可能か表示
      if (this.currentDomainSettings) {
        this.translationAvailable.classList.remove('hidden');

        // GitHubリンクの設定
        const repoUrl = this.getGithubRepoUrl(this.currentDomainSettings.repository);
        this.githubLink.href = repoUrl;
      } else {
        this.translationAvailable.classList.add('hidden');
        this.githubLink.href = '#';
      }
    } else {
      this.domainName.textContent = '未検出';
      this.translationAvailable.classList.add('hidden');
      this.githubLink.href = '#';
    }
  }

  /**
   * 翻訳トグルの変更イベントハンドラ
   */
  private async handleToggleChange(): Promise<void> {
    const active = this.translationToggle.checked;

    // 状態テキストを更新
    this.updateStatusText(active);

    try {
      // バックグラウンドスクリプトに通知
      const response = await chrome.runtime.sendMessage({ action: 'toggleTranslation', active });

      if (response && response.success) {
        // 現在のタブに反映
        if (this.currentTabId) {
          await chrome.tabs.sendMessage(this.currentTabId, {
            action: active ? 'startTranslation' : 'stopTranslation',
          });
        }

        // 設定を更新
        if (this.currentSettings) {
          this.currentSettings.active = active;
        }
      } else {
        console.error('翻訳状態の変更に失敗しました:', response ? response.error : '不明なエラー');
        uiDebugLog('翻訳状態変更エラー', response);

        // エラーが発生した場合は元の状態に戻す
        this.translationToggle.checked = !active;
        this.updateStatusText(!active);
      }
    } catch (error) {
      console.error('翻訳トグル処理中にエラーが発生しました:', error);
      uiDebugLog('翻訳トグルエラー', error);

      // エラーが発生した場合は元の状態に戻す
      this.translationToggle.checked = !active;
      this.updateStatusText(!active);
    }
  }

  /**
   * 再翻訳ボタンのクリックイベントハンドラ
   */
  private async handleRefreshClick(): Promise<void> {
    if (!this.currentTabId) return;

    try {
      await chrome.tabs.sendMessage(this.currentTabId, { action: 'startTranslation' });
      uiDebugLog('再翻訳リクエスト送信');
    } catch (error) {
      console.error('再翻訳リクエスト中にエラーが発生しました:', error);
      uiDebugLog('再翻訳リクエストエラー', error);
    }
  }

  /**
   * 設定ボタンのクリックイベントハンドラ
   */
  private handleOptionsClick(): void {
    chrome.runtime.openOptionsPage();
  }

  /**
   * 状態テキストを更新
   */
  private updateStatusText(active: boolean): void {
    this.statusText.textContent = active ? '有効' : '無効';
    this.statusText.className = 'status-text ' + (active ? 'active' : 'inactive');
  }

  /**
   * GitHubリポジトリURLからリポジトリ情報を取得
   */
  private getGithubRepoUrl(rawUrl: string): string {
    try {
      // 例: https://raw.githubusercontent.com/username/translations/main/github-translations.yml
      // から https://github.com/username/translations を抽出
      const url = new URL(rawUrl);
      const pathParts = url.pathname.split('/');

      if (url.hostname === 'raw.githubusercontent.com' && pathParts.length >= 4) {
        const username = pathParts[1];
        const repoName = pathParts[2];
        return `https://github.com/${username}/${repoName}`;
      }

      return '#';
    } catch (error) {
      console.error('GitHubリポジトリURLの解析に失敗しました:', error);
      uiDebugLog('GitHubリポジトリURL解析エラー', error);
      return '#';
    }
  }
}
