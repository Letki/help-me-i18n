import * as path from "path";
import * as child_process from "child_process";
import { Log } from "../utils/Log";

export const loadModuleData = async (
  filePath: string,
  extensionPath: string
) => {
  const compilerOptions = {
    module: "commonjs",
    removeComments: true,
    strict: false,
    importHelpers: false,
    allowJs: true,
  };
  const loader = path.resolve(extensionPath!, "assets/loader.js");
  const options = JSON.stringify(compilerOptions).replace(/"/g, '\\"');
  return new Promise<any>((resolve, reject) => {
    const cmd = `ts-node --transpile-only --compiler-options "${options}" "${loader}" "${filePath}"`;
    // console.log(`[i18n-ally] spawn: ${cmd}`);
    child_process.exec(cmd, (err, stdout) => {
      if (err) return reject(err);
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (e) {
        reject(e);
      }
    });
  });
};

