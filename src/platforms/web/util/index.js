/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-10-11 10:55:24
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vue\src\platforms\web\util\index.js
 */
/* @flow */

import { warn } from 'core/util/index'

export * from './attrs'
export * from './class'
export * from './element'

/** 
 * // 封装后的查询元素的方法 当传入字符串时 调用原生的方法 传入元素时 直接返回
 */
export function query (el: string | Element): Element {

  if (typeof el === 'string') {

     //如果el为字符串时 
    const selected = document.querySelector(el)

    if (!selected) {
      //当不存在 该元素时
      process.env.NODE_ENV !== 'production' && warn(
        'Cannot find element: ' + el
      )
      return document.createElement('div') //返回一个空元素
    }
    return selected
  } else {
    return el //否则返回实例
  }
}
