/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-01-14 10:06:46
 * @LastEditors: your name
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: \vue\src\compiler\parser\text-parser.js
 */










//解析字符串内容

import { cached } from 'shared/util'//创建一个缓存版本的函数

//解析filter的内容
import { parseFilters } from './filter-parser' 

const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g //匹配{{}}之中的内容

const regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g//

const buildRegex = cached(delimiters => { //生成一个新的正则
  const open = delimiters[0].replace(regexEscapeRE, '\\$&')
  const close = delimiters[1].replace(regexEscapeRE, '\\$&')
  return new RegExp(open + '((?:.|\\n)+?)' + close, 'g')
})

//文本解析结果的类型定义
type TextParseResult = { 
  expression: string, 
  tokens: Array<string | { '@binding': string }>
}

export function parseText ( //解析双括号包裹的文本内容
  text: string, //要解析的文本
  delimiters?: [string, string] //分隔符
): TextParseResult | void {


  //如果用户自定了分隔符 就使用新的分割符
  const tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE //分隔符的正则


  //如果不是双括号包裹的就不解析了
  if (!tagRE.test(text)) {

    return

  }

  const tokens = []

  const rawTokens = []

  let lastIndex = tagRE.lastIndex = 0

  let match, index, tokenValue

  while ((match = tagRE.exec(text))) {

    index = match.index

    // push text token
    if (index > lastIndex) {

      rawTokens.push(tokenValue = text.slice(lastIndex, index))

      tokens.push(JSON.stringify(tokenValue))

    }

    // tag token
    const exp = parseFilters(match[1].trim())

    tokens.push(`_s(${exp})`)

    rawTokens.push({ '@binding': exp })

    lastIndex = index + match[0].length

  }

  if (lastIndex < text.length) {

    rawTokens.push(tokenValue = text.slice(lastIndex))

    tokens.push(JSON.stringify(tokenValue))

  }

  return {
    
    expression: tokens.join('+'),

    tokens: rawTokens

  }
  
}
