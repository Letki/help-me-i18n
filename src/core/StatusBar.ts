import { StatusBarAlignment, window } from "vscode";
import { Global } from "./Global";

class StatusBar {
    static init() {
        const bar = window.createStatusBarItem(StatusBarAlignment.Right, 1000);
        bar.text = `sl-i18n: ${Global.currentLocale}`;
        bar.show();
    }
}


export default StatusBar;
