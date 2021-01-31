import parser = require("@babel/parser");
import traverse = require("@babel/traverse");

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