import parser = require('@babel/parser');
import traverse from '@babel/traverse';
import { NodePath } from '@babel/traverse';
import { DecorationOptions, Position, Range, window, workspace } from 'vscode';
import { VariableDeclaration } from '../../node_modules/@babel/types/lib/index';
import { normalDecorationType, warningDecorationType } from '../constants';
import { Log } from '../utils/Log';
import { Global } from './Global';

/**
 * 判断是不是对应hook的调用
 * @param path
 */
const isI18nHookCallee = (path: NodePath<VariableDeclaration>) => {
  return (
    path.node.type === 'VariableDeclaration' &&
    path.node.declarations?.[0].init?.type === 'CallExpression' &&
    path.node.declarations?.[0].init.callee.type === 'Identifier' &&
    Global.extensionConfig?.hookMatch.includes(path.node.declarations?.[0].init.callee.name)
  );
};

/**
 * 获取hook调用的参数
 * @param path
 */
const getI18nHookCalleeArgs = (path: NodePath<VariableDeclaration>) => {
  if (isI18nHookCallee(path) && path.node.declarations?.[0].init?.type === 'CallExpression' && path.node.declarations?.[0].init?.arguments?.[0]?.type === 'StringLiteral') {
    return path.node.declarations?.[0].init?.arguments?.[0].value;
  }
  return '';
};
/**
 * 获取hook的变量名
 * @param path
 */
const getI18nInitId = (path: NodePath<VariableDeclaration>) => {
  if (isI18nHookCallee(path)) {
    // 直接等于赋值
    if (path.node.declarations?.[0].id.type === 'Identifier') {
      const idNode = path.node.declarations?.[0].id;
      return idNode?.name ?? '';
    }
    // 结构赋值
    if (path.node.declarations?.[0].id.type === 'ObjectPattern') {
      for (const variable of path.node.declarations[0].id.properties) {
        if (variable.type === 'ObjectProperty' && variable.key.type === 'Identifier' && Global.extensionConfig?.varKeyMatch.includes(variable.key.name)) {
          return variable.key.name;
        }
      }
      path.node.declarations?.[0].id.properties;
    }
  }
  return '';
};

/**
 * 将代码转换为ast
 * @param code
 */
export function transformCode2Ast(code: string) {
  return parser.parse(code, {
    sourceType: 'module',
    plugins: [
      'jsx',
      'typescript',
      'asyncGenerators',
      'bigInt',
      'classProperties',
      'classPrivateProperties',
      'classPrivateMethods',
      ['decorators', { decoratorsBeforeExport: false }],
      'doExpressions',
      'dynamicImport',
      'exportDefaultFrom',
      'exportNamespaceFrom',
      'functionBind',
      'functionSent',
      'importMeta',
      'logicalAssignment',
      'nullishCoalescingOperator',
      'numericSeparator',
      'objectRestSpread',
      'optionalCatchBinding',
      'optionalChaining',
      ['pipelineOperator', { proposal: 'minimal' }],
      'throwExpressions',
      'topLevelAwait',
    ],
  });
}

/**
 * 根据上下文将多语言字段翻译为对应语言
 * @param documentText
 */
export const localeTraverse = (documentText: string) => {
  let ast;
  try {
    ast = transformCode2Ast(documentText);
  } catch (error) {
    Log.info(error);
  }
  const normalKeyRange: DecorationOptions[] = [];
  const warningKeyRange: DecorationOptions[] = [];

  const setDecorationsKey = (
    localeDataKey: string,
    option: {
      line?: number;
      column?: number;
    },
  ) => {
    const range = new Range(new Position((option.line ?? 1) - 1, (option.column ?? 1) - 1), new Position((option.line ?? 1) - 1, (option.column ?? 1) - 1));
    if (typeof Global.localeData[localeDataKey] !== 'undefined') {
      normalKeyRange.push({
        renderOptions: {
          after: {
            contentText: `${Global.localeData[localeDataKey]}`,
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
  traverse(ast, {
    VariableDeclaration(path) {
      if (isI18nHookCallee(path)) {
        // const i18nId =
        const prefixKey = getI18nHookCalleeArgs(path);
        const id = getI18nInitId(path);
        path.parentPath.traverse({
          CallExpression(callPath) {
            if (callPath.node.callee.type === 'Identifier' && callPath.node.callee?.name === id) {
              callPath.node.arguments.forEach((element) => {
                if (element.type === 'StringLiteral') {
                  setDecorationsKey(`${prefixKey ? `${prefixKey}.` : ''}${element.value}`, {
                    line: element.loc?.end?.line,
                    column: element.loc?.end?.column,
                  });
                }
              });
            }
          },
        });
      }
    },
  });
  window.activeTextEditor?.setDecorations(normalDecorationType, normalKeyRange);
  window.activeTextEditor?.setDecorations(warningDecorationType, warningKeyRange);
};
