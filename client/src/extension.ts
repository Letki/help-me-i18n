/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from "path";
import { workspace, ExtensionContext, window, languages } from "vscode";

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

  // Start the client. This will also launch the server
  client.start();
  client.onReady().then(() => {
    client.onNotification("i18n/convert", (params) => {
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
  context.subscriptions.push(
    workspace.onDidChangeTextDocument((editor) => {
      if (
        editor?.document.languageId &&
        // 支持的语言才进行解析
        SUPPORT_LANGUAGE.includes(editor?.document.languageId)
      ) {
        const lineText = editor.document.lineAt(
          editor.contentChanges[0]?.range.start.line
        );
        client.sendNotification("i18n/getCompletion", {
          lineText: lineText.isEmptyOrWhitespace ? false : lineText.text,
          contentChanges: editor.contentChanges,
          code: editor.document.getText(),
          uri: "file://" + editor?.document.uri.toString(),
        });
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
