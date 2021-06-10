import ts from "typescript";
import path from "path";
import { parse } from "@babel/parser";
import { Node } from "estree";
import esquery from "esquery";
import { Block } from "./Block";

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
  public code: string;
  public readonly blockList: Block[];
  constructor(code: string) {
    const ast = transformCode2Ast(code);
    const body = esquery(ast as any, "Program > *");
    this.ast = ast as any;
    this.code = code;
    this.blockList = body.map((node) => {
      
      return new Block(node.type, node);
    });
  }
}

export class I18nAst extends Ast {
  constructor(code: string) {
    super(code);
  }
  public convertAll() {
    // let rst = [] as any[];
    let normal = [] as any[];
    let warning = [] as any[];
    this.blockList.forEach((item) => {
      item.formatter
        .convertAll()
        .forEach(({ normalKeyRange, warningKeyRange }) => {
          normal = normal.concat(normalKeyRange);
          warning = warning.concat(warningKeyRange);
        });
    });
    return [{ normalKeyRange: normal, warningKeyRange: warning }];
  }
  public getBlockItemByLine(line: number) {
    return this.blockList.find((block) => {
      const startLine = block.blockBodyNode.loc?.start.line ?? Infinity;
      const endLine = block.blockBodyNode.loc?.end.line ?? Infinity;
      return line >= startLine && line <= endLine;
    });
  }
}
