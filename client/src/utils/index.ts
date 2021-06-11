import { Selection, TextEditor, TextEditorRevealType } from "vscode";

export const jumpToLineAndSelect = (lineNumber: number, editor: TextEditor) => {
  const range = editor.document.lineAt(lineNumber).range;
  editor.selection = new Selection(range.start, range.end);
  editor.revealRange(range, TextEditorRevealType.InCenter);
};
