/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-10-13 13:24:02
 * @LastEditors: Please set LastEditors
 * @Description: 属性更新相关操作
 * @FilePath: \vue\src\platforms\web\runtime\modules\attrs.js
 */


/* @flow */

import { 
  isIE,
   isIE9, 
   isEdge 
  } from 'core/util/env'

import {
  extend, //将属性混合到目标对象中。
  isDef,  //判断一个值 是不是不为null 或不为 undefined
  isUndef // 判断一个值 是不是为null 或为 undefined
} from 'shared/util'

import {
  isXlink, //名称是不是以xlink开头 svg相关
  xlinkNS, //'http://www.w3.org/1999/xlink' svg相关
  getXlinkProp, //svg相关
  isBooleanAttr, //值为 boolean类型的属性
  isEnumeratedAttr,//枚举属性 contenteditable,draggable,spellcheck
  isFalsyAttrValue, //是不是假值
  convertEnumeratedValue//转换枚举属性
} from 'web/util/index'

/**
 * @description: 更新节点属性
 * @param {*} oldVnode  旧节点
 * @param {*} vnode 新节点
 * @return {*}
 */
function updateAttrs (oldVnode: VNodeWithData, vnode: VNodeWithData) {

  const opts = vnode.componentOptions //获取新节点的组件

  if (isDef(opts) && opts.Ctor.options.inheritAttrs === false) {
       
    return

  }
  
  if (isUndef(oldVnode.data.attrs) && isUndef(vnode.data.attrs)) {

    return

  }

  let 
  key, //属性名
  cur, //当前属性值
  old //旧的属性值

  
  const elm = vnode.elm  //真实的dom

  const oldAttrs = oldVnode.data.attrs || {} //获取获取旧节点的属性值

  let attrs: any = vnode.data.attrs || {} //当前节点的属性值

  // clone observed objects, as the user probably wants to mutate it
  // 克隆 观察对象，因为用户可能想要改变它

  if (isDef(attrs.__ob__)) {

    attrs = vnode.data.attrs = extend({}, attrs)

  }

  for (key in attrs) {

    //遍历当前的属性值
    cur = attrs[key]

    old = oldAttrs[key]

    if (old !== cur) {
      //当属性值不同时
      setAttr(elm, key, cur)

    }

  }
  // #4391: in IE9, setting type can reset value for input[type=radio]
  // #6666: IE/Edge forces progress value down to 1 before setting a max
  /* istanbul ignore if */
  if ((isIE || isEdge) && attrs.value !== oldAttrs.value) {
    setAttr(elm, 'value', attrs.value)
  }
  for (key in oldAttrs) {
    if (isUndef(attrs[key])) {
      if (isXlink(key)) {
        elm.removeAttributeNS(xlinkNS, getXlinkProp(key))
      } else if (!isEnumeratedAttr(key)) {
        elm.removeAttribute(key)
      }
    }
  }
}

/**
 * @description: 设置属性值
 * @param {*} el 真实的dom
 * @param {*} key 属性名
 * @param {*} value 属性值
 * @return {*}
 */
function setAttr (el: Element, key: string, value: any) {

  if (el.tagName.indexOf('-') > -1) {
      //如果标签名存在 - 符号时
    baseSetAttr(el, key, value)

  } else if (isBooleanAttr(key)) {
    //如果是boolean值的属性

    // set attribute for blank value
    // e.g. <option disabled>Select one</option>

    if (isFalsyAttrValue(value)) {
        //如果是假值 旧删除改属性
      el.removeAttribute(key)

    } else {

      // technically allowfullscreen is a boolean attribute for <iframe>,
      // but Flash expects a value of "true" when used on <embed> tag

      value = key === 'allowfullscreen' && el.tagName === 'EMBED'
        ? 'true'
        : key
      el.setAttribute(key, value)
    }

  } else if (isEnumeratedAttr(key)) {

     //如果是枚举类型的属性
    el.setAttribute(key, convertEnumeratedValue(key, value)) //转换未枚举在进行属性设置

  } else if (isXlink(key)) {
    //svg属性
    if (isFalsyAttrValue(value)) {
      el.removeAttributeNS(xlinkNS, getXlinkProp(key))
    } else {
      el.setAttributeNS(xlinkNS, key, value)
    }
  } else {

    baseSetAttr(el, key, value)

  }
}

/**
 * @description: 除了一些特定的属性 其他的属性的设置方式
 * @param {*} el
 * @param {*} key
 * @param {*} value
 * @return {*}
 */
function baseSetAttr (el, key, value) {

  if (isFalsyAttrValue(value)) {
    //如果属性值不存在  移除该属性
    el.removeAttribute(key)

  } else {

    // #7138: IE10 & 11 fires input event when setting placeholder on
    // <textarea>... block the first input event and remove the blocker
    // immediately.
    /* istanbul ignore if */

    if (
      isIE && !isIE9 &&
      el.tagName === 'TEXTAREA' &&
      key === 'placeholder' && value !== '' && !el.__ieph
    ) {
     //设置占位符时触发输入事件
      const blocker = e => {

        e.stopImmediatePropagation()

        el.removeEventListener('input', blocker)

      }

      el.addEventListener('input', blocker)

      // $flow-disable-line
      el.__ieph = true /* IE placeholder patched */

    }

    el.setAttribute(key, value)

  }
}

export default {
  create: updateAttrs,
  update: updateAttrs
}
