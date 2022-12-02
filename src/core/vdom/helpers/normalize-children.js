/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-12-10 14:56:04
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vue\src\core\vdom\helpers\normalize-children.js
 */
/* @flow */

import VNode, { createTextVNode } from 'core/vdom/vnode'
import { isFalse, 
  isTrue, 
  isDef, 
  isUndef,// 判断一个值 是不是null 或 undefined
  isPrimitive } from 'shared/util'
  
//simpleNormalizeChildren 方法调用场景是 render 函数是编译生成的。理论上编译生成的 children 都已经是 VNode 类型的，但这里有一个例外，
//就是 functional component 函数式组件返回的是一个数组而不是一个根节点，所以会通过 Array.prototype.concat 方法把整个 children 数组打平，让它的深度只有一层。
//模板编译器试图通过在编译时静态分析模板来最小化规范化的需要。
// 对于纯 HTML 标记，可以完全跳过规范化，因为生成的渲染函数保证返回 Array<VNode>。
// 有两种情况需要额外的规范化： 1. 当子组件包含组件时 - 因为函数组件可能返回一个数组而不是单个根。
// 在这种情况下，只需要一个简单的规范化——如果有任何孩子是一个数组，我们用 Array.prototype.concat 将整个事物展平。
// 它保证只有 1 级深度，因为功能组件已经规范了他们自己的孩子。
export function simpleNormalizeChildren (children: any) { //用于编译生成的render函数  函数式组件需要
  
  for (let i = 0; i < children.length; i++) {
    //循环遍历当前节点的子节点
    if (Array.isArray(children[i])) {
      //如果是子节点是数组
      return Array.prototype.concat.apply([], children)
    }
  }

  return children
  
}



//当子元素包含总是生成嵌套数组的构造时，例如 <template>、<slot>、v-for 或当子项由用户提供手写渲染函数 / JSX 时。
// 在这种情况下，需要完全规范化以迎合所有可能类型的子值。


//手写render函数时调用
export function normalizeChildren (children: any): ?Array<VNode> {
   //先判断子节点是不是数组类型 是的话normalizeArrayChildren一下  在判断子节点是不是基本类型 是基本类型就返回一个文本的虚拟节点
  return isPrimitive(children)? [createTextVNode(children)]: Array.isArray(children)? normalizeArrayChildren(children): undefined

}

function isTextNode (node): boolean {
  return isDef(node) && isDef(node.text) && isFalse(node.isComment)
}

/**
 * @description: normalizeArrayChildren 接收 2 个参数，children 表示要规范的子节点，
 * nestedIndex 表示嵌套的索引，因为单个 child 可能是一个数组类型。
 *  normalizeArrayChildren 主要的逻辑就是遍历 children，获得单个节点 c，
 * 然后对 c 的类型判断，如果是一个数组类型，则递归调用 normalizeArrayChildren; 
 * 如果是基础类型，则通过 createTextVNode 方法转换成 VNode 类型；否则就已经是 VNode 类型了，
 * 如果 children 是一个列表并且列表还存在嵌套的情况，则根据 nestedIndex 去更新它的 key。这里需要注意一点，
 * 在遍历的过程中，对这 3 种情况都做了如下处理：如果存在两个连续的 text 节点，会把它们合并成一个 text 节点。
经过对 children 的规范化，children 变成了一个类型为 VNode 的 Array。
 * @param {*} children children 表示要规范的子节点
 * @param {*} nestedIndex 表示嵌套的索引，因为单个 child 可能是一个数组类型。
 * @return {*}
 */
function normalizeArrayChildren (children: any, nestedIndex?: string): Array<VNode> {

  const res = [] //要返回的子节点

  let i, c, lastIndex, last

  for (i = 0; i < children.length; i++) {
     //循环遍历当前节点的子节点

    c = children[i]//记录当前子节点

     //当子节点 为空时 或 节点为布尔类型时 调过当前节点遍历下一个节点
    if (isUndef(c) || typeof c === 'boolean') continue
    
    lastIndex = res.length - 1 //获取规范化后的数组的最后索引

    last = res[lastIndex] //获取 最后一个规范化后节点

    //嵌套
    if (Array.isArray(c)) {
      //当子节点是一个数组时

      if (c.length > 0) {
        //如果数组长度大于0 将子节点也进行规范化
        c = normalizeArrayChildren(c, `${nestedIndex || ''}_${i}`)

        // 合并相邻的文本节点
        if (isTextNode(c[0]) && isTextNode(last)) {
          res[lastIndex] = createTextVNode(last.text + (c[0]: any).text)
          c.shift()
        }
        //向res中推入创建好的 节点
        res.push.apply(res, c)
      }

    } else if (isPrimitive(c)) {
      //当c是原始类型时
      if (isTextNode(last)) {
        //合并相邻的文本节点，这是 SSR 水合所必需的，
        //因为文本节点在呈现为 HTML 字符串时本质上是合并的
        res[lastIndex] = createTextVNode(last.text + c)
      } else if (c !== '') {
        // convert primitive to vnode
        res.push(createTextVNode(c))
      }
    } else {
      //当子节点 不为 数组或原始类型时
      if (isTextNode(c) && isTextNode(last)) {
        //合并相邻的文本节点
        res[lastIndex] = createTextVNode(last.text + c.text)
      } else {
        // 嵌套数组子项的默认键（可能由 v-for 生成） 给嵌套数组生成key值
        if (isTrue(children._isVList) &&
          isDef(c.tag) &&
          isUndef(c.key) &&
          isDef(nestedIndex)) {
          c.key = `__vlist${nestedIndex}_${i}__`
        }
        res.push(c)
      }
    }
  }
  return res
}
