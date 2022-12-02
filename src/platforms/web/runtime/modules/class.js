/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-10-13 13:24:31
 * @LastEditors: Please set LastEditors
 * @Description: class更新相关操作
 * @FilePath: \vue\src\platforms\web\runtime\modules\class.js
 */
/* @flow */

import {
  isDef, //是不是不为null
  isUndef //是不是为null
} from 'shared/util'

import {
  concat, //拼接类名方法
  stringifyClass,// 字符串化 类名
  genClassForVnode // 生成虚拟节点的class方法
} from 'web/util/index'

/**
 * @description: 更新class
 * @param {*} oldVnode 旧节点
 * @param {*} vnode 新节点
 * @return {*}
 */
function updateClass (oldVnode: any, vnode: any) {

  const el = vnode.elm //获取新节点的真实dom

  const data: VNodeData = vnode.data //获取新节点的数据

  const oldData: VNodeData = oldVnode.data //获取旧节点的数据

  if (
    isUndef(data.staticClass) &&
    isUndef(data.class) && (
      isUndef(oldData) || (
        isUndef(oldData.staticClass) &&
        isUndef(oldData.class)
      )
    )
  ) {
    //如果不存在class就不执行
    return
  }

  let cls = genClassForVnode(vnode) //生成当前节点的class

  // 处理 过度类 名
  const transitionClass = el._transitionClasses //节点的过度类

  if (isDef(transitionClass)) {

     //如果节点的过度类不为空
    cls = concat(cls, stringifyClass(transitionClass)) //当前节点类名加上过度类名

  }

  if (cls !== el._prevClass) {
    //如果 与之前不同 就设置类名
    el.setAttribute('class', cls)
    el._prevClass = cls
  }
}

export default {
  create: updateClass,
  update: updateClass
}
