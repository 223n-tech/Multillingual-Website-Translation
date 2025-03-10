import { AppSettings, DEFAULT_SETTINGS, DomainSettings } from '../../types/settings';
import { debugLog } from '../../utils/debug';

/**
 * 設定管理サービス
 */
export class SettingsService {
  /**
   * デフォルト設定を初期化
   */
  public async initializeDefaultSettings(): Promise<void> {
    try {
      await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
      debugLog('デフォルト設定の初期化完了');
    } catch (error) {
      console.error('デフォルト設定の初期化に失敗:', error);
    }
  }

  /**
   * 設定を取得
   */
  public async getSettings(): Promise<AppSettings> {
    try {
      const data = await chrome.storage.local.get('settings');
      if (!data.settings) {
        debugLog('設定が見つかりません、デフォルト値を使用します');
        return DEFAULT_SETTINGS;
      }
      return data.settings as AppSettings;
    } catch (error) {
      console.error('設定の取得に失敗:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * 設定を保存
   */
  public async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await chrome.storage.local.set({ settings });
      debugLog('設定を保存しました');
    } catch (error) {
      console.error('設定の保存に失敗:', error);
      throw error;
    }
  }

  /**
   * 翻訳の有効/無効を切り替え
   */
  public async toggleTranslation(active: boolean): Promise<void> {
    try {
      const settings = await this.getSettings();
      settings.active = active;
      await this.saveSettings(settings);
      debugLog(`翻訳状態を ${active ? '有効' : '無効'} に設定しました`);
    } catch (error) {
      console.error('翻訳状態の変更に失敗:', error);
      throw error;
    }
  }

  /**
   * ドメイン設定を取得
   */
  public async getDomainSettings(domain: string): Promise<DomainSettings | null> {
    try {
      const settings = await this.getSettings();

      // GitHub Raw コンテンツの特殊処理
      if (domain === 'raw.githubusercontent.com') {
        const githubSettings = settings.domains.find((d) => d.domain === 'github.com' && d.enabled);
        if (githubSettings) {
          debugLog('raw.githubusercontent.com に対して github.com の設定を使用');
          return githubSettings;
        }
      }

      const domainSettings = settings.domains.find((d) => d.domain === domain && d.enabled);
      return domainSettings || null;
    } catch (error) {
      console.error(`ドメイン ${domain} の設定取得に失敗:`, error);
      return null;
    }
  }

  /**
   * ドメイン設定を追加
   */
  public async addDomainSettings(domainSettings: DomainSettings): Promise<void> {
    try {
      const settings = await this.getSettings();
      settings.domains.push(domainSettings);
      await this.saveSettings(settings);
      debugLog(`ドメイン ${domainSettings.domain} の設定を追加しました`);
    } catch (error) {
      console.error('ドメイン設定の追加に失敗:', error);
      throw error;
    }
  }

  /**
   * ドメイン設定を更新
   */
  public async updateDomainSettings(index: number, domainSettings: DomainSettings): Promise<void> {
    try {
      const settings = await this.getSettings();

      if (index < 0 || index >= settings.domains.length) {
        throw new Error(`無効なインデックス: ${index}`);
      }

      settings.domains[index] = domainSettings;
      await this.saveSettings(settings);
      debugLog(`ドメイン ${domainSettings.domain} の設定を更新しました`);
    } catch (error) {
      console.error('ドメイン設定の更新に失敗:', error);
      throw error;
    }
  }

  /**
   * ドメイン設定を削除
   */
  public async deleteDomainSettings(index: number): Promise<void> {
    try {
      const settings = await this.getSettings();

      if (index < 0 || index >= settings.domains.length) {
        throw new Error(`無効なインデックス: ${index}`);
      }

      const domainName = settings.domains[index].domain;
      settings.domains.splice(index, 1);
      await this.saveSettings(settings);
      debugLog(`ドメイン ${domainName} の設定を削除しました`);
    } catch (error) {
      console.error('ドメイン設定の削除に失敗:', error);
      throw error;
    }
  }
}
