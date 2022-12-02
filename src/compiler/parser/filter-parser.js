/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-10-11 13:06:18
 * @LastEditors: Please set LastEditors
 * @Description: 解析filter
 * @FilePath: \vue\src\compiler\parser\filter-parser.js
 */
/* @flow */


const validDivisionCharRE = /[\w).+\-_$\]]/

//解析表达式中的过滤器 并返回表达式值
export function parseFilters (exp: string): string {

  let inSingle = false //当前字符是不是在单引号内

  let inDouble = false //当前字符是不是在双引号内

  let inTemplateString = false//当前字符是不是在模板字符串内

  let inRegex = false //当前字符是不是在正则表达式内


  let curly = 0 //大括号嵌套的层数
 
  let square = 0 //[] 中括号嵌套的层数

  let paren = 0  //() 括号嵌套的层数

  let lastFilterIndex = 0 //上一个filter 的 末尾位置


  let c, //当前字符的Unicode值
   prev, //上一个字符的UNIcode值

   i, //当前索引
   expression,
    filters


  for (i = 0; i < exp.length; i++) {
    //循环遍历属性表达式的每一个字符

    prev = c

    c = exp.charCodeAt(i) //返回当前字符的 Unicode

    if (inSingle) {

      //如果 前一个字符不是/ 且当前字符是单引号 说明不在单引号内 
      if (c === 0x27 && prev !== 0x5C) inSingle = false

    } else if (inDouble) {

      //如果 如果当前字符 是 双引号   说明不在双引号中了
      if (c === 0x22 && prev !== 0x5C) inDouble = false

    } else if (inTemplateString) {

      //是否在模板字符串内
      if (c === 0x60 && prev !== 0x5C) inTemplateString = false

    } else if (inRegex) {

      //是否在正则表达式
      if (c === 0x2f && prev !== 0x5C) inRegex = false

    } else if (

      c === 0x7C && // 当前字符为 | 号  时  且前后都不是 | 号时

      exp.charCodeAt(i + 1) !== 0x7C && 
      exp.charCodeAt(i - 1) !== 0x7C && 
      !curly && !square && !paren

    ) {

      if (expression === undefined) {
        //如果expression为空

        //first filter, end of expression
        lastFilterIndex = i + 1 //记录当前的第一个filter

        expression = exp.slice(0, i).trim() // 一个表达式

      } else {


        pushFilter() // 解析到 用 | 分割 的 一个表达式时  推入一个filter表达式


      }

    } else {

      //一般情况
      switch (c) {

        case 0x22: inDouble = true; break         // "  
        case 0x27: inSingle = true; break         // '
        case 0x60: inTemplateString = true; break // `
        case 0x28: paren++; break                 // (
        case 0x29: paren--; break                 // )
        case 0x5B: square++; break                // [
        case 0x5D: square--; break                // ]
        case 0x7B: curly++; break                 // {
        case 0x7D: curly--; break                 // }

      }

      // 如果当前字符为/
      if (c === 0x2f) {

        let j = i - 1 //前一位字符

        let p //第一个不是空格的前置字符 

        
        // 找到第一个不是空格的前置字符  find first non-whitespace prev char
        for (; j >= 0; j--) {
          p = exp.charAt(j)
          if (p !== ' ') break
        }

        if (!p || !validDivisionCharRE.test(p)) {
          inRegex = true
        }
      }
    }
  }

  if (expression === undefined) {

    //如果还没有表达式 就让当前字符串为表达式
    expression = exp.slice(0, i).trim()

  } else if (lastFilterIndex !== 0) {

    //如果还没有就 继续推入下一个filter
    pushFilter()
    
  }

  /**
   * @description: 解析到 用 | 分割 的 一个表达式时  推入一个filter表达式
   * @param {*}
   * @return {*}
   */
  function pushFilter () {

    (filters || (filters = [])).push(exp.slice(lastFilterIndex, i).trim())

    lastFilterIndex = i + 1

  }

  if (filters) {
    for (i = 0; i < filters.length; i++) {
      expression = wrapFilter(expression, filters[i])
    }
  }

  return expression
}

function wrapFilter (exp: string, filter: string): string {
  const i = filter.indexOf('(')
  if (i < 0) {
    // _f: resolveFilter
    return `_f("${filter}")(${exp})`
  } else {
    const name = filter.slice(0, i)
    const args = filter.slice(i + 1)
    return `_f("${name}")(${exp}${args !== ')' ? ',' + args : args}`
  }
}
