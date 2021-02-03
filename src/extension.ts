import {
  commands,
  ExtensionContext,
  window,
  workspace,
  languages,
  TextDocument,
  Position,
  CancellationToken,
  Hover,
  DocumentSemanticTokensProvider,
  SemanticTokens,
  ProviderResult,
  ReferenceContext,
  Range,
  CompletionItem,
  CompletionItemKind,
} from "vscode";
import * as path from "path";
import { Global } from "./core/Global";
import * as _ from "lodash";
import { localeTraverse, transformCode2Ast } from "./core/Parser";
import { Log } from "./utils/Log";

function provideHover(
  document: TextDocument,
  position: Position,
  token: CancellationToken
) {
  const documentText = document.getText();
  const reg = /useI18n\(\S*\)/g;
  const localeKeyReg = /(["'])(?:(?=(\\?))\2.)*?\1/;
  const removeCamelReg = /["']/g;

  const originI18n =
    documentText.match(reg)?.map((origin) => {
      return origin.match(localeKeyReg)?.[0]?.replace(removeCamelReg, "");
    }) ?? [];

  const word = document
    .getText(document.getWordRangeAtPosition(position, localeKeyReg))
    .replace(removeCamelReg, "");
  const localeRst = _.compact(
    originI18n.map((i18nKey) => {
      return Global.localeData[`${i18nKey}.${word}`];
    })
  );

  if (localeRst.length > 0) {
    let hoverText = "";
    localeRst.forEach((data, index) => {
      hoverText =
        hoverText + `${index !== 0 ? "\n" : ""}i18n zh-CN -> : ${data}`;
    });
    return new Hover(hoverText);
  }
}

export async function activate(context: ExtensionContext) {
  console.log('Congratulations, your extension "sl-i18n-tools" is now active!');
  await Global.init(context);
  context.subscriptions.push(
    languages.registerHoverProvider(["typescript", "typescriptreact"], {
      provideHover,
    })
  );

  context.subscriptions.push(
    window.onDidChangeActiveTextEditor((editor) => {
      const documentText = editor?.document.getText();
      if (documentText) {
        localeTraverse(documentText);
        // Log.info(
        //   JSON.stringify(transformCode2Ast(documentText), undefined, "\t")
        // );
      }
    })
    );
    // context.subscriptions.push(languages.registerReferenceProvider('typescriptreact', {
    //   provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken) {
    //     return [new CompletionItem()]
    //   }
    // }))
}

export function deactivate() {}
