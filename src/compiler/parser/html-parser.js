/**
 * Not type-checking this file because it's mostly vendor code.
 */

/*!
 * HTML Parser By John Resig (ejohn.org)
 * Modified by Juriy "kangax" Zaytsev
 * Original code by Erik Arvidsson, Mozilla Public License
 * http://erik.eae.net/simplehtmlparser/simplehtmlparser.js
 */

import { makeMap, no } from 'shared/util'
import { isNonPhrasingTag } from 'web/compiler/util'
import { unicodeLetters } from 'core/util/lang'

// Regular Expressions for parsing tags and attributes
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const dynamicArgAttribute = /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeLetters}]*`
const qnameCapture = `((?:${ncname}\\:)?${ncname})`
const startTagOpen = new RegExp(`^<${qnameCapture}`)
const startTagClose = /^\s*(\/?)>/
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`)
const doctype = /^<!DOCTYPE [^>]+>/i //如果是 <!DOCTYPE 开头的
// #7298: escape - to avoid being pased as HTML comment when inlined in page
const comment = /^<!\--/  //判断当前html是不是以<!-- 开头
const conditionalComment = /^<!\[/ //另一种格式的注释 <![ 

//特殊的可以包含任何内容的标签
export const isPlainTextElement = makeMap('script,style,textarea', true)

const reCache = {}

const decodingMap = {
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&amp;': '&',
  '&#10;': '\n',
  '&#9;': '\t',
  '&#39;': "'"
}
const encodedAttr = /&(?:lt|gt|quot|amp|#39);/g
const encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#39|#10|#9);/g

// #5992
const isIgnoreNewlineTag = makeMap('pre,textarea', true)
const shouldIgnoreFirstNewline = (tag, html) => tag && isIgnoreNewlineTag(tag) && html[0] === '\n'

/**
 * @description: 
 * @param {*} value 属性的内容
 * @param {*} shouldDecodeNewlines 是否需要解析新行
 * @return {*}
 */
function decodeAttr(value, shouldDecodeNewlines) {

  const re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr

  return value.replace(re, match => decodingMap[match])

}


//解析html变为ast
export function parseHTML(html, options) {


  const expectHTML = options.expectHTML //是否期望html

  const isUnaryTag = options.isUnaryTag || no //判断是否是一元标签的函数

  const canBeLeftOpenTag = options.canBeLeftOpenTag || no //判断是否是左开标签的函数


  const stack = [] //一个标签信息栈 用户存储当前不是单闭和标签的 标签信息栈

  let index = 0  //已经解析过的字符串的个数

  let last, //上一轮循环时的html字符串
    lastTag //上一次解析的tag标签类型


  //一致解析直到所有字符串被解析完成
  while (html) {

    last = html //记录上一轮循环时的字符串
 
    //当是第一次解析时 或者 上一次解析的标签不是script，style，textarea这样的标签时
    if (!lastTag || !isPlainTextElement(lastTag)) {

      //寻找当前html中第一个 < 的位置 这个是一个标签的开始标志这个位置很关键 是用来判断当前html解析到了什么类型的内容
      let textEnd = html.indexOf('<')
      
      //如果当前的html是以 < 开头的 说明遇到了一个标签
      if (textEnd === 0) {

        //如果当前html是以<!-- 开头  就去配置-->的位置 然后根据用户配置
        //判断是否保留注释，并在html中删除这段注释内容，并继续下一轮循环
        if (comment.test(html)) {
          const commentEnd = html.indexOf('-->')
          if (commentEnd >= 0) {
            //如果存在结束标签
            if (options.shouldKeepComment) {
              options.comment(html.substring(4, commentEnd), index, index + commentEnd + 3)
            }
            advance(commentEnd + 3)
            continue
          }
        }
 
         //这是另一种格式的注释的匹配规则，处理规则和上面类似
        if (conditionalComment.test(html)) {
          const conditionalEnd = html.indexOf(']>')
          if (conditionalEnd >= 0) {
            advance(conditionalEnd + 2)
            continue
          }
        }

        //匹配当前html是不是以<!doctype> 开头 将文本的<!doctype>内容进行移除
        const doctypeMatch = html.match(doctype)
        if (doctypeMatch) {
          advance(doctypeMatch[0].length)
          continue

        }

        //判断匹配到的是不是一个结束标签
        const endTagMatch = html.match(endTag)

        //如果是一个结束标签 就去进行标签匹配 进行相关信息的存储 但这一部分往往是后面进行的
        if (endTagMatch) {
          const curIndex = index
          advance(endTagMatch[0].length)
          parseEndTag(endTagMatch[1], curIndex, index)
          continue
        }

        //其他情况下一般就是匹配到了开始标签了，获取到当前开始标签的匹配内容
        const startTagMatch = parseStartTag() 

        if (startTagMatch) {
          //如果存在匹配内容
          //开始处理开始标签的匹配内容
          handleStartTag(startTagMatch)
          //是否要忽略下一个换行符
          if (shouldIgnoreFirstNewline(startTagMatch.tagName, html)) {
            advance(1)
          }
          continue
        }
      }

     
      let text, //标签内的文本内容
          rest, // <之后的内容
          next //第一个< 之后下一个<的位置
       
      //当前文本并不是以<开头的 那么 <符号 前面的就都是文本内容了
      if (textEnd >= 0) {

        rest = html.slice(textEnd) //下一个<之后的内容

        while (
          !endTag.test(rest) &&  //当<开头的字符串不是 以结束标签开始的
          !startTagOpen.test(rest) &&//当<开头的字符串不是 以开始标签开始的
          !comment.test(rest) && //当<开头的字符串不是 以注释标签开始的
          !conditionalComment.test(rest) //当<开头的字符串不是 以注释标签开始的
        ) {
          //说明找出来的这个 < 符号并不是下一个标签的开始，直到找到下一个<符号表示标签为止
          next = rest.indexOf('<', 1) 

          if (next < 0) break

          textEnd += next

          rest = html.slice(textEnd)

        }

        text = html.substring(0, textEnd) //下一个标签< 之前的内容都为文本

      }

      //不存在<符号了
      if (textEnd < 0) {
        //如果剩余内中没有<符号了
        text = html
      }
     
      //找到文本舍弃掉文本的内容
      if (text) {
        advance(text.length)
      }

      if (options.chars && text) {
         //对文本内容调用 chars函数
        options.chars(text, index - text.length, index)
      }

    } else {

      //当上一次解析的不是单闭和的开始标签 是一个script，style，textarea 标签

      let endTagLength = 0

      const stackedTag = lastTag.toLowerCase() //上次解析的标签
 
      //存储当前标签的内容
      const reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i')) //正则

      const rest = html.replace(reStackedTag, function (all, text, endTag) {
        endTagLength = endTag.length
        if (!isPlainTextElement(stackedTag) && stackedTag !== 'noscript') {
          text = text
            .replace(/<!\--([\s\S]*?)-->/g, '$1') // #7298
            .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')
        }
        if (shouldIgnoreFirstNewline(stackedTag, text)) {
          text = text.slice(1)
        }
        if (options.chars) {
          options.chars(text)
        }
        return ''
      })
      
      index += html.length - rest.length
      html = rest
      parseEndTag(stackedTag, index - endTagLength, index)
    }

    if (html === last) {
       //如果处理后的html 和处理前的一致的话 就将html显示为文本直接显示文本 并进行相关提示
      options.chars && options.chars(html)
      if (process.env.NODE_ENV !== 'production' && !stack.length && options.warn) {
        options.warn(`Mal-formatted tag at end of template: "${html}"`, { start: index + html.length })
      }
      break
    }
  }

  // Clean up any remaining tags
  parseEndTag()

  /**
   * @description: 移除指定个数的字符串 并记录已经移除的字符串个数
   * @param {*} n
   * @return {*}
   */
  function advance(n) {

    //移除被解析过的字段
    index += n

    html = html.substring(n)

  }

  
  //解析开始标签的内容
  function parseStartTag() {

    //匹配当前html是不是以开始标签开头
    const start = html.match(startTagOpen)

    if (start) {

      //如果是以开始标签开头的
      const match = {

        tagName: start[1], //标签名

        attrs: [], //标签中 属性的匹配数组

        start: index,  //标签的开始索引

        unarySlash //自闭和标签信息

      }

      //开始标签名的内容移除
      advance(start[0].length)

      let
        end, //结束标签的匹配信息
        attr //每个属性的位置信息

      //通过循环获取每一个属性的内容和位置信息移除当前属性的内容，并向属性列表推入当前属性的匹配信息
      while (
        !(end = html.match(startTagClose))
        &&
        (attr = html.match(dynamicArgAttribute)
          || html.match(attribute))) {
        attr.start = index
        advance(attr[0].length)
        attr.end = index
        match.attrs.push(attr)
      }
 
      //如果匹配到了结束位置
      if (end) {
        //判断是不是自闭和标签
        match.unarySlash = end[1]
        advance(end[0].length)
        match.end = index
        //返回匹配的信息
        return match
      }
    }
  }


  //处理开始标签的匹配内容
  function handleStartTag(match) {

    const tagName = match.tagName //开始标签名

    const unarySlash = match.unarySlash //当前开始标签是否是单闭合标签

    if (expectHTML) {
      //当期望的是html
      if (lastTag === 'p' && isNonPhrasingTag(tagName)) {
        //这里不太了解
        parseEndTag(lastTag)
      }

      if (canBeLeftOpenTag(tagName) && lastTag === tagName) {
        //如果是左开标签  并且上一些解析的与这一次时同一标签时 就进行结束处理
        parseEndTag(tagName)

      }

    }


    //判断当前开始标签是不是单闭合标签
    const unary = isUnaryTag(tagName) || !!unarySlash

  
    const l = match.attrs.length
    const attrs = new Array(l)
    for (let i = 0; i < l; i++) {

      //遍历当前标签内的属性内容
      const args = match.attrs[i]
      //获取属性值
      const value = args[3] || args[4] || args[5] || ''

      //如果是a标签并且 存在href属性  需要新行 
      const shouldDecodeNewlines = tagName === 'a' && args[1] === 'href'
        ? options.shouldDecodeNewlinesForHref
        : options.shouldDecodeNewlines


      //根据shouldDecodeNewlines 解析下属性的内容
      attrs[i] = {
        name: args[1], //属性的名称
        value: decodeAttr(value, shouldDecodeNewlines)
      }

      if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
        //如果不是生产环境 记录下属性出现在 模板字符串中的位置
        attrs[i].start = args.start + args[0].match(/^\s*/).length

        attrs[i].end = args.end

      }

    }

    if (!unary) {
      //如果不是单闭和标签是 向 当前栈推入当前开始标签的信息
      stack.push({
        tag: tagName, //当前开始标签的标签名
        lowerCasedTag: tagName.toLowerCase(), //当前开始标签的小写
        attrs: attrs, //当前开始标签的属性内容
        start: match.start, //当前开始标签的开始位置
        end: match.end //当前开始标签的结束位置
      })

      lastTag = tagName //将当前的开始标签 记录为上一次解析的标签

    }

    if (options.start) {

      //根据开始标签生成 ast节点 模板

      options.start(tagName, attrs, unary, match.start, match.end)
    }

  }

  //解析结束标签
  function parseEndTag(
    tagName, //结束标签名
     start, //结束标签开始位置
      end //结束标签结束
       ) {
        
    let
      pos, //当前闭合标签对应的打开标签在栈中的位置
      lowerCasedTagName //将标签转为小写

    //如果没有传开始位置 就标记当前位置
    if (start == null) start = index
    //如果没有传结束位置 就标记当前位置
    if (end == null) end = index


    if (tagName) {
      //将标签转为小写
      lowerCasedTagName = tagName.toLowerCase()

      for (pos = stack.length - 1; pos >= 0; pos--) {
        //从栈顶遍历当前栈 找到当前匹配的开始标签名
        if (stack[pos].lowerCasedTag === lowerCasedTagName) {
          break
        }
      }
    } else {
      pos = 0
    }

    if (pos >= 0) {
        //如果在栈中找到了对应的标签

      for (let i = stack.length - 1; i >= pos; i--) {
        //从栈顶一直遍历至 该闭合标签对应的打开标签
        if (process.env.NODE_ENV !== 'production' &&
          (i > pos || !tagName) &&
          options.warn
        ) {
          //提示闭合标签没有对应的结束标签
          options.warn(
            `tag <${stack[i].tag}> has no matching end tag.`,
            { start: stack[i].start }
          )
        }

        if (options.end) {
          //解析 当前闭合标签对应的打开标签的
          options.end(stack[i].tag, start, end)
        }


      }

      // Remove the open elements from the stack
      stack.length = pos
      lastTag = pos && stack[pos - 1].tag
    } else if (lowerCasedTagName === 'br') {
      if (options.start) {
        options.start(tagName, [], true, start, end)
      }
    } else if (lowerCasedTagName === 'p') {
      if (options.start) {
        options.start(tagName, [], false, start, end)
      }
      if (options.end) {
        options.end(tagName, start, end)
      }
    }
  }
}
