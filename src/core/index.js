/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-01-11 17:35:53
 * @LastEditors: Please set LastEditors
 * @Description: 引入Vue时进行初始化
 * @FilePath: \vue\src\core\index.js
 */

import Vue from './instance/index' //vue的实例
import { initGlobalAPI } from './global-api/index'//进行vue对象的初始化
import { isServerRendering } from 'core/util/env'//是不是服务端渲染
import { FunctionalRenderContext } from 'core/vdom/create-functional-component' //服务端渲染相关

initGlobalAPI(Vue) //初始化全局Vue构造函数

Object.defineProperty(Vue.prototype, '$isServer', {
  //在vue的原型链上 添加'$isServer'属性  用于判断是不是服务端渲染
  get: isServerRendering
})

Object.defineProperty(Vue.prototype, '$ssrContext', {
    //在vue的原型链上 添加'$ssrContext'属性  用于获取服务端渲染上下文
  get () {
    return this.$vnode && this.$vnode.ssrContext
  }
})

Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

//添加版本信息
Vue.version = '__VERSION__'

export default Vue
