import { ExtensionContext, window, workspace } from "vscode";
import * as glob from "glob";
import * as path from "path";
import * as fe from "fs-extra";
import * as _ from "lodash";
import { loadModuleData } from "../utils";
import StatusBar from "./StatusBar";
import { Log } from "../utils/Log";

interface IExtensionConfig {
  supportLocales: string[];
  [key: string]: any;
}
const configFileName = "sl-i18n-setting.json";
const defaultSetting = {
  supportLocales: ["zh-CN", "en-US"],
} as IExtensionConfig;

export class Global {
  /**
   * 项目路径
   */
  private static _rootPath: string;
  static context: ExtensionContext;
  /**
   * 多语言数据
   */
  static localeData: {
    [key: string]: string;
  };
  static extensionConfig: IExtensionConfig | undefined;
  /**
   * 当前选择的语言
   */
  static currentLocale: string;
  static async init(context: ExtensionContext) {
    this.context = context;
    context.subscriptions.push(
      workspace.onDidChangeWorkspaceFolders((e) => this.updateRootPath())
    );
    context.subscriptions.push(
      window.onDidChangeActiveTextEditor((e) => this.updateRootPath())
    );
    context.subscriptions.push(
      workspace.onDidOpenTextDocument((e) => this.updateRootPath())
    );
    context.subscriptions.push(
      workspace.onDidCloseTextDocument((e) => this.updateRootPath())
    );
    await this.updateRootPath();
    const enable = await this.loadConfig();
    if (enable) {
      this.currentLocale = this.initCurrentLocale();
      this.readLocalesFiles();
      StatusBar.init();
    }
  }

  private static async updateRootPath() {
    const editor = window.activeTextEditor;
    let rootPath = "";

    if (
      !editor ||
      !workspace.workspaceFolders ||
      workspace.workspaceFolders.length === 0
    )
      return;

    const resource = editor?.document.uri;
    if (resource?.scheme === "file") {
      const folder = workspace.getWorkspaceFolder(resource);
      if (folder) {
        rootPath = folder.uri.fsPath;
      }
    }
    if (!rootPath && workspace.rootPath) rootPath = workspace.rootPath;

    if (rootPath && rootPath !== this._rootPath) {
      this._rootPath = rootPath;
    }
  }

  private static async readLocalesFiles() {
    Log.info(`正在搜索所有语言文件路径....`);
    let localesFiles = glob.sync(
      `/src/**/locales/**/${Global.currentLocale}.ts`,
      {
        root: path.resolve(Global._rootPath),
      }
    );
    Log.info(`搜索完成, 正在加载所有语言文件....`);
    const promises = localesFiles.map((filePath: string) => {
      return loadModuleData(filePath, this.context.extensionPath);
    });
    const rst = await Promise.all(promises);
    const allLocaleData = _.reduce(
      rst,
      (all, curr) => {
        return _.assign(all, curr);
      },
      {}
    );
    Log.info(`加载语言文件完毕....`);
    this.localeData = allLocaleData;
  }

  private static async loadConfig() {
    const filepath = `${this._rootPath}/${configFileName}`;
    if (!fe.existsSync(filepath)) {
      Log.info(`🕳 Project Config file "${configFileName}" not exists`);
      return false;
    }

    Log.info(`📦 Packages file "${configFileName}" found`);

    try {
      const raw = await fe.readFile(filepath);
      const data = JSON.parse(raw?.toString());
      this.extensionConfig = data;
    } catch (err) {
      Log.info(`⚠ Error on parsing package file "${configFileName}"`);
      this.extensionConfig = defaultSetting;
    } finally {
      return true;
    }
  }
  /**
   * 初始化选择显示的语言
   */
  private static initCurrentLocale() {
    if (this.extensionConfig) {
      // 默认取第一个
      return this.extensionConfig.supportLocales?.[0];
    }
    return defaultSetting.supportLocales?.[0];
  }
}
