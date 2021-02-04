import { commands, ExtensionContext, window, workspace, languages, TextDocument, Position, CancellationToken, Hover, StatusBarAlignment } from 'vscode';
import * as _ from 'lodash';
import { Global } from './Global';

function provideHover(document: TextDocument, position: Position, token: CancellationToken) {
  const documentText = document.getText();
  const reg = /useI18n\(\S*\)/g;
  const localeKeyReg = /(["'])(?:(?=(\\?))\2.)*?\1/;
  const removeCamelReg = /["']/g;

  const originI18n =
    documentText.match(reg)?.map((origin) => {
      return origin.match(localeKeyReg)?.[0]?.replace(removeCamelReg, '');
    }) ?? [];

  const word = document.getText(document.getWordRangeAtPosition(position, localeKeyReg)).replace(removeCamelReg, '');
  const localeRst = _.compact(
    originI18n.map((i18nKey) => {
      return Global.localeData[`${i18nKey}.${word}`];
    }),
  );

  if (localeRst.length > 0) {
    let hoverText = '';
    localeRst.forEach((data, index) => {
      hoverText = hoverText + `${index !== 0 ? '\n' : ''}i18n zh-CN -> : ${data}`;
    });
    return new Hover(hoverText);
  }
}

class ProvideHover {
  static init(context: ExtensionContext) {
    context.subscriptions.push(
      languages.registerHoverProvider(['typescript', 'typescriptreact'], {
        provideHover,
      }),
    );
  }
}

export default ProvideHover;
