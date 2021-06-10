import esquery from "esquery";
import {
  Node,
  VariableDeclarator,
  Expression,
  SimpleLiteral,
  Identifier,
  CallExpression,
} from "estree";
import { Global } from "./Global";
import { Position, Range } from "vscode-languageserver/node";

class I18n {
  public readonly prefixKey: string;
  public readonly variableId: string;
  private allCallee: CallExpression[];

  constructor(i18nHookCallee: VariableDeclarator, BlockNode: Node) {
    const variableId = esquery(i18nHookCallee.id, "Identifier") as Identifier[];
    const prefixKey = esquery(
      i18nHookCallee.init as Expression,
      "StringLiteral"
    ) as SimpleLiteral[];
    this.prefixKey = (prefixKey[0]?.value as string) ?? "";
    this.variableId = variableId[0]?.name;
    // 查找所有i18n调用
    const allCallee = esquery(
      BlockNode,
	`CallExpression[callee.type='Identifier'][callee.name='${this.variableId}']`

    ) as CallExpression[];
    this.allCallee = allCallee;
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
      const suffixKeyNode = esquery(
        item,
        "StringLiteral"
      )?.[0] as SimpleLiteral;
      const suffixKey = suffixKeyNode?.value;
      const { end = { line: 1, column: 1 } } =
        suffixKeyNode?.loc ?? ({} as any);
      setDecorationsKey(
        `${this.prefixKey ? `${this.prefixKey}.` : ""}${suffixKey}`,
        {
          line: end.line - 1,
          column: end.column - 1,
        }
      );
    });
    return { normalKeyRange, warningKeyRange };
  }
}

export class I18nFormatter {
  public readonly i18nList: I18n[];
  constructor(blockNode: Node) {
    const i18nHookCallee = esquery(
      blockNode,
      'VariableDeclarator:has( CallExpression[callee] > Identifier[name="useI18n"])'
    );
    this.i18nList = i18nHookCallee.map((calleeItem) => {
      const i18n = new I18n(calleeItem as VariableDeclarator, blockNode);
      return i18n;
    });
  }
  public convertAll() {
    return this.i18nList.map((i18n) => {
      return i18n.convert();
    });
  }
}
