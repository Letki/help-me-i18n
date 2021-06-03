import * as path from "path";
import * as child_process from "child_process";

export const loadModuleData = async (filePath: string) => {
  const compilerOptions = {
    module: "commonjs",
    removeComments: true,
    strict: false,
    importHelpers: false,
    allowJs: true,
  };
  const loader = path.resolve(__dirname, "../../assets/loader.js");
  const tsNode = path.resolve(
    __dirname,
    "../../node_modules/ts-node/dist/bin.js"
  );
  const options = JSON.stringify(compilerOptions).replace(/"/g, '\\"');
  return new Promise<any>((resolve, reject) => {
    const cmd = `node "${tsNode}" --transpile-only --compiler-options "${options}" "${loader}" "${filePath}"`;
    child_process.exec(cmd, (err, stdout) => {
      if (err) {
        console.log(err.message);
        return reject(err);
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (e) {
        console.log(e.message);
        reject(e);
      }
    });
  });
};

/** 去除字符串前后引号 */
const reg = /^["|'](.*)["|']$/g;
export const trimQuotation = (str?: string) => {
  if (!str) return "";
  return str.replace(reg, "$1");
};

export const replacePrefix = (prefix: string[], key: string) => {
  return prefix.reduce((prev, curr) => {
    return prev.replace(`${curr}.`, "");
  }, key);
};
