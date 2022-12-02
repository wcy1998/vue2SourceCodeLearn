/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-08-20 10:02:45
 * @LastEditors: Please set LastEditors
 * @Description: 一系列 封装后 的 DOM 操作的方法
 * @FilePath: \vue\src\platforms\web\runtime\node-ops.js
 */

import { namespaceMap } from 'web/util/index'

/**
 * @description: 创建一个 真实dom
 * @param {*} tagName 标签名
 * @param {*} vnode 虚拟dom
 * @return {*}
 */
export function createElement (tagName: string, vnode: VNode): Element {

  const elm = document.createElement(tagName)
  //创建指定的dom

  if (tagName !== 'select') {
     //当tagname 不为 select是返回创建的dom
    return elm
  }

  // false or null will remove the attribute but undefined will not
  //false 或 null 将删除该属性，但 undefined 不会
  if (vnode.data && vnode.data.attrs && vnode.data.attrs.multiple !== undefined) {
    //当虚拟dom的data 存在 vnode的attrs存在 
    elm.setAttribute('multiple', 'multiple')
  }
  return elm
}


/**
 * @description: 通过命名空间创建dom 
 * document.createElementNS与document.createElement类似，也用于创建标签节点，
 * 只是它需要一个额外的命名空间URI作为参数。此命名空间用于标识该节点属于哪种XML类型。
 * @param {*} namespace
 * @param {*} tagName
 * @return {*}
 */
export function createElementNS (namespace: string, tagName: string): Element {
  return document.createElementNS(namespaceMap[namespace], tagName)
}

/**
 * @description: 创建一个文本节点
 * @param {*} text
 * @return {*}
 */
export function createTextNode (text: string): Text {
  return document.createTextNode(text)
}

/**
 * @description: 创建一个注释节点
 * @param {*} text
 * @return {*}
 */
export function createComment (text: string): Comment {
  return document.createComment(text)
}

/**
 * @description: 插入元素之前
 * @param {*} parentNode 父节点
 * @param {*} newNode 要插入的节点
 * @param {*} referenceNode 被插入之前的节点
 * @return {*}
 */
export function insertBefore (parentNode: Node, newNode: Node, referenceNode: Node) {
  parentNode.insertBefore(newNode, referenceNode)
}

/**
 * @description: 移除节点
 * @param {*} node 被移除节点的元素
 * @param {*} child 要移除的节点
 * @return {*}
 */
export function removeChild (node: Node, child: Node) {
  node.removeChild(child)
}

export function appendChild (node: Node, child: Node) {
  node.appendChild(child)
}


//返回当前dom的父dom
export function parentNode (node: Node): ?Node {
  return node.parentNode
}

/**
 * @description: 返回节点的兄弟节点
 * @param {*} node
 * @return {*}
 */
export function nextSibling (node: Node): ?Node {
  return node.nextSibling
}

/**
 * @description: 返回节点的标签名称
 * @param {*} node
 * @return {*}
 */
export function tagName (node: Element): string {
  return node.tagName
}

/**
 * @description: 给指定节点更换文本
 * @param {*} node
 * @param {*} text
 * @return {*}
 */
export function setTextContent (node: Node, text: string) {
  node.textContent = text
}

/**
 * @description: 给节点添加scoped id属性
 * @param {*} node
 * @param {*} scopeId
 * @return {*}
 */
export function setStyleScope (node: Element, scopeId: string) {
  node.setAttribute(scopeId, '')
}
