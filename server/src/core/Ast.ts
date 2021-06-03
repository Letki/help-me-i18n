import * as ts from "typescript";
import * as path from "path";

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
export class Ast {
  // public hookRst: any;
  public ast: ts.SourceFile;
  public filename: string;
  public code: string;
  constructor(filename: string, code: string) {
    const ast = ts.createSourceFile(
      filename,
      code,
      ts.ScriptTarget.Latest,
      true,
      getScriptKind(filename)
    );
    this.ast = ast;
    this.filename = filename;
    this.code = code;
  }
}
