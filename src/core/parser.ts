import parser = require("@babel/parser");
import traverse from "@babel/traverse";
import { NodePath } from "@babel/traverse";
import { DecorationOptions, Position, Range, window } from "vscode";
import { VariableDeclaration } from "../../node_modules/@babel/types/lib/index";
import { Global } from "./Global";

const isI18nHookCallee = (path: NodePath<VariableDeclaration>) => {
  return (
    path.node.type === 'VariableDeclaration'&&
    path.node.declarations?.[0].init?.type === "CallExpression" &&
    path.node.declarations?.[0].init.callee.type === "Identifier" &&
    path.node.declarations?.[0].init.callee.name === "useI18n"
  );
};
const getI18nHookCalleeArgs = (path: NodePath<VariableDeclaration>) => {
  if (isI18nHookCallee(path) && path.node.declarations?.[0].init?.type === 'CallExpression' && path.node.declarations?.[0].init?.arguments?.[0].type === 'StringLiteral') {
    return path.node.declarations?.[0].init?.arguments?.[0].value;
  }
  return [];
};
/**
 * 获取hook的变量名
 * @param path
 */
const getI18nInitId = (path: NodePath<VariableDeclaration>) => {
  if (isI18nHookCallee(path) && path.node.declarations?.[0].id.type === 'Identifier' ) {
    const idNode = path.node.declarations?.[0].id;
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
    ],
  });
}

export const localeTraverse = (documentText: string) => {
  const ast = transformCode2Ast(documentText);
  const keyRange: DecorationOptions[] = [];

  const setDecorationsKey = (
    localeDataKey: string,
    option: {
      line?: number;
      column?: number;
    }
  ) => {
    keyRange.push({
      renderOptions: {
        after: {
          contentText: `${Global.localeData[localeDataKey]}`,
        },
      },
      range: new Range(
        new Position((option.line ?? 1) - 1, (option.column ?? 1) - 1),
        new Position((option.line ?? 1) - 1, (option.column ?? 1) - 1)
      ),
    });
  };
  traverse(ast, {
    VariableDeclaration(path) {
      if (isI18nHookCallee(path)) {
        // const i18nId =
        const prefixKey = getI18nHookCalleeArgs(path);
        const id = getI18nInitId(path);
        path.parentPath.traverse({
          CallExpression(callPath) {
            if (
              callPath.node.callee.type === "Identifier" &&
              callPath.node.callee?.name === id
            ) {
              callPath.node.arguments.forEach((element) => {
                if (element.type === "StringLiteral") {
                  console.log(
                    `${prefixKey}.${element.value}: --->${
                      Global.localeData[`${prefixKey}.${element.value}`]
                    }`
                  );
                  setDecorationsKey(`${prefixKey}.${element.value}`, {
                      line: element.loc?.end?.line,
                      column: element.loc?.end?.column
                  });
                }
              });
            }
          },
        //   ObjectExpression(objectPath) {
        //     objectPath.node.properties.forEach((prop) => {
        //       if (
        //         prop.type === "ObjectProperty" &&
        //         prop.value.type === "CallExpression" &&
        //         prop.value.callee.type === "Identifier" &&
        //         prop.value.callee.name === id
        //       ) {
        //         prop.value.arguments.forEach((ar) => {
        //           if (ar.type === "StringLiteral") {
        //             setDecorationsKey(`${prefixKey}.${ar.value}`, {
        //                 line: ar.loc?.end?.line,
        //                 column: ar.loc?.end?.column
        //             });
        //           }
        //         });
        //       }
        //     });
        //   },
        });
      }
    },
  });
  window.activeTextEditor?.setDecorations(
    Global.disappearDecorationType,
    keyRange
  );
};
