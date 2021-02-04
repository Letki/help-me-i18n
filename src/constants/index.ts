import { window } from 'vscode';

export const EXT_NAME = 'Help Me I18n';
export const SETTING_NAME = 'help-me-i18n';

export const normalDecorationType = window.createTextEditorDecorationType({
  textDecoration: '', // a hack to inject custom style
  after: {
    backgroundColor: '#434343',
    color: '#C0C4CC',
    border: '0.2px solid #bfbfbf',
    margin: '0 0 0 6px',
  },
});

export const warningDecorationType = window.createTextEditorDecorationType({
  textDecoration: '', // a hack to inject custom style
  after: {
    backgroundColor: '#ff4d4f',
    color: '#ffffff',
    border: '0.2px solid #FE9E0F',
    margin: '0 0 0 6px',
  },
});

export const SUPPORT_LANGUAGE = ['javascriptreact', 'typescriptreact', 'javascript', 'typescript'];
