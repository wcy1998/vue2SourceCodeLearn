/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-10-13 11:28:01
 * @LastEditors: Please set LastEditors
 * @Description: vue基础的指令模块
 * @FilePath: \vue\src\core\vdom\modules\directives.js
 */
/* @flow */

import { emptyNode } from 'core/vdom/patch' //一个空的vnode节点

import {
  resolveAsset, //搜索已经存在的 指令 或 组件 直接返回
   handleError //错误处理
   } from 'core/util/index'

import { mergeVNodeHook } from 'core/vdom/helpers/index'

export default {
  create: updateDirectives,
  update: updateDirectives,
  destroy: function unbindDirectives (vnode: VNodeWithData) {
    updateDirectives(vnode, emptyNode)
  }
}

/**
 * @description: 更新指令
 * @param {*} oldVnode 旧节点
 * @param {*} vnode 当前节点
 * @return {*}
 */
function updateDirectives (oldVnode: VNodeWithData, vnode: VNodeWithData) {

  if (oldVnode.data.directives || vnode.data.directives) {
    //节点存在指令时
    _update(oldVnode, vnode) //更新

  }

}

/**
 * @description: 更新指令
 * @param {*} oldVnode 旧节点
 * @param {*} vnode 新节点
 * @return {*}
 */
function _update (oldVnode, vnode) {

  const isCreate = oldVnode === emptyNode //旧节点为空时 是新建

  const isDestroy = vnode === emptyNode //新节点为空时 是删除

  const oldDirs = normalizeDirectives(oldVnode.data.directives, oldVnode.context) //规范化旧指令

  const newDirs = normalizeDirectives(vnode.data.directives, vnode.context)//规范化新指令


  const dirsWithInsert = []

  const dirsWithPostpatch = []


  let
   key, //指令名称
   oldDir, //旧指令中 对应新指令的值
    dir //当前指令值


  for (key in newDirs) {

      //遍历新的指令

    oldDir = oldDirs[key] //旧的指令值

    dir = newDirs[key] //新的指令值

    if (!oldDir) {
      //如果旧指令中不存在

      // 创建指令并绑定
      callHook(dir, 'bind', vnode, oldVnode) //绑定指令

      if (dir.def && dir.def.inserted) {
        dirsWithInsert.push(dir) //新增数据
      }

    } else {
      //如果存在指令 进行更新

      dir.oldValue = oldDir.value //记录旧指令值

      dir.oldArg = oldDir.arg //记录旧指令参数

      callHook(dir, 'update', vnode, oldVnode) //更新指令

      if (dir.def && dir.def.componentUpdated) {
           
        dirsWithPostpatch.push(dir) //如果是更新过的

      }

    }
  }

  if (dirsWithInsert.length) {
    const callInsert = () => {
      for (let i = 0; i < dirsWithInsert.length; i++) {
        callHook(dirsWithInsert[i], 'inserted', vnode, oldVnode)
      }
    }
    if (isCreate) {
      mergeVNodeHook(vnode, 'insert', callInsert)
    } else {
      callInsert()
    }
  }

  if (dirsWithPostpatch.length) {
    mergeVNodeHook(vnode, 'postpatch', () => {
      for (let i = 0; i < dirsWithPostpatch.length; i++) {
        callHook(dirsWithPostpatch[i], 'componentUpdated', vnode, oldVnode)
      }
    })
  }

  if (!isCreate) {
    for (key in oldDirs) {
      if (!newDirs[key]) {
        // no longer present, unbind
        callHook(oldDirs[key], 'unbind', oldVnode, oldVnode, isDestroy)
      }
    }
  }
}

const emptyModifiers = Object.create(null)


/**
 * @description: 规范化指令信息
 * @param {*}
 * @return {*}
 */
function normalizeDirectives (

  dirs: ?Array<VNodeDirective>,//指令信息

  vm: Component //当前组件实例上下文

): { [key: string]: VNodeDirective } {

  const res = Object.create(null) //创建一个空对象

  if (!dirs) {
      //如果不存在指令返回空
    return res
  }

  let i, dir

  for (i = 0; i < dirs.length; i++) {
    //遍历当前指令
    dir = dirs[i]

    if (!dir.modifiers) {
      //当指令不存在修饰符时
      dir.modifiers = emptyModifiers //置空指令修饰符
    }

    res[getRawDirName(dir)] = dir //向数组中添加指令

    dir.def = resolveAsset(vm.$options, 'directives', dir.name, true) //指令的默认值 是当前组件已存在的组件

  }
  return res
}

/**
 * @description: 获取指令原始名称
 * @param {*} dir
 * @return {*}
 */
function getRawDirName (dir: VNodeDirective): string {
  return dir.rawName || `${dir.name}.${Object.keys(dir.modifiers || {}).join('.')}`
}

/**
 * @description: 更新绑定指令方法
 * @param {*} dir 指令值
 * @param {*} hook 调用的类型
 * @param {*} vnode 当前节点
 * @param {*} oldVnode 旧节点
 * @param {*} isDestroy 是否是删除
 * @return {*}
 */
function callHook (dir, hook, vnode, oldVnode, isDestroy) {

  const fn = dir.def && dir.def[hook]

  if (fn) {

    try {

      fn(vnode.elm, dir, vnode, oldVnode, isDestroy) //执行指令操作

    } catch (e) {


      handleError(e, vnode.context, `directive ${dir.name} ${hook} hook`)

    }
  }
}
