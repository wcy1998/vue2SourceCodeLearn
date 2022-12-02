/* @flow */

import {
  warn,
  nextTick,
  emptyObject,
  handleError,
  defineReactive
} from '../util/index'

import { createElement } from '../vdom/create-element'
import { installRenderHelpers } from './render-helpers/index'
import { resolveSlots } from './render-helpers/resolve-slots'
import { normalizeScopedSlots } from '../vdom/helpers/normalize-scoped-slots'
import VNode, { createEmptyVNode } from '../vdom/vnode'

import { isUpdatingChildComponent } from './lifecycle'


/**
 * @description: 初始化渲染
 * @param {*} vm
 * @return {*}
 */
export function initRender (vm: Component) {

  vm._vnode = null //初始化当前vue实例的_vnode属性

  vm._staticTrees = null //初始化当前vue实例的_staticTrees属性    v-once cached trees 

  const options = vm.$options //获取当前vue实例的options
 
  //渲染根vue实例 不存在_parentVnode $vnode
  const parentVnode = vm.$vnode = options._parentVnode //针对于组件

  //渲染根vue实例 不存在context
  const renderContext = parentVnode && parentVnode.context //针对于组件

  //渲染根vue实例 不存在$slots               
  //通过vue实例的_renderChildren  renderContext 去获取当前vue实例的插槽
  vm.$slots = resolveSlots(options._renderChildren, renderContext) 
 
  //渲染根vue实例 不存在$scopedSlots  初始化插槽作用域  
  vm.$scopedSlots = emptyObject


  //渲染函数中需要的_c生成虚拟节点的 template的
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)

  //渲染函数中需要的_c生成虚拟节点的   用户编写的渲染函数。 用于render函数的渲染函数
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)

  // 公开 $attrs 和 $listeners 以便于创建 HOC。
  // 它们需要具有反应性，以便使用它们的 HOC 始终更新

  //获取parentNode 的 data属性
  const parentData = parentVnode && parentVnode.data //获取父节点的data

  //组件中才会用到
  if (process.env.NODE_ENV !== 'production') {
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$attrs is readonly.`, vm)
    }, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$listeners is readonly.`, vm)
    }, true)

  } else {
    //使parentData.attrs 具有响应性
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, null, true)
    
    //使parentData._parentListeners 具有响应性
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, null, true)
  }

}

export function renderMixin (Vue: Class<Component>) {

  //安装一些帮助渲染的函数
  installRenderHelpers(Vue.prototype)

  Vue.prototype.$nextTick = function (fn: Function) {
    return nextTick(fn, this)
  }

  /**
   * @description:  将一个vue实例转换成虚拟节点
   * @param {*}
   * @return {*}
   */
  Vue.prototype._render = function (): VNode {

    const vm: Component = this //获取当前vue实例

    //这里的 _parentVnode 就是当前组件的父 VNode，而 render 函数生成的 vnode 当前组件的渲染 vnode，
    //vnode 的 parent 指向了 _parentVnode，也就是 vm.$vnode，它们是一种父子的关系。

    const { 
      render,  //当前实例的render 函数
      _parentVnode  //如果是组件渲染时 就有这个了 就是上一级中组件标签的vnode 
    } = vm.$options 

    if (_parentVnode) {
      //如果是组件实例 存在组件vnode

      //设置当前组件vue实例的作用域插槽
      vm.$scopedSlots = normalizeScopedSlots(
        _parentVnode.data.scopedSlots, //设置在组件中的那些插槽作用域信息
        vm.$slots 
      )

    }

    //就是当前vue实例 所表示的那个组件的vnode
    vm.$vnode = _parentVnode 

    // render self
    let vnode

    try {
       //调用 当前的vue实例的render 方法生成 虚拟节点
      vnode = render.call(vm._renderProxy, vm.$createElement) 

    } catch (e) {
      handleError(e, vm, `render`)
      // return error render result,
      // or previous vnode to prevent render error causing blank component
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production' && vm.$options.renderError) {
        try {
          vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e)
        } catch (e) {
          handleError(e, vm, `renderError`)
          vnode = vm._vnode
        }
      } else {
        vnode = vm._vnode
      }
    }

    // 如果render函数返回的是单个元素的数组 取出改元素
    if (Array.isArray(vnode) && vnode.length === 1) {
      vnode = vnode[0]
    }
    //如果渲染函数返回的不是一个vnode 就返回一个空的节点
    if (!(vnode instanceof VNode)) {
      if (process.env.NODE_ENV !== 'production' && Array.isArray(vnode)) {
        warn(
          'Multiple root nodes returned from render function. Render function ' +
          'should return a single root node.',
          vm
        )
      }
      vnode = createEmptyVNode()
    }

    // set parent
    vnode.parent = _parentVnode
    
    return vnode
  }
}
