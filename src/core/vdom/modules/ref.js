/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-10-13 12:58:43
 * @LastEditors: Please set LastEditors
 * @Description: ref
 * @FilePath: \vue\src\core\vdom\modules\ref.js
 */
/* @flow */

import { 
  remove, // 从数组中删除一个项目。
   isDef //判断一个值 是不是不为null 或不为 undefined
  } from 'shared/util'

export default {
  create (_: any, vnode: VNodeWithData) {
    registerRef(vnode)
  },
  update (oldVnode: VNodeWithData, vnode: VNodeWithData) {
    if (oldVnode.data.ref !== vnode.data.ref) {
      registerRef(oldVnode, true)
      registerRef(vnode)
    }
  },
  destroy (vnode: VNodeWithData) {
    registerRef(vnode, true)
  }
}

/**
 * @description: 注册ref
 * @param {*} vnode 虚拟节点
 * @param {*} isRemoval 是不是移除
 * @return {*}
 */
export function registerRef (vnode: VNodeWithData, isRemoval: ?boolean) {

  const key = vnode.data.ref //获取当前vue实例的ref

  if (!isDef(key)) return //如果为空 返回

  const vm = vnode.context //就是vue实例

  const ref = vnode.componentInstance || vnode.elm //获取Vnode的

  const refs = vm.$refs //获取vue实例已有的refs

  if (isRemoval) {
     //删除时
    if (Array.isArray(refs[key])) {

      remove(refs[key], ref) //移除指定的ref

    } else if (refs[key] === ref) {

      refs[key] = undefined //置空指定ref

    }
  } else {
      //添加ref
    if (vnode.data.refInFor) {

      if (!Array.isArray(refs[key])) {
           //如果ref不是数组
        refs[key] = [ref]

      } else if (refs[key].indexOf(ref) < 0) {
             //如果不存在就推入
        refs[key].push(ref)

      }

    } else {
      refs[key] = ref
    }

  }
}
