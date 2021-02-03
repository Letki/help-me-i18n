import { StatusBarAlignment, window } from "vscode";
import { EXT_NAME } from "../constants";
import { Global } from "./Global";

class StatusBar {
    static init() {
        const bar = window.createStatusBarItem(StatusBarAlignment.Right, 1000);
        bar.text = `${EXT_NAME}: ${Global.currentLocale}`;
        bar.show();
    }
}


export default StatusBar;
