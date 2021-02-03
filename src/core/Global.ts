import {
  ExtensionContext,
  languages,
  TextEditorDecorationType,
  window,
  workspace,
} from "vscode";
import * as glob from "glob";
import * as path from "path";
import * as fe from "fs-extra";
import * as _ from "lodash";
import * as flat from "flat";
import { loadModuleData } from "../utils";
import StatusBar from "./StatusBar";
import { Log } from "../utils/Log";
import { localeTraverse } from "./Parser";
import { EXT_NAME, SETTING_NAME } from "../constants";
import * as chokidar from "chokidar";
import ProvideHover from "./ProvideHover";

interface IExtensionConfig {
  supportLocales: string[];
  hookMatch: string[];
  localePath: string | string[];
  varKeyMatch: string[];
  enable: boolean;
  [key: string]: any;
}
const configFileName = "sl-i18n-setting.json";
const defaultSetting = {
  // 默认关闭
  enable: false,
  supportLocales: ["zh-CN", "en-US"],
  hookMatch: ["useI18n, useTranslation", "useIntl"],
  localePath: "/src/**/locales/**/{locale}.ts",
  varKeyMatch: ["t"],
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
  static disappearDecorationType: TextEditorDecorationType;

  static async init(context: ExtensionContext) {
    this.context = context;
    context.subscriptions.push(
      workspace.onDidChangeWorkspaceFolders((e) => this.updateRootPath())
    );
    /**
     * 监听保存文件时重新获取字段值
     */
    context.subscriptions.push(
      workspace.onDidSaveTextDocument((text) => localeTraverse(text.getText()))
    );
    await this.updateRootPath();
    const enable = await this.loadConfig();
    if (enable) {
      this.currentLocale = this.initCurrentLocale();
      StatusBar.init();
      await this.readLocalesFiles();
      this.initDecorationType();
      // 对当前的编辑器进行i8n转换
      this.transformActiveEditor();
      ProvideHover.init(context);

      context.subscriptions.push(
        window.onDidChangeActiveTextEditor((editor) => {
          const documentText = editor?.document.getText();
          if (documentText) {
            localeTraverse(documentText);
          }
        })
      );
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
    const { extensionConfig } = Global;
    Log.info(`正在搜索所有语言文件路径....`);
    let localesFiles = [] as string[];
    if (Array.isArray(extensionConfig?.localePath)) {
      extensionConfig?.localePath.forEach((localeFilePath) => {
        const list = glob.sync(
          _.replace(localeFilePath ?? "", "{locale}", Global.currentLocale),
          {
            root: path.resolve(Global._rootPath),
          }
        );
        localesFiles = localesFiles.concat(list);
      });
    } else {
      localesFiles = glob.sync(
        _.replace(
          extensionConfig?.localePath ?? "",
          "{locale}",
          Global.currentLocale
        ),
        {
          root: path.resolve(Global._rootPath),
        }
      );
    }
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
    this.localeData = flat(allLocaleData);
    Log.info(`开始监听语言文件变化....`);
    // 开始监听语言文件变化
    this.watchFile(localesFiles);
  }

  private static async loadConfig() {
    const config = {} as IExtensionConfig;
    Object.keys(defaultSetting).forEach((key) => {
      config[key] =
        workspace.getConfiguration(SETTING_NAME).get(key) ?? defaultSetting[key];
    });
    this.extensionConfig = config;
    return config.enable;
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

  private static initDecorationType() {
    const disappearDecorationType = window.createTextEditorDecorationType({
      textDecoration: "", // a hack to inject custom style
      after: {
        backgroundColor: "#434343",
        color: "#C0C4CC",
        border: "0.2px solid #bfbfbf",
        margin: "0 0 0 6px",
      },
    });
    this.disappearDecorationType = disappearDecorationType;
  }

  static watchFile(filePath: string | string[]) {
    const watcher = chokidar.watch(filePath);
    const changeCallback = _.debounce(async (path) => {
      Log.info(`Locale File ${path} has been changed`);
      // 读取文件重新塞回去
      const newData = await loadModuleData(path, this.context.extensionPath);
      this.localeData = _.assign(this.localeData, flat(newData));
      // 触发当前活动编辑器重新检查
      if (window.activeTextEditor?.document.uri.path === path) return;
      this.transformActiveEditor();
    }, 300);
    watcher.on("change", changeCallback);
  }

  /**
   * 对当前的编辑器进行i8n转换
   */
  static transformActiveEditor() {
    window.activeTextEditor?.document.getText() &&
      localeTraverse(window.activeTextEditor?.document.getText());
  }
}
