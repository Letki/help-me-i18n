import parser = require("@babel/parser");
import traverse from "@babel/traverse";
import { NodePath } from "@babel/traverse";
import { DecorationOptions, Position, Range, window } from "vscode";
import { VariableDeclaration } from "../../node_modules/@babel/types/lib/index";
import { Global } from "./Global";

const isI18nHookCallee = (path: NodePath<VariableDeclaration>) => {
  return (
    path.node.declarations?.[0].init?.type === "CallExpression" &&
    path.node.declarations?.[0].init.callee.type === "Identifier" &&
    path.node.declarations?.[0].init.callee.name === "useI18n"
  );
};
const getI18nHookCalleeArgs = (path: NodePath<VariableDeclaration>) => {
  if (isI18nHookCallee(path)) {
    // @ts-ignore
    return path.node.declarations?.[0].init.arguments;
  }
  return [];
};
/**
 * 获取hook的变量名
 * @param path
 */
const getI18nInitId = (path: NodePath<VariableDeclaration>) => {
  if (isI18nHookCallee(path)) {
    // @ts-ignore
    const idNode = path.node.declarations?.[0].id;
    // @ts-ignore
    return idNode?.name ?? "";
  }
  return "";
};

export function transformCode2Ast(code: string) {
  return parser.parse(code, {
    sourceType: "module",
    plugins: [
      "jsx",
      "typescript",
      "asyncGenerators",
      "bigInt",
      "classProperties",
      "classPrivateProperties",
      "classPrivateMethods",
      ["decorators", { decoratorsBeforeExport: false }],
      "doExpressions",
      "dynamicImport",
      "exportDefaultFrom",
      "exportNamespaceFrom",
      "functionBind",
      "functionSent",
      "importMeta",
      "logicalAssignment",
      "nullishCoalescingOperator",
      "numericSeparator",
      "objectRestSpread",
      "optionalCatchBinding",
      "optionalChaining",
      ["pipelineOperator", { proposal: "minimal" }],
      "throwExpressions",
      "topLevelAwait",
      "estree",
    ],
  });
}

export const localeTraverse = (documentText: string) => {
  const ast = transformCode2Ast(documentText);
  const keyRange:DecorationOptions[] = []
  const i18nInitData = {} as any
  traverse(ast, {
    VariableDeclaration(path) {
      if (isI18nHookCallee(path)) {
        // const i18nId =
        const prefixKey = getI18nHookCalleeArgs(path)[0]?.value;
        const id = getI18nInitId(path);
        i18nInitData[id] = prefixKey
        path.scope.getBinding(id)?.referencePaths.forEach((path) => {
          // @ts-ignore
          // console.log(path.container.arguments);
          
          // @ts-ignore
          path.container?.arguments?.forEach((element: any) => {
            if (typeof element.value === "string") {
              console.log(
                `${prefixKey}.${element.value}: --->${
                  Global.localeData[`${prefixKey}.${element.value}`]
                }`
              );
              
              keyRange.push({
                renderOptions: {
                    after: {
                        contentText: `${Global.localeData[`${prefixKey}.${element.value}`]}`
                    }
                },
                range:new Range(new Position(element.loc?.end.line - 1 ?? 0, element.loc?.start.end - 1 ?? 0), new Position(element.loc?.end.line - 1 ?? 0, element.loc?.end.column - 1 ?? 0))
              });
            }
          });
        });        
        console.log(
          "🚀 ~ file: extension.ts ~ line 70 ~ VariableDeclaration ~ des",
          prefixKey
        );
      }
    },
  });

  window.activeTextEditor?.setDecorations(Global.disappearDecorationType, keyRange);
};
