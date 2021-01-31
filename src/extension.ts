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
} from "vscode";
import * as path from "path";
import { Global } from "./core/Global";
import * as _ from "lodash";
import { transformCode2Ast } from "./core/Parser";
import { Log } from "./utils/Log";
import traverse from "@babel/traverse";

function provideHover(
  document: TextDocument,
  position: Position,
  token: CancellationToken
) {
  const fileName = document.fileName;
  const documentText = document.getText();
  const reg = /useI18n\(\S*\)/g;
  const localeKeyReg = /(["'])(?:(?=(\\?))\2.)*?\1/;
  const removeCamelReg = /["']/g;
  // const ast = transformCode2Ast(documentText)
//   const visitor = {
//     VariableDeclarator(path:any)
//     {
//       console.log("🚀 ~ file: extension.ts ~ line 37 ~ path", JSON.stringify(path))
//         const func_name = path.node.id.name;
//         Log.info(func_name)
//         console.log("🚀 ~ file: extension.ts ~ line 40 ~ func_name", func_name)
//         const binding = path.scope.getBinding(func_name);
//     },
// }

//   traverse(ast, visitor);
//   Log.info(JSON.stringify(transformCode2Ast(documentText), undefined, '\t'))
  const originI18n =
    documentText.match(reg)?.map((origin) => {
      return origin.match(localeKeyReg)?.[0]?.replace(removeCamelReg, "");
    }) ?? [];
  console.log(
    "🚀 ~ file: extension.ts ~ line 32 ~ originI18n ~ originI18n",
    originI18n
  );

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
  // languages.registerDeclarationProvider(["typescript", "typescriptreact"], (document: TextDocument, position: Position, token: CancellationToken) => {
  //   const rst = languages.match('', document);
  //   console.log("🚀 ~ file: extension.ts ~ line 37 ~ languages.registerDeclarationProvider ~ rst", rst)
  //   console.log(document, position, token)
  // })
  await Global.init(context);
  context.subscriptions.push(
    languages.registerHoverProvider(["typescript", "typescriptreact"], {
      provideHover,
    })
  );
}

export function deactivate() {}
