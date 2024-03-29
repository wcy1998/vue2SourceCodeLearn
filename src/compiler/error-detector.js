/* @flow */

import { dirRE, onRE } from './parser/index'

type Range = { start?: number, end?: number };

// these keywords should not appear inside expressions, but operators like
// typeof, instanceof and in are allowed
const prohibitedKeywordRE = new RegExp('\\b' + (
  'do,if,for,let,new,try,var,case,else,with,await,break,catch,class,const,' +
  'super,throw,while,yield,delete,export,import,return,switch,default,' +
  'extends,finally,continue,debugger,function,arguments'
).split(',').join('\\b|\\b') + '\\b')

// these unary operators should not be used as property/method names
const unaryOperatorsRE = new RegExp('\\b' + (
  'delete,typeof,void'
).split(',').join('\\s*\\([^\\)]*\\)|\\b') + '\\s*\\([^\\)]*\\)')

// strip strings in expressions
const stripStringRE = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*\$\{|\}(?:[^`\\]|\\.)*`|`(?:[^`\\]|\\.)*`/g

// detect problematic expressions in a template
/**
 * @description: 检测模板中的有问题的表达式
 * @param {*} ast 抽象节点
 * @param {*} warn 提示方法
 * @return {*}
 */

export function detectErrors (ast: ?ASTNode, warn: Function) {

  if (ast) {

    checkNode(ast, warn)

  }

}

/**
 * @description: 检测节点
 * @param {*} node 
 * @param {*} warn
 * @return {*}
 */
function checkNode (node: ASTNode, warn: Function) {

  if (node.type === 1) {
    //如果是元素节点
    for (const name in node.attrsMap) {
      //遍历节点的属性map
      if (dirRE.test(name)) {

        const value = node.attrsMap[name]

        if (value) {
          //属性存在值时
          const range = node.rawAttrsMap[name]

          if (name === 'v-for') {
              //当属性时v-for时 检查
            checkFor(node, `v-for="${value}"`, warn, range)

          } else if (onRE.test(name)) {
             //当是 on时检查
            checkEvent(value, `${name}="${value}"`, warn, range)

          } else {
               //检查表达式
            checkExpression(value, `${name}="${value}"`, warn, range)

          }

        }
      }
    }
    if (node.children) {
         //如果存在子节点 就遍历检查
      for (let i = 0; i < node.children.length; i++) {
        checkNode(node.children[i], warn)
      }

    }

  } else if (node.type === 2) {
    //如果节点类型是2
    checkExpression(node.expression, node.text, warn, node)
  }
}

function checkEvent (exp: string, text: string, warn: Function, range?: Range) {
  const stipped = exp.replace(stripStringRE, '')
  const keywordMatch: any = stipped.match(unaryOperatorsRE)
  if (keywordMatch && stipped.charAt(keywordMatch.index - 1) !== '$') {
    warn(
      `avoid using JavaScript unary operator as property name: ` +
      `"${keywordMatch[0]}" in expression ${text.trim()}`,
      range
    )
  }
  checkExpression(exp, text, warn, range)
}

function checkFor (node: ASTElement, text: string, warn: Function, range?: Range) {
  checkExpression(node.for || '', text, warn, range)
  checkIdentifier(node.alias, 'v-for alias', text, warn, range)
  checkIdentifier(node.iterator1, 'v-for iterator', text, warn, range)
  checkIdentifier(node.iterator2, 'v-for iterator', text, warn, range)
}

function checkIdentifier (
  ident: ?string,
  type: string,
  text: string,
  warn: Function,
  range?: Range
) {
  if (typeof ident === 'string') {
    try {
      new Function(`var ${ident}=_`)
    } catch (e) {
      warn(`invalid ${type} "${ident}" in expression: ${text.trim()}`, range)
    }
  }
}

function checkExpression (exp: string, text: string, warn: Function, range?: Range) {
  try {
    new Function(`return ${exp}`)
  } catch (e) {
    const keywordMatch = exp.replace(stripStringRE, '').match(prohibitedKeywordRE)
    if (keywordMatch) {
      warn(
        `avoid using JavaScript keyword as property name: ` +
        `"${keywordMatch[0]}"\n  Raw expression: ${text.trim()}`,
        range
      )
    } else {
      warn(
        `invalid expression: ${e.message} in\n\n` +
        `    ${exp}\n\n` +
        `  Raw expression: ${text.trim()}\n`,
        range
      )
    }
  }
}
