/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from "path";
import {
  workspace,
  ExtensionContext,
  window,
  commands,
  QuickPickItem,
  Selection,
} from "vscode";

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import {
  normalDecorationType,
  SUPPORT_LANGUAGE,
  warningDecorationType,
} from "./constants";

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  // The server is implemented in node
  const serverModule = context.asAbsolutePath(
    path.join("server", "out", "server.js")
  );
  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
  const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for plain text documents
    documentSelector: [
      { scheme: "file", language: "plaintext" },
      { scheme: "file", language: "typescriptreact" },
    ],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
    },
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    "languageServerExample",
    "Language Server Example",
    serverOptions,
    clientOptions
  );

  const rangeMap = new Map<
    string,
    { normalKeyRange: any[]; warningKeyRange: any[] }[]
  >();
  // Start the client. This will also launch the server
  client.start();
  client.onReady().then(() => {
    client.onNotification("i18n/convertRst", (params) => {
      // console.log(params);
      // console.log(window.activeTextEditor.document.uri);
      // console.log(window.activeTextEditor.document.uri);
      if (
        params.uri.replace("file://", "") ===
        window.activeTextEditor.document.uri.path
      ) {
        params.range.forEach(({ normalKeyRange, warningKeyRange }) => {
          window.activeTextEditor?.setDecorations(
            normalDecorationType,
            normalKeyRange
          );
          window.activeTextEditor?.setDecorations(
            warningDecorationType,
            warningKeyRange
          );
        });
        rangeMap.set(window.activeTextEditor.document.uri.path, params.range);
      }
    });
    client.onNotification("i18n/getCurrentDocumentText", (params) => {
      console.log(params);
      console.log(window.activeTextEditor.document.uri);
      console.log(window.activeTextEditor.document.uri);
      if (
        params.uri.replace("file://", "") ===
        window.activeTextEditor.document.uri.path
      ) {
        client.sendNotification("i18n/currentDocumentText", {
          code: window.activeTextEditor.document.getText(),
          uri: params.uri,
        });
      }
    });
    client.onNotification("i18n/getLineText", (params) => {
      console.log("i18n/getLineText");
      console.log(params);
      console.log(window.activeTextEditor.document.uri);
      console.log(window.activeTextEditor.document.uri);
      if (
        params.uri.replace("file://", "") ===
        window.activeTextEditor.document.uri.path
      ) {
        const lineText = window.activeTextEditor.document.lineAt(params.line);
        client.sendNotification("i18n/getLineTextResponse", {
          lineText: lineText.isEmptyOrWhitespace ? false : lineText.text,
          uri: params.uri,
        });
      }
    });
  });
  context.subscriptions.push(
    window.onDidChangeActiveTextEditor((editor) => {
      if (
        editor?.document.languageId &&
        // 支持的语言才进行解析
        SUPPORT_LANGUAGE.includes(editor?.document.languageId)
      ) {
        const documentText = editor?.document.getText();
        if (documentText) {
          const { uri, languageId, version } = editor.document;
          client.sendNotification("i18n/needConvert", {
            uri: uri,
            languageId: languageId,
            version: version,
            code: documentText,
          });
        }
      }
    })
  );

  // 注册搜索命令
  context.subscriptions.push(
    commands.registerCommand("extension.i18n.find", async () => {
      const currentDoc = window.activeTextEditor.document.uri.path;
      const currentRangeData = rangeMap.get(currentDoc);
      if (currentRangeData) {
        let i18nKey: ({ optionData: any } & QuickPickItem)[] = [];

        currentRangeData.forEach(({ normalKeyRange }) => {
          i18nKey = i18nKey.concat(
            normalKeyRange.map((item) => {
              const { key, value } = item.data;
              // return `${key}: ${value}`;
              return {
                label: key,
                description: value,
                optionData: item,
              };
            })
          );
        });
        const { optionData } =
          (await window.showQuickPick(i18nKey, {
            title: "查找当前文档i18n内容",
            matchOnDescription: true,
          })) ?? {};
        if (optionData) {
          const lineNumber = optionData.range.start.line;
          const editor = window.activeTextEditor;
          const range = editor.document.lineAt(lineNumber).range;
          editor.selection = new Selection(range.start, range.end);
          editor.revealRange(range);
        }
      }
    })
  );
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
