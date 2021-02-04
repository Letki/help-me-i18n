import { SETTING_NAME } from ".";
import * as _ from "lodash";
import { cwd } from "process";

export const COMMANDS = _.mapValues(
  {
    switchLocale: `switch-locale`,
  },
  // 自动加入前缀
  (cmd) => `${SETTING_NAME}.${cmd}`
);
