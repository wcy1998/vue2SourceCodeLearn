/* @flow */

import { isDef, isObject } from 'shared/util'

/**
 * @description: 生成虚拟节点的class
 * @param {*} vnode 虚拟节点
 * @return {*}
 */
export function genClassForVnode (vnode: VNodeWithData): string {

  let data = vnode.data //获取虚拟节点数据

  let parentNode = vnode //记录当前节点作为父级节点

  let childNode = vnode //记录当前节点作为子级节点

  while (isDef(childNode.componentInstance)) {
       //当前节点 已经渲染时
    childNode = childNode.componentInstance._vnode //记录当前节点

    if (childNode && childNode.data) {
           //如果存在 就和并
      data = mergeClassData(childNode.data, data)

    }
  }
  while (isDef(parentNode = parentNode.parent)) {
    if (parentNode && parentNode.data) {
      data = mergeClassData(data, parentNode.data)
    }
  }
  return renderClass(data.staticClass, data.class)
}

function mergeClassData (child: VNodeData, parent: VNodeData): {
  staticClass: string,
  class: any
} {
  return {
    staticClass: concat(child.staticClass, parent.staticClass),
    class: isDef(child.class)
      ? [child.class, parent.class]
      : parent.class
  }
}

export function renderClass (
  staticClass: ?string,
  dynamicClass: any
): string {
  if (isDef(staticClass) || isDef(dynamicClass)) {
    return concat(staticClass, stringifyClass(dynamicClass))
  }
  /* istanbul ignore next */
  return ''
}

/**
 * @description: 拼接类名
 * @param {*} a
 * @param {*} b
 * @return {*}
 */
export function concat (a: ?string, b: ?string): string {
  return a ? b ? (a + ' ' + b) : a : (b || '')
}

/**
 * @description: 字符串化 类名
 * @param {*} value
 * @return {*}
 */
export function stringifyClass (value: any): string {
  if (Array.isArray(value)) {
    return stringifyArray(value)
  }
  if (isObject(value)) {
    return stringifyObject(value)
  }
  if (typeof value === 'string') {
    return value
  }
  /* istanbul ignore next */
  return ''
}

function stringifyArray (value: Array<any>): string {
  let res = ''
  let stringified
  for (let i = 0, l = value.length; i < l; i++) {
    if (isDef(stringified = stringifyClass(value[i])) && stringified !== '') {
      if (res) res += ' '
      res += stringified
    }
  }
  return res
}

function stringifyObject (value: Object): string {
  let res = ''
  for (const key in value) {
    if (value[key]) {
      if (res) res += ' '
      res += key
    }
  }
  return res
}
