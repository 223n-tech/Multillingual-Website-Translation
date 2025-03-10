import { uiDebugLog } from '../../utils/debug';
import { DomainSettings } from '../../types/settings';
import { OptionsController } from './options-controller';

/**
 * ドメイン管理コントローラー
 */
export class DomainController {
  // 親コントローラー
  private optionsController: OptionsController;

  // DOM要素
  private domainList!: HTMLDivElement;
  private domainModal!: HTMLDivElement;
  private modalTitle!: HTMLHeadingElement;
  private domainForm!: HTMLFormElement;
  private domainInput!: HTMLInputElement;
  private nameInput!: HTMLInputElement;
  private repositoryInput!: HTMLInputElement;
  private contextMappingInput!: HTMLInputElement;
  private descriptionInput!: HTMLTextAreaElement;
  private domainEnabled!: HTMLInputElement;
  private cancelBtn!: HTMLButtonElement;
  private closeBtn!: HTMLSpanElement;

  // 編集中のドメインのインデックス
  private editingIndex: number = -1;

  constructor(optionsController: OptionsController) {
    this.optionsController = optionsController;
  }

  /**
   * 初期化
   */
  public initialize(): void {
    // DOM要素を取得
    this.initializeElements();

    // イベントリスナーを設定
    this.initializeEventListeners();
  }

  /**
   * ドメインリストを表示
   */
  public renderDomainList(domains: DomainSettings[]): void {
    this.domainList.innerHTML = '';

    if (domains.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-message';
      emptyMessage.textContent =
        'ドメイン設定がありません。「ドメインを追加」ボタンから設定を追加してください。';
      this.domainList.appendChild(emptyMessage);
      return;
    }

    domains.forEach((domain, index) => {
      const domainItem = document.createElement('div');
      domainItem.className = 'domain-item';

      const domainInfo = document.createElement('div');
      domainInfo.className = 'domain-info';

      const domainTitle = document.createElement('div');
      domainTitle.className = 'domain-title';
      domainTitle.textContent = domain.name;

      const statusBadge = document.createElement('span');
      statusBadge.className = `domain-status ${domain.enabled ? 'enabled' : 'disabled'}`;
      statusBadge.textContent = domain.enabled ? '有効' : '無効';
      domainTitle.appendChild(statusBadge);

      const domainUrl = document.createElement('div');
      domainUrl.className = 'domain-url';
      domainUrl.textContent = domain.domain;

      const domainDesc = document.createElement('div');
      domainDesc.className = 'domain-description';
      domainDesc.textContent = domain.description || '説明なし';

      domainInfo.appendChild(domainTitle);
      domainInfo.appendChild(domainUrl);
      domainInfo.appendChild(domainDesc);

      const domainControls = document.createElement('div');
      domainControls.className = 'domain-controls';

      // 翻訳管理ボタンを追加（実装は別途必要）
      const manageEntriesBtn = document.createElement('button');
      manageEntriesBtn.className = 'btn secondary icon';
      manageEntriesBtn.textContent = '翻訳管理';
      manageEntriesBtn.addEventListener('click', () => this.handleManageEntriesClick(index));

      const editBtn = document.createElement('button');
      editBtn.className = 'btn secondary icon';
      editBtn.textContent = '編集';
      editBtn.addEventListener('click', () => this.showEditDomainModal(index));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn danger icon';
      deleteBtn.textContent = '削除';
      deleteBtn.addEventListener('click', () => this.handleDeleteDomain(index));

      domainControls.appendChild(manageEntriesBtn);
      domainControls.appendChild(editBtn);
      domainControls.appendChild(deleteBtn);

      domainItem.appendChild(domainInfo);
      domainItem.appendChild(domainControls);

      this.domainList.appendChild(domainItem);
    });
  }

  /**
   * ドメイン追加モーダルの表示
   */
  public showAddDomainModal(): void {
    this.modalTitle.textContent = 'ドメインを追加';
    this.domainForm.reset();
    this.domainEnabled.checked = true;
    this.editingIndex = -1;
    this.domainModal.style.display = 'block';
  }

