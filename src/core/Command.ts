import { commands, ExtensionContext } from "vscode";
import { EXT_NAME } from "../constants";
import { COMMANDS } from "../constants/commands";
import { Global } from "./Global";
import StatusBar from "./StatusBar";
import * as _ from "lodash";
import { Log } from "../utils/Log";

class Command {
  static init() {
    commands.registerCommand(
      COMMANDS.switchLocale,
      _.debounce(async () => {
          Log.info(`切换语言中`);
        const { extensionConfig, currentLocale } = Global;
        const { supportLocales = [] } = extensionConfig ?? {};
        let currentSelect = supportLocales.indexOf(currentLocale);
        currentSelect =
          currentSelect === supportLocales.length - 1
            ? 0 // 超过了重头开始
            : currentSelect + 1;
        Global.currentLocale =
          supportLocales[currentSelect] ?? supportLocales[0];
        await Global.readLocalesFiles();
        Log.info(`切换语言完成`);
        Global.transformActiveEditor();
        StatusBar.barContext.text = `${EXT_NAME}: ${Global.currentLocale}`;
        StatusBar.barContext.show();
      }, 200)
    );
  }
}

export default Command;
