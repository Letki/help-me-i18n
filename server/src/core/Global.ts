import chokidar from 'chokidar';
import path from 'path';
import { InitializeParams, _Connection } from 'vscode-languageserver/node';
import glob from 'glob';
import _ from 'lodash';
import flat from 'flat';
import { loadModuleData } from '../utils';

export interface IExtensionConfig {
	supportLocales: string[];
	hookMatch: string[];
	localePath: string | string[];
	varKeyMatch: string[];
	enable: boolean;
	[key: string]: any;
}

export const defaultSettings: IExtensionConfig = {
	// 默认关闭
	enable: true,
	supportLocales: ['zh-CN', 'en-US'],
	hookMatch: ['useI18n, useTranslation', 'useIntl'],
	localePath: '/src/**/locales/**/{locale}.ts',
	varKeyMatch: ['t'],
};

export class Global {
	/**
	 * 项目路径
	 */
	private static _rootPath: string;
	/**
	 * 多语言数据
	 */
	static localeData = new Map<
		string,
		{
			[key: string]: string;
		}
	>();
	static extensionConfig: IExtensionConfig | undefined;
	/**
	 * 当前选择的语言
	 */
	static currentLocale: string;

	/**
	 * 文件监听上下文 用于删除监听
	 */
	static fileWatchContext: chokidar.FSWatcher | undefined;
	/**
	 * 加载语言资源文件loading
	 */
	static localeLoading = false;
	static async init(params: InitializeParams) {
		// console.log(customSetting);
		this._rootPath = path.resolve(
			params.workspaceFolders?.[0]?.uri?.replace('file://', '') ?? ''
		);
		// this.extensionConfig = Object.assign({}, defaultSetting, customSetting);
	}
	/**
	 * 读取语言源文件
	 */
	static async readLocalesFiles() {
		if (this.localeData.get(Global.currentLocale)) {
			return Promise.resolve();
		}
		const { extensionConfig } = Global;
		console.log(`正在搜索所有语言文件路径....`);
		this.localeLoading = true;
		let localesFiles = [] as string[];
		if (Array.isArray(extensionConfig?.localePath)) {
			extensionConfig?.localePath.forEach((localeFilePath) => {
				const list = glob.sync(
					_.replace(localeFilePath ?? '', '{locale}', Global.currentLocale),
					{
						root: path.resolve(Global._rootPath),
					}
				);
				localesFiles = localesFiles.concat(list);
			});
		} else {
			localesFiles = glob.sync(
				_.replace(extensionConfig?.localePath ?? '', '{locale}', Global.currentLocale),
				{
					root: path.resolve(Global._rootPath),
				}
			);
		}
		console.log(`搜索完成, 正在加载所有语言文件....`);
		const promises = localesFiles.map((filePath: string) => {
			return loadModuleData(filePath);
		});
		const rst = await Promise.all(promises);
		const localePathMapping = {} as any;
		const allLocaleData = _.reduce(
			rst,
			(all, curr, index) => {
				localePathMapping[localesFiles[index]] = flat(curr);
				return _.assign(all, curr);
			},
			{}
		);
		this.localeLoading = false;
		console.log(`加载语言文件完毕....`);
		this.localeData.set(Global.currentLocale, flat(allLocaleData));
		// this.localePathMapping = localePathMapping;
		console.log(`开始监听语言文件变化....`);
		//

		// 开始监听语言文件变化
		// this.watchFile(localesFiles);
	}
	static async loadConfig(customSetting: IExtensionConfig) {
		const config = {} as IExtensionConfig;
		Object.keys(defaultSettings).forEach((key) => {
			config[key] = customSetting[key] ?? defaultSettings[key];
		});
		this.extensionConfig = config;
		console.log(JSON.stringify(config));
		this.currentLocale = config.supportLocales[0];
		await this.readLocalesFiles();
		return config.enable;
	}
}
