import { ExtensionContext, workspace } from 'vscode';
import { Global } from './core/Global';
import * as _ from 'lodash';
import { EXT_NAME } from './constants';

export async function activate(context: ExtensionContext) {
  console.log(`Congratulations, your extension ${EXT_NAME} is now active!`);
  await Global.init(context);

  context.subscriptions.push(workspace.onDidChangeConfiguration(() => Global.init(context)));
  // context.subscriptions.push(languages.registerReferenceProvider('typescriptreact', {
  //   provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken) {
  //     return [new CompletionItem()]
  //   }
  // }))
}

export function deactivate() {}
