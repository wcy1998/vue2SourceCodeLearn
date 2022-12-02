/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-10-11 11:10:18
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vue\src\platforms\web\util\attrs.js
 */
/* @flow */

import { 
  makeMap  //创建map并返回一个函数来检查某个键是否在该map中
} from 'shared/util'

// 这些是为 web 保留的，因为它们是直接编译的
export const isReservedAttr = makeMap('style,class')

// 应该使用 props 进行绑定的属性
const acceptValue = makeMap('input,textarea,option,select,progress')

/**
 * @description:在浏览器web开发环境中 检测是否必须要prop的函数
 * @return {*}
 */
export const mustUseProp = (
  tag: string, //标签名
  type: ?string, //类型
  attr: string //属性
   ): boolean => {
  //1、当属性是value 且为 input,textarea,option,select,progress style,class  且不是 button时
  //2、当属性是selected 且 tag为 option
  //3、当属性是checked 且 tag为 input
  //4、当属性是muted 且 tag为 video
  return (
    (attr === 'value' && acceptValue(tag)) && type !== 'button' || 
    (attr === 'selected' && tag === 'option') ||
    (attr === 'checked' && tag === 'input') ||
    (attr === 'muted' && tag === 'video')
  )
}

export const isEnumeratedAttr = makeMap('contenteditable,draggable,spellcheck')

const isValidContentEditableValue = makeMap('events,caret,typing,plaintext-only')

export const convertEnumeratedValue = (key: string, value: any) => {
  return isFalsyAttrValue(value) || value === 'false'
    ? 'false'
    // allow arbitrary string value for contenteditable
    : key === 'contenteditable' && isValidContentEditableValue(value)
      ? value
      : 'true'
}

export const isBooleanAttr = makeMap(
  'allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,' +
  'default,defaultchecked,defaultmuted,defaultselected,defer,disabled,' +
  'enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,' +
  'muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,' +
  'required,reversed,scoped,seamless,selected,sortable,translate,' +
  'truespeed,typemustmatch,visible'
)

export const xlinkNS = 'http://www.w3.org/1999/xlink'


export const isXlink = (name: string): boolean => {
  return name.charAt(5) === ':' && name.slice(0, 5) === 'xlink'
}

export const getXlinkProp = (name: string): string => {
  return isXlink(name) ? name.slice(6, name.length) : ''
}

export const isFalsyAttrValue = (val: any): boolean => {
  return val == null || val === false
}