  /**
   * DOM要素を取得
   */
  private initializeElements(): void {
    this.domainList = document.getElementById('domain-list') as HTMLDivElement;
    this.domainModal = document.getElementById('domain-modal') as HTMLDivElement;
    this.modalTitle = document.getElementById('modal-title') as HTMLHeadingElement;
    this.domainForm = document.getElementById('domain-form') as HTMLFormElement;
    this.domainInput = document.getElementById('domain-input') as HTMLInputElement;
    this.nameInput = document.getElementById('name-input') as HTMLInputElement;
    this.repositoryInput = document.getElementById('repository-input') as HTMLInputElement;
    this.contextMappingInput = document.getElementById('context-mapping-input') as HTMLInputElement;
    this.descriptionInput = document.getElementById('description-input') as HTMLTextAreaElement;
    this.domainEnabled = document.getElementById('domain-enabled') as HTMLInputElement;
    this.cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
    this.closeBtn = document.querySelector('.close') as HTMLSpanElement;
  }

  /**
   * イベントリスナーを設定
   */
  private initializeEventListeners(): void {
    // ドメインフォームの送信イベント
    this.domainForm.addEventListener('submit', (event) => this.handleSaveDomain(event));

    // キャンセルボタンと閉じるボタンのクリックイベント
    this.cancelBtn.addEventListener('click', () => this.closeDomainModal());
    this.closeBtn.addEventListener('click', () => this.closeDomainModal());

    // モーダルの外側をクリックしたときに閉じる
    window.addEventListener('click', (event) => {
      if (event.target === this.domainModal) {
        this.closeDomainModal();
      }
    });
  }

  /**
   * ドメイン編集モーダルの表示
   */
  private async showEditDomainModal(index: number): Promise<void> {
    try {
      const settings = this.optionsController.getSettings();
      const domain = settings.domains[index];

      this.modalTitle.textContent = 'ドメインを編集';
      this.domainInput.value = domain.domain;
      this.nameInput.value = domain.name;
      this.repositoryInput.value = domain.repository;
      this.contextMappingInput.value = domain.contextMapping || '';
      this.descriptionInput.value = domain.description || '';
      this.domainEnabled.checked = domain.enabled;

      this.editingIndex = index;
      this.domainModal.style.display = 'block';
    } catch (error) {
      console.error('ドメイン設定の読み込みに失敗しました:', error);
      uiDebugLog('ドメイン設定読み込みエラー', error);
    }
  }

  /**
   * ドメインモーダルを閉じる
   */
  private closeDomainModal(): void {
    this.domainModal.style.display = 'none';
  }

  /**
   * ドメイン設定の保存
   */
  private async handleSaveDomain(event: Event): Promise<void> {
    event.preventDefault();

    try {
      const settings = this.optionsController.getSettings();

      const domainData: DomainSettings = {
        domain: this.domainInput.value,
        name: this.nameInput.value,
        repository: this.repositoryInput.value,
        contextMapping: this.contextMappingInput.value || undefined,
        description: this.descriptionInput.value || undefined,
        enabled: this.domainEnabled.checked,
      };

      if (this.editingIndex >= 0) {
        // 既存のドメイン設定を更新
        settings.domains[this.editingIndex] = domainData;
      } else {
        // 新しいドメイン設定を追加
        settings.domains.push(domainData);
      }

      // 設定を保存
      await this.optionsController.saveSettings(settings);

      // UI更新
      this.optionsController.renderDomainList();
      this.closeDomainModal();

      uiDebugLog('ドメイン設定保存完了', domainData);
    } catch (error) {
      console.error('ドメイン設定の保存に失敗しました:', error);
      uiDebugLog('ドメイン設定保存エラー', error);
      alert('エラー: ドメイン設定の保存に失敗しました。詳細はコンソールを確認してください。');
    }
  }

  /**
   * ドメイン設定の削除
   */
  private async handleDeleteDomain(index: number): Promise<void> {
    if (!confirm('このドメイン設定を削除してもよろしいですか？')) {
      return;
    }

    try {
      const settings = this.optionsController.getSettings();

      // ドメイン設定を削除
      settings.domains.splice(index, 1);

      // 設定を保存
      await this.optionsController.saveSettings(settings);

      // UI更新
      this.optionsController.renderDomainList();

      uiDebugLog('ドメイン設定削除完了', index);
    } catch (error) {
      console.error('ドメイン設定の削除に失敗しました:', error);
      uiDebugLog('ドメイン設定削除エラー', error);
      alert('エラー: ドメイン設定の削除に失敗しました。詳細はコンソールを確認してください。');
    }
  }

  /**
   * 翻訳エントリー管理ページに遷移
   */
  private handleManageEntriesClick(index: number): void {
    // 翻訳エントリー管理ページを別タブで開く
    const settings = this.optionsController.getSettings();
    const domain = settings.domains[index];

    chrome.tabs.create({
      url: `entry-manager.html?index=${index}`,
    });
  }
}
