import { commands, ExtensionContext } from "vscode";
import { EXT_NAME } from "../constants";
import { COMMANDS } from "../constants/commands";
import { Global } from "./Global";
import StatusBar from "./StatusBar";

class Command {
  static init() {
    commands.registerCommand(COMMANDS.switchLocale, async () => {
      const { extensionConfig, currentLocale } = Global;
      const { supportLocales = [] } = extensionConfig ?? {};
      let currentSelect = supportLocales.indexOf(currentLocale);
      currentSelect =
        currentSelect === supportLocales.length - 1
          ? 0 // 超过了重头开始
          : currentSelect + 1;
      Global.currentLocale = supportLocales[currentSelect] ?? supportLocales[0];
      await Global.readLocalesFiles();
      StatusBar.barContext.text = `${EXT_NAME}: ${Global.currentLocale}`;
      StatusBar.barContext.show();
    });
  }
}

export default Command;
