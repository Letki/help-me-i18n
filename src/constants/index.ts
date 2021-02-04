import { window } from "vscode";

export const EXT_NAME = "Help Me I18n";
export const SETTING_NAME = "help-me-i18n";

export const normalDecorationType = window.createTextEditorDecorationType({
  textDecoration: "", // a hack to inject custom style
  after: {
    backgroundColor: "#434343",
    color: "#C0C4CC",
    border: "0.2px solid #bfbfbf",
    margin: "0 0 0 6px",
  },
});

export const warningDecorationType = window.createTextEditorDecorationType({
    textDecoration: "", // a hack to inject custom style
    after: {
      backgroundColor: "red",
      color: "#ffffff",
      border: "0.2px solid #bfbfbf",
      margin: "0 0 0 6px",
    },
  });

export const SUPPORT_LANGUAGE = ['javascriptreact', 'typescriptreact', 'javascript', 'typescript'];