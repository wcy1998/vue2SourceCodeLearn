/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-01-14 14:34:12
 * @LastEditors: Please set LastEditors
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: \vue\src\platforms\web\compiler\modules\class.js
 */
/* @flow */


import { 
  parseText //文本解析函数
 } from 'compiler/parser/text-parser' 

import {
  getAndRemoveAttr, //移除attrList中的置顶属性 并返回attrMap
  getBindingAttr,//获取bind的属性
  baseWarn //最基本的提示编译错误的函数
} from 'compiler/helpers'


//生成抽象语法树时调用
function transformNode(el: ASTElement, options: CompilerOptions) {

  //获取告警函数 可能是用户配置的
  const warn = options.warn || baseWarn 

  //获取当前节点的class属性值
  const staticClass = getAndRemoveAttr(el, 'class') 

  if (process.env.NODE_ENV !== 'production' && staticClass) {

    //按照class属性 和 用户自定义的分隔符 去解析
    const res = parseText(staticClass, options.delimiters) 
    if (res) {
      warn(
        `class="${staticClass}": ` +
        'Interpolation inside attributes has been removed. ' +
        'Use v-bind or the colon shorthand instead. For example, ' +
        'instead of <div class="{{ val }}">, use <div :class="val">.',
        el.rawAttrsMap['class']
      )

    }

  }

  if (staticClass) {

    //如果解析出静态的class数据
    el.staticClass = JSON.stringify(staticClass)//字符串化的attrMap

  }
 
 //如果解析出动态的class数据
  const classBinding = getBindingAttr(el, 'class', false /* getStatic */) //获取绑定语法的class

  if (classBinding) {
    el.classBinding = classBinding
  }

}

/**
 * @description: 
 * @param {*} el 抽象元素结构
 * @return {*}
 */
function genData(el: ASTElement): string {

  let data = ''

  if (el.staticClass) {

    data += `staticClass:${el.staticClass},`

  }

  if (el.classBinding) {

    data += `class:${el.classBinding},`

  }

  return data

}

export default {

  staticKeys: ['staticClass'], //用户传入编译成的静态标志 在编译完成后class属性会分为 动态的和静态的 静态的通过这个键值来标记

  transformNode,

  genData

}
