import * as jsyaml from 'js-yaml';
import { uiDebugLog } from '../../utils/debug';
import { AppSettings } from '../../types/settings';
import { OptionsController } from './options-controller';

/**
 * 設定のインポート・エクスポート用コントローラー
 */
export class ImportExportController {
  private optionsController: OptionsController;

  // DOM要素
  private exportBtn!: HTMLButtonElement;
  private importBtn!: HTMLButtonElement;
  private importFile!: HTMLInputElement;

  constructor(optionsController: OptionsController) {
    this.optionsController = optionsController;
  }

  /**
   * 初期化
   */
  public initialize(): void {
    // DOM要素を取得
    this.initializeElements();

    // イベントリスナーの設定
    this.initializeEventListeners();
  }

  /**
   * DOM要素を取得
   */
  private initializeElements(): void {
    this.exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    this.importBtn = document.getElementById('import-btn') as HTMLButtonElement;
    this.importFile = document.getElementById('import-file') as HTMLInputElement;
  }

  /**
   * イベントリスナーの設定
   */
  private initializeEventListeners(): void {
    // エクスポートボタンのクリックイベント
    this.exportBtn.addEventListener('click', this.handleExportClick.bind(this));

    // インポートボタンのクリックイベント
    this.importBtn.addEventListener('click', () => this.importFile.click());

    // ファイル選択イベント
    this.importFile.addEventListener('change', this.handleImportFile.bind(this));
  }

  /**
   * エクスポートボタンのクリックイベントハンドラ
   */
  private handleExportClick(): void {
    try {
      const settings = this.optionsController.getSettings();

      // 設定をYAML形式に変換
      const yamlContent = jsyaml.dump(settings);

      // ダウンロード用のリンクを作成
      const blob = new Blob([yamlContent], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'translation-settings.yml';
      a.click();

      // クリーンアップ
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);

      uiDebugLog('設定をエクスポートしました');
    } catch (error) {
      console.error('設定のエクスポートに失敗しました:', error);
      alert('エラー: 設定のエクスポートに失敗しました。詳細はコンソールを確認してください。');
    }
  }

  /**
   * ファイル選択イベントハンドラ
   */
  private handleImportFile(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;

        // ファイル形式に応じて解析（YAMLまたはJSON）
        let importedSettings: AppSettings;

        if (file.name.endsWith('.json')) {
          importedSettings = JSON.parse(content) as AppSettings;
        } else {
          // YAMLとして解析
          importedSettings = jsyaml.load(content) as AppSettings;
        }

        // 設定の検証
        if (!this.validateSettings(importedSettings)) {
          throw new Error('無効な設定ファイルです。');
        }

        // 設定を保存
        await this.optionsController.saveSettings(importedSettings);

        // UI更新
        this.optionsController.renderDomainList();

        alert('設定のインポートが完了しました。');
        uiDebugLog('設定をインポートしました', importedSettings);
      } catch (error) {
        console.error('設定のインポートに失敗しました:', error);
        alert('エラー: 設定のインポートに失敗しました。詳細はコンソールを確認してください。');
      }
    };

    reader.onerror = () => {
      console.error('ファイルの読み込みに失敗しました。');
      alert('エラー: ファイルの読み込みに失敗しました。');
    };

    reader.readAsText(file);

    // 同じファイルを再度選択できるようにする
    target.value = '';
  }

  /**
   * 設定の検証
   */
  private validateSettings(settings: unknown): settings is AppSettings {
    if (!settings || typeof settings !== 'object') {
      return false;
    }

    // 必須プロパティの確認
    if (
      typeof (settings as AppSettings).active !== 'boolean' ||
      !Array.isArray((settings as AppSettings).domains)
    ) {
      return false;
    }

    // domainsの中身を確認
    for (const domain of (settings as AppSettings).domains) {
      if (!domain.domain || !domain.name || !domain.repository) {
        return false;
      }

      if (typeof domain.enabled !== 'boolean') {
        return false;
      }
    }

    return true;
  }
}
