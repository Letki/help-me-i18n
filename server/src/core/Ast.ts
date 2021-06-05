import ts from "typescript";
import path from "path";
import { parse } from "@babel/parser";
import { Node } from 'estree';

export const getScriptKind = (filename: string) => {
  const ext = path.extname(filename);
  switch (ext) {
    case ".ts":
      return ts.ScriptKind.TS;
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".jsx":
      return ts.ScriptKind.JSX;
    default:
      return ts.ScriptKind.JS;
  }
};

/**
 * 将代码转换为ast
 * @param code
 */
export function transformCode2Ast(code: string) {
  return parse(code, {
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
export class Ast {
  // public hookRst: any;
  public ast: Node;
  public filename: string;
  public code: string;
  constructor(filename: string, code: string) {
    const ast = transformCode2Ast(code);
    this.ast = ast as any;
    this.filename = filename;
    this.code = code;
  }
}
