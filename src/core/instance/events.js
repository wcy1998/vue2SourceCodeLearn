/* @flow */

import {
  tip,
  toArray,
  hyphenate,
  formatComponentName,
  invokeWithErrorHandling
} from '../util/index'
import { updateListeners } from '../vdom/helpers/index'

/**
 * @description: 初始化事件
 * @param {*} vm 当前vue实例
 * @return {*}
 */
export function initEvents (vm: Component) {

  //给vue实例添加_events属性
  vm._events = Object.create(null)

  //给vue实例添加_hasHookEvent属性
  vm._hasHookEvent = false

  //渲染根vue实例时是不存在的
  //父级元素的监听事件
  const listeners = vm.$options._parentListeners 

  if (listeners) {
    updateComponentListeners(vm, listeners) //根据当前实例已存在的事件，进行更新
  }

}


let target: any 

function add (event, fn) {

  target.$on(event, fn)

}

function remove (event, fn) {

  target.$off(event, fn)

}

function createOnceHandler (event, fn) {

  const _target = target

  return function onceHandler () {

    const res = fn.apply(null, arguments)

    if (res !== null) {

      _target.$off(event, onceHandler)

    }
    
  }
  
}


//给组件注册事件
export function updateComponentListeners (
  vm: Component, //当前vue实例
  listeners: Object, //父级的监听函数
  oldListeners: ?Object //一些老的监听函数
) {

  target = vm

  updateListeners(listeners, oldListeners || {}, add, remove, createOnceHandler, vm)

  target = undefined
  
}


/**
 * @description:  在 ./index 中调用
 * @param {*} Vue 对象
 * @return {*}
 */
export function eventsMixin (Vue: Class<Component>) {
  const hookRE = /^hook:/
    //在VUE原型链上添加 $on属性 提供方法  监听当前实例上的自定义事件。事件可以由 vm.$emit 触发。回调函数会接收所有传入事件触发函数的额外参数。
  Vue.prototype.$on = function (event: string | Array<string>, //自定义的事件名
     fn: Function //事件的回调函数
     ): Component { //返回当前vue实例

    const vm: Component = this

    if (Array.isArray(event)) {
          //当监听的自定义事件 为一个数组时
      for (let i = 0, l = event.length; i < l; i++) {
        //多次监听
        vm.$on(event[i], fn)
      }

    } else {

      //当监听的事件为一个字符串时
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      //当前vue实例存在添加的自定义事件时 清空events 并推入回调函数函数
       
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      //通过使用在注册时标记的布尔标志而不是哈希查找来优化钩子：事件成本

      if (hookRE.test(event)) {
         //当时hook函数时 
        vm._hasHookEvent = true

      }

    }

    return vm

  }

   //在VUE原型链上添加 $once属性监听一个自定义事件，但是只触发一次。一旦触发之后，监听器就会被移除
  Vue.prototype.$once = function (event: string, //事件名称
     fn: Function //回调函数
     ): Component {

    const vm: Component = this

    function on () {
        //移除事件
      vm.$off(event, on)

      fn.apply(vm, arguments)
    }

    on.fn = fn 

    vm.$on(event, on)

    return vm

  }
 //在VUE原型链上添加 $off 移除自定义事件监听器。
 //如果没有提供参数，则移除所有的事件监听器；
 //如果只提供了事件，则移除该事件所有的监听器；
 //如果同时提供了事件与回调，则只移除这个回调的监听器。

  Vue.prototype.$off = function (event?: string | Array<string>, //事件名
     fn?: Function //回调函数
     ): Component { //返回当前实例
    const vm: Component = this

    // /当没有传入参数 直接清空自定义监听事件
    if (!arguments.length) {

      vm._events = Object.create(null)

      return vm

    }

    // 当传了事件名时 
    if (Array.isArray(event)) {

      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn)
      }

      return vm

    }

    //传了具体的函数名
    const cbs = vm._events[event]

    if (!cbs) {
        
      return vm

    }

     //当没有传入回调函数 清空改事件的所有回调
    if (!fn) {

      vm._events[event] = null

      return vm

    }

    // specific handler 清楚单个自定义 事件 回调
    let cb

    let i = cbs.length

    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }


   //在VUE原型链上添加$emit 触发当前实例上的事件。附加参数都会传给监听器回调。
  /**
   * @description: 
   * @param {event}  事件名称
   * @return {*}
   */
  Vue.prototype.$emit = function (event: string): Component {

    const vm: Component = this

    if (process.env.NODE_ENV !== 'production') {

      const lowerCaseEvent = event.toLowerCase() //获取事件的小写

      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
          //如果小写名称 不等于 传入的名称 并且 当前实例事件中不存在 这个事件
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }

    }

    let cbs = vm._events[event] //获取当前事件的回调函数调用栈

    if (cbs) {
      //如果存在 回调函数
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
       
      const args = toArray(arguments, 1) 

      const info = `event handler for "${event}"`

      for (let i = 0, l = cbs.length; i < l; i++) {
          //顺序执行 相关的回调函数
        invokeWithErrorHandling(cbs[i], vm, args, vm, info)

      }
    }
    
    return vm
  }

}
