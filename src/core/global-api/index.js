/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
    引入vue时进行初始化
 */
/* @flow */


import config from '../config' // vue 的基本的跨平台的配置
import { initUse } from './use' //提供添加插件的方法VUE.use
import { initMixin } from './mixin' //提供添加mixin的方法Vue.mixin
import { initExtend } from './extend' //用于生成子构造函数 组件都是调用该方法生成子构造函数的
import { initAssetRegisters } from './assets' //Vue 是初始化了 3 个全局函数
import { 
   set, //$set
   del  //$del
   } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants' //vue构造函数初始化时 options 的一些初始项  'component', 'directive', 'filter'
import builtInComponents from '../components/index'//vue 的内置组件
import { 
  observe //观察一个属性
 } from 'core/observer/index'

import {
  warn, //警告方法
  extend, //合并属性
  nextTick, //nextTick
  mergeOptions, //合并options
  defineReactive //响应式
} from '../util/index' //vue的工具方法

/**
 * @description: 初始化全局api 对vue实例进行 配置和添加操作
 * @param {*} Vue vue对象
 * @return {*}
 */
export function initGlobalAPI (Vue: GlobalAPI) {

  // config属性的描述对象
  const configDef = {}
  configDef.get = () => config //获取默认配置
  if (process.env.NODE_ENV !== 'production') {
    //不要整个替换vue的config，修改其中的属性就行了，默认配置对象
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }

  //不要整个替换vue的config，修改其中的属性就行了，默认配置对象
  Object.defineProperty(Vue, 'config', configDef) //给vue对象添加默认配置


  Vue.util = {
    warn, //vue的一些工具方法
    extend, //合并属性
    mergeOptions, //合并options
    defineReactive //响应性
  }

  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  //返回一个观察过的对象
  Vue.observable = (obj: T): T => {
    observe(obj)
    return obj
  }


Vue.options = Object.create(null) //初始化VUE的options

  //初始化一些options 组件 质量  filter
  ASSET_TYPES.forEach(type => {  
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  //标记构造函数
  Vue.options._base = Vue

  //加入内置组件
  extend(Vue.options.components, builtInComponents)

  initUse(Vue) //提供添加插件的功能

  initMixin(Vue) //提供合并options到VUE.mixin中的方法

  initExtend(Vue) //提供创建子构造函数的方法 VUE.extend

  initAssetRegisters(Vue) //提供三个全局方法 VUE.component, VUE.directive, VUE.filter 用于注册全局的组件 指令 

}
