import { ExtensionContext, StatusBarAlignment, StatusBarItem, window } from 'vscode';
import { EXT_NAME } from '../constants';
import { COMMANDS } from '../constants/commands';
import { Global } from './Global';

class StatusBar {
  static barContext: StatusBarItem;
  static init() {
    const bar = window.createStatusBarItem(StatusBarAlignment.Right, 1000);
    bar.text = `$(notebook-state-success)${EXT_NAME}: ${Global.currentLocale}`;
    bar.command = COMMANDS.switchLocale;
    bar.tooltip = '点击以切换展示语言';
    bar.show();
    this.barContext = bar;
  }
}

export default StatusBar;
