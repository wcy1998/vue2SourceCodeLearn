/* @flow */

/**
 * Cross-platform code generation for component v-model
 *  组件 v-model 的跨平台代码生成
 */

//组件的v-model指令代码生成
export function genComponentModel(
  el: ASTElement, //抽象元素结构
  value: string, //指令值
  modifiers: ?ASTModifiers //修饰符
): ?boolean {


  const {
    number, //是否将至转换成数值类型
    trim //是否将值进行空格去除
  } = modifiers || {}

  const baseValueExpression = '$$v'

  let valueExpression = baseValueExpression

  if (trim) {

    valueExpression =
      `(typeof ${baseValueExpression} === 'string'` +
      `? ${baseValueExpression}.trim()` +
      `: ${baseValueExpression})`

  }

  if (number) {

    valueExpression = `_n(${valueExpression})`

  }


  const assignment = genAssignmentCode(value, valueExpression)
                    
  el.model = {
    value: `(${value})`, //值
    expression: JSON.stringify(value), //表达式
    callback: `function (${baseValueExpression}) {${assignment}}` //执行的回调
  }


}




export function genAssignmentCode(

  value: string, //被绑定的属性

  assignment: string // `$event` 表达式绑定的表达式

): string {


  //处理v-model的表达式 比如传入 a.b 返回 {exp：a ,key:b}
  const res = parseModel(value)

  if (res.key === null) {

    //如果表达式中没有.  生成表达式 = $events
    return `${value}=${assignment}`

  } else {
    //如果表达式中存在 .用$set 进行赋值
    return `$set(${res.exp}, ${res.key}, ${assignment})`
  }

}

/**
 * Parse a v-model expression into a base path and a final key segment.
 * Handles both dot-path and possible square brackets.
 *
 * Possible cases:
 *
 * - test
 * - test[key]
 * - test[test1[key]]
 * - test["a"][key]
 * - xxx.test[a[a].test1[key]]
 * - test.xxx.a["asa"][test1[key]]
 *
 */

let len, str, chr, index, expressionPos, expressionEndPos

type ModelParseResult = {
  exp: string,
  key: string | null
}

/**
 * @description: 解析 v-model的表达式
 * @param {*} val
 * @return {*}
 */
export function parseModel(val: string): ModelParseResult {
  // Fix https://github.com/vuejs/vue/pull/7730
  // allow v-model="obj.val " (trailing whitespace)

  val = val.trim()

  //获取该值的长度
  len = val.length

  if (val.indexOf('[') < 0 || val.lastIndexOf(']') < len - 1) {
    //如果表达式中 不存在 [ 或者表达式中 没有]

    //比如v-model的值是 a.b
    //获取最后一个.的位置  index就是1
    index = val.lastIndexOf('.')

    if (index > -1) {
      //如果穿的是一个 a.b形式的值

      return {
        exp: val.slice(0, index), //获取表达式 最后一个.之前的部分
        key: '"' + val.slice(index + 1) + '"' //获取表达式 最后一个.之后的部分
      }

    } else {

      return {

        exp: val,
        key: null

      }

    }
  }

  //如果表达式中存在[]
  str = val

  index = expressionPos = expressionEndPos = 0

  while (!eof()) {
    chr = next()
    /* istanbul ignore if */
    if (isStringStart(chr)) {
      parseString(chr)
    } else if (chr === 0x5B) {
      parseBracket(chr)
    }
  }

  return {
    exp: val.slice(0, expressionPos),
    key: val.slice(expressionPos + 1, expressionEndPos)
  }
}

function next(): number {
  return str.charCodeAt(++index)
}

function eof(): boolean {
  return index >= len
}

function isStringStart(chr: number): boolean {
  return chr === 0x22 || chr === 0x27
}

function parseBracket(chr: number): void {
  let inBracket = 1
  expressionPos = index
  while (!eof()) {
    chr = next()
    if (isStringStart(chr)) {
      parseString(chr)
      continue
    }
    if (chr === 0x5B) inBracket++
    if (chr === 0x5D) inBracket--
    if (inBracket === 0) {
      expressionEndPos = index
      break
    }
  }
}

function parseString(chr: number): void {
  const stringQuote = chr
  while (!eof()) {
    chr = next()
    if (chr === stringQuote) {
      break
    }
  }
}
