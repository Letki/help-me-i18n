import * as ts from "typescript";
import * as path from "path";
import { tsquery } from "@phenomnomnominal/tsquery";
import { Global } from "./Global";
import { Position, Range } from "vscode-languageserver/node";
import { trimQuotation } from "../utils";
import { Ast } from "./Ast";

const getScriptKind = (filename: string) => {
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
class I18n {
  public readonly prefixKey: string;
  public readonly variableId: string;
  private allCallee: ts.Node[];
  private sourceCode: ts.SourceFile;

  constructor(i18nHookCallee: ts.Node, sourceCode: ts.SourceFile) {
    const variableId = tsquery(i18nHookCallee.parent.parent, "Identifier");
    const prefixKey = tsquery(i18nHookCallee.parent, "StringLiteral");
    this.prefixKey = trimQuotation(prefixKey[0]?.getFullText());
    // console.log('prefixKey');
    // console.log(this.prefixKey);
    this.variableId = trimQuotation(variableId[0]?.getFullText());
    // 查找所有i18n调用
    const allCallee = tsquery(
      sourceCode,
      `CallExpression > Identifier[name=${this.variableId}]`
    );
    this.allCallee = allCallee;
    this.sourceCode = sourceCode;
  }

  public convert() {
    const normalKeyRange: any[] = [];
    const warningKeyRange: any[] = [];

    const currentLocaleData = Global.localeData.get(Global.currentLocale) ?? {};
    const setDecorationsKey = (
      localeDataKey: string,
      option: {
        line?: number;
        column?: number;
      }
    ) => {
      // console.log(localeDataKey);
      const range = Range.create(
        Position.create(option.line ?? 1, option.column ?? 1),
        Position.create(option.line ?? 1, option.column ?? 1)
      );
      if (typeof currentLocaleData[localeDataKey] !== "undefined") {
        normalKeyRange.push({
          renderOptions: {
            after: {
              contentText: `${currentLocaleData[localeDataKey]}`,
            },
          },
          range,
        });
      } else {
        warningKeyRange.push({
          renderOptions: {
            after: {
              contentText: `oh!!!!发现未配置字段!!!!`,
            },
          },
          range,
        });
      }
    };
    this.allCallee.forEach((item) => {
      const suffixKeyNode = tsquery(item.parent, "StringLiteral")?.[0];
      const suffixKey = trimQuotation(suffixKeyNode?.getText());
      const { line, character } = this.sourceCode.getLineAndCharacterOfPosition(
        suffixKeyNode?.getEnd()
      );
      // console.log(line);
      // console.log(character);
      setDecorationsKey(
        `${this.prefixKey ? `${this.prefixKey}.` : ""}${suffixKey}`,
        {
          line,
          column: character,
        }
      );
      // console.log(
      // 	Global.localeData.get(Global.currentLocale)?.[`${this.prefixKey}.${suffixKey}`]
      // );
    });
    return { normalKeyRange, warningKeyRange };
  }
}
export class I18nAst extends Ast {
  public readonly i18nList: I18n[];
  constructor(filename: string, code: string) {
    super(filename, code);
    const i18nHookCallee = tsquery(
      this.ast,
      'VariableDeclaration > CallExpression > Identifier[name="useI18n"]'
    );
    this.i18nList = i18nHookCallee.map((calleeItem) => {
      const i18n = new I18n(calleeItem, this.ast);
      return i18n;
    });
  }
  public convertAll() {
    return this.i18nList.map((i18n) => {
      return i18n.convert();
    });
  }
}
