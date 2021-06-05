/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  TextDocumentContentChangeEvent,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import startsWith from "lodash/startsWith";
import { Ast } from "./core/Ast";
import { defaultSettings, Global, IExtensionConfig } from "./core/Global";
import { SETTING_NAME } from "./constants";
import { I18nAst } from "./core/I18nAst";
import esquery from "esquery";
import { replacePrefix } from './utils';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
    },
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }
  Global.init(params);
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log("Workspace folder change event received.");
    });
  }
});


let globalSettings: IExtensionConfig = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<IExtensionConfig>> = new Map();

connection.onDidChangeConfiguration((change) => {
  // console.log(change);
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = <IExtensionConfig>(
      (change.settings.languageServerExample || defaultSettings)
    );
  }

  // Revalidate all open text documents
  documents.all().forEach(formatDocumentI18n);
});

function getDocumentSettings(resource: string): Thenable<IExtensionConfig> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: SETTING_NAME,
    });
    documentSettings.set(resource, result);
  }
  return result;
}

// Only keep settings for open documents
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(async (change) => {
  // console.log(change);
  formatDocumentI18n(change.document);
});

// 获取编辑行以展示代码提示
connection.onNotification(
  "i18n/getCompletion",
  (params: {
    lineText: false | string;
    code: string;
    contentChanges: TextDocumentContentChangeEvent[];
  }) => {
    const ast = new I18nAst("", params.code);
    const { lineText, contentChanges = [] } = params;
    const { range } = contentChanges[0] as any;
    console.log(ast.i18nList[0]);
    if (lineText) {
      console.log("params.lineText");
      const lineAst = new Ast("", lineText);
      let rst = esquery(
        lineAst.ast,
        `CallExpression > Identifier[name="${ast.i18nList[0]?.variableId}"]`
      );
      rst = esquery(lineAst.ast, `StringLiteral`);
      if (rst.length !== 0) {
        connection.onCompletion(
          async (_textDocumentPosition: TextDocumentPositionParams) => {
            // console.log(_textDocumentPosition);
            // 请求获取当前编辑中的文档内容
            connection.sendNotification("i18n/getCurrentDocumentText", {
              uri: _textDocumentPosition.textDocument.uri.toString(),
            });
            return new Promise((resolve) => {
              // 响应发回来的当前编辑中的文档内容
              connection.onNotification(
                "i18n/currentDocumentText",
                ({ code }) => {
                  let ast = fileAstMap.get(
                    _textDocumentPosition.textDocument.uri.toString()
                  );
                  if (!ast) {
                    ast = new I18nAst(
                      _textDocumentPosition.textDocument.uri.toString(),
                      code
                    );
                  }
                  const prefixKeyList = ast.i18nList
                    .filter((item) => {
                      return !!item.prefixKey;
                    })
                    .map((it) => it.prefixKey);
                  let allI18nKey;
                  if (prefixKeyList.length > 0) {
                    allI18nKey = Object.keys(
                      Global.localeData.get(Global.currentLocale) ?? {}
                    ).filter((item) => {
                      return prefixKeyList.some((prefix) =>
                        startsWith(item, prefix)
                      );
                    });
                  } else {
                    allI18nKey = Object.keys(
                      Global.localeData.get(Global.currentLocale) ?? {}
                    );
                  }
                  resolve(
                    allI18nKey.map((item) => {
                      return {
                        label: replacePrefix(prefixKeyList, item),
                        kind: CompletionItemKind.Enum,
                        data: replacePrefix(prefixKeyList, item),
                        documentation: Global.localeData.get(Global.currentLocale)?.[item]
                      };
                    })
                  );
                }
              );
            });
          }
        );
      } else {
        connection.onCompletion(() => []);
      }
      console.log(params.lineText);
    }
  }
);
const fileAstMap = new Map<string, I18nAst>();
let once = true;
/** i18n 转换方法 */
async function formatDocumentI18n(textDocument: TextDocument): Promise<void> {
  // In this simple example we get the settings for every validate run.
  if (once) {
    const settings = await getDocumentSettings(textDocument.uri);
    await Global.loadConfig(settings);
    once = false;
  }
  const ast = new I18nAst(textDocument.uri.toString(), textDocument.getText());
  const rst = ast.convertAll();
  connection.sendNotification("i18n/convert", {
    uri: textDocument.uri,
    range: rst,
  });
  fileAstMap.set(ast.filename, ast);
}

connection.onNotification("i18n/needConvert", (params) => {
  // console.log(params);
  formatDocumentI18n(
    TextDocument.create(
      // client 路径不带前缀
      `file://${params.uri.path}`,
      params.languageId,
      params.version,
      params.code
    )
  );
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
