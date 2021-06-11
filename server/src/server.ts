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
  TextDocumentSyncKind,
  InitializeResult,
  Range,
  Position,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import startsWith from "lodash/startsWith";
import { Ast, I18nAst } from "./core/Ast";
import { defaultSettings, Global, IExtensionConfig } from "./core/Global";
import { SETTING_NAME } from "./constants";
import esquery from "esquery";
import { replacePrefix } from "./utils";
import { Identifier, SimpleLiteral } from "estree";

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

let once = true;
/** i18n 转换方法 */
async function formatDocumentI18n(textDocument: TextDocument): Promise<void> {
  // In this simple example we get the settings for every validate run.
  if (once) {
    const settings = await getDocumentSettings(textDocument.uri);
    await Global.loadConfig(settings);
    once = false;
  }
  const ast = new I18nAst(textDocument.getText());
  const rst = ast.convertAll();
  connection.sendNotification("i18n/convertRst", {
    uri: textDocument.uri,
    range: rst,
  });
}

connection.onNotification("i18n/needConvert", (params) => {
  // console.log(params);
  const textDoc = documents.get(`file://${params.uri.path}`);
  if (textDoc) {
    formatDocumentI18n(textDoc);
  }
});
connection.onCompletionResolve((params) => {
  return params;
});

/**
 * 代码提示 自动补全
 */
connection.onCompletion(({ textDocument, position }) => {
  const documentText = documents.get(textDocument.uri);
  const lineText = documentText?.getText(
    Range.create(
      Position.create(position.line, 0),
      Position.create(position.line, 9999)
    )
  );
  const ast = new I18nAst(documentText?.getText() ?? "");
  const block = ast.getBlockItemByLine(position.line);
  const lineAst = new Ast(lineText ?? "");
  // 找到输入的变量
  const lineVarId = (
    esquery(lineAst.ast, `CallExpression > Identifier`) as Identifier[]
  )?.[0]?.name;
  const argStringNode = (
    esquery(lineAst.ast, `CallExpression > StringLiteral`) as SimpleLiteral[]
  )?.[0];
  // const argString = argStringNode?.value;
  if (lineVarId && argStringNode && block) {
    const currentI18nInstance = block?.formatter.i18nList.find((i18n) => {
      return i18n.variableId === lineVarId;
    });
    const allI18nKey = Object.keys(
      Global.localeData.get(Global.currentLocale) ?? {}
    ).filter((item) => {
      return startsWith(item, currentI18nInstance?.prefixKey);
    });
    return allI18nKey.map((item) => {
      return {
        label: replacePrefix([currentI18nInstance?.prefixKey ?? ""], item),
        kind: CompletionItemKind.Enum,
        data: replacePrefix([currentI18nInstance?.prefixKey ?? ""], item),
        documentation: Global.localeData.get(Global.currentLocale)?.[item],
      };
    });
  }

  return [];
});
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
