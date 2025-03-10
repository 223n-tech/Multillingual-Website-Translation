import './popup.css';
import { uiDebugLog } from '../utils/debug';
import { PopupController } from './popup-controller';

// DOMのロードが完了したらポップアップコントローラを初期化
document.addEventListener('DOMContentLoaded', () => {
  const controller = new PopupController();
  controller.initialize();
});
