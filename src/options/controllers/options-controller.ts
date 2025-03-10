import { uiDebugLog } from '../../utils/debug';
import { AppSettings, DomainSettings, DEFAULT_SETTINGS } from '../../types/settings';
import { DomainController } from './domain-controller';
import { ImportExportController } from './import-export-controller';

/**
 * オプションページ全体のコントローラー
 */
export class OptionsController {
  // DOM要素
  private translationActive!: HTMLInputElement;
  private activeStatus!: HTMLSpanElement;
  private domainList!: HTMLDivElement;
  private addDomainBtn!: HTMLButtonElement;

  // 現在の設定
  private currentSettings: AppSettings = DEFAULT_SETTINGS;

  // サブコントローラー
  private domainController: DomainController;
  private importExportController: ImportExportController;

  constructor() {
    this.domainController = new DomainController(this);
    this.importExportController = new ImportExportController(this);
  }

  /**
   * 初期化
   */
  public async initialize(): Promise<void> {
    // DOM要素を取得
    this.initializeElements();

    // イベントリスナーの設定
    this.initializeEventListeners();

    // 設定を読み込む
    await this.loadSettings();

    // サブコントローラーの初期化
    this.domainController.initialize();
    this.importExportController.initialize();
  }

  /**
   * 現在の設定を取得
   */
  public getSettings(): AppSettings {
    return this.currentSettings;
  }

  /**
   * 設定を更新
   */
  public async saveSettings(settings: AppSettings): Promise<void> {
    try {
      this.currentSettings = settings;
      await chrome.storage.local.set({ settings });
      uiDebugLog('設定を保存しました');
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
      throw error;
    }
  }

  /**
   * ドメインリストを更新
   */
  public renderDomainList(): void {
    this.domainController.renderDomainList(this.currentSettings.domains);
  }

  /**
   * DOM要素を取得
   */
  private initializeElements(): void {
    this.translationActive = document.getElementById('translation-active') as HTMLInputElement;
    this.activeStatus = document.getElementById('active-status') as HTMLSpanElement;
    this.domainList = document.getElementById('domain-list') as HTMLDivElement;
    this.addDomainBtn = document.getElementById('add-domain-btn') as HTMLButtonElement;
  }

  /**
   * イベントリスナーの設定
   */
  private initializeEventListeners(): void {
    // 翻訳の有効/無効を切り替え
    this.translationActive.addEventListener('change', this.handleToggleTranslation.bind(this));

    // ドメイン追加ボタン
    this.addDomainBtn.addEventListener('click', () => this.domainController.showAddDomainModal());
  }

  /**
   * 設定の読み込み
   */
  private async loadSettings(): Promise<void> {
    try {
      const data = await chrome.storage.local.get('settings');

      if (!data.settings) {
        console.warn('設定が見つかりません。デフォルト設定を使用します。');
        this.currentSettings = DEFAULT_SETTINGS;
      } else {
        this.currentSettings = data.settings as AppSettings;
      }

      uiDebugLog('設定読み込み完了', this.currentSettings);

      // 翻訳の有効/無効状態を設定
      this.translationActive.checked = this.currentSettings.active;
      this.updateActiveStatus(this.currentSettings.active);

      // ドメインリストを表示
      this.renderDomainList();
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
      uiDebugLog('設定読み込みエラー', error);

      // エラー時はデフォルト設定を使用
      this.currentSettings = DEFAULT_SETTINGS;
    }
  }

  /**
   * 翻訳の有効/無効を切り替え
   */
  private async handleToggleTranslation(): Promise<void> {
    try {
      const active = this.translationActive.checked;
      this.updateActiveStatus(active);

      // 設定を更新
      this.currentSettings.active = active;
      await this.saveSettings(this.currentSettings);

      // バックグラウンドスクリプトに通知
      chrome.runtime.sendMessage({ action: 'toggleTranslation', active });

      uiDebugLog(`翻訳状態を ${active ? '有効' : '無効'} に設定しました`);
    } catch (error) {
      console.error('翻訳状態の変更に失敗しました:', error);
      uiDebugLog('翻訳状態変更エラー', error);

      // エラーが発生した場合は元の状態に戻す
      this.translationActive.checked = !this.translationActive.checked;
      this.updateActiveStatus(this.translationActive.checked);
    }
  }

  /**
   * アクティブ状態のテキストを更新
   */
  private updateActiveStatus(active: boolean): void {
    this.activeStatus.textContent = active ? '有効' : '無効';
    this.activeStatus.style.color = active ? '#28a745' : '#d73a49';
  }
}
