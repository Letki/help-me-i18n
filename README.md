# HELP ME I18n README
此插件可帮助大家在需要多语言的项目将难以识别的多语言字段key转变为对应的语言值展示在代码中. 方便我们浏览代码!

## 功能
#### 实时展示字段值
![](https://github.com/Letki/help-me-i18n/blob/master/screenshot/decoration.png?raw=true)

#### 切换语言, 查看不同语言的字段值
![](https://github.com/Letki/help-me-i18n/blob/master/screenshot/switch-locale.gif?raw=true)
#### 未被配置的字段高亮提醒
![](https://github.com/Letki/help-me-i18n/blob/master/screenshot/none-key.png?raw=true)
## 配置
在vscode的setting.json中进行配置.此插件默认**关闭**

下面配置都需要以**help-me-i18n**.开头进行配置

配置项 | 说明 | 类型 | 默认值
---- | --- | --- | ---
enable | 是否打开插件 | boolean | false
supportLocales |  支持的语言列表, 用于切换展示语言 | string[] | ['zh-CN', 'en-US']
hookMatch |  在react中使用的hook名字 | string[] | ['useI18n, useTranslation', 'useIntl']
localePath |  查找语言资源文件的路径 | string or string[] | /src/\*\*/locales/\*\*/{locale}.ts
varKeyMatch | 如果hook导出的是个对象,就需要配置 这个解构的变量名 | string[] | ['t']