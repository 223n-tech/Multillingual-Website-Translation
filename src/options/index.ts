import './options.css';
import { uiDebugLog } from '../utils/debug';
import { OptionsController } from './controllers/options-controller';

// DOMのロードが完了したらオプションコントローラを初期化
document.addEventListener('DOMContentLoaded', () => {
  const controller = new OptionsController();
  controller.initialize();
});
