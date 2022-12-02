








/* @flow */

import Vue from 'core/index' //真正的vue对象

import config from 'core/config' //vue的一些跨平台的基本配置

import { 
  extend,//合并属性 将后者的属性合并到前者之中
   noop //空执行
   } from 'shared/util'

import { 
  mountComponent //挂载方法 vue实例调用mounted（）时调用
 } from 'core/instance/lifecycle' 

import { 
   devtools, //是否存在devtool
   inBrowser //是否是浏览器环境
   } from 'core/util/index'

import {
  query,//封装的查询元素方法
  mustUseProp,//必须使用prop的方法  web开发环境中的mustUseProp 用于覆盖基本的配置
  isReservedTag,//判断是不是保留的标签 web开发环境中的isReservedTag 用于覆盖基本的配置
  isReservedAttr,//判断是不是保留的属性  web开发环境中的isReservedAttr 用于覆盖基本的配置
  getTagNamespace,//获取标签的命名空间 web开发环境中的getTagNamespace 用于覆盖基本的配置
  isUnknownElement//是不是未知元素 web开发环境中的isUnknownElement 用于覆盖基本的配置
} from 'web/util/index'

import { patch } from './patch' //patch方法

import platformDirectives from './directives/index' //指令

import platformComponents from './components/index'//组件

// install platform specific utils
// 安装特定于平台的一些方法
Vue.config.mustUseProp = mustUseProp
Vue.config.isReservedTag = isReservedTag
Vue.config.isReservedAttr = isReservedAttr
Vue.config.getTagNamespace = getTagNamespace
Vue.config.isUnknownElement = isUnknownElement

// install platform runtime directives & components
// 安装指令的一些钩子函数
extend(Vue.options.directives, platformDirectives) 
//安装过渡动画的组件
extend(Vue.options.components, platformComponents) 
 
// _update 的核心就是调用 vm.__patch__ 方法，这个方法实际上在不同的平台，比如 web 和 weex 上的定义是不一样的，
//可以看到，甚至在 web 平台上，是否是服务端渲染也会对这个方法产生影响。因为在服务端渲染中，没有真实的浏览器 DOM 环境，
//所以不需要把 VNode 最终转换成 DOM，因此是一个空函数，而在浏览器端渲染中，它指向了 patch 方法
Vue.prototype.__patch__ = inBrowser ? patch : noop


// 公共挂载方法
Vue.prototype.$mount = function (
  el?: string | Element, //真实的dom
  hydrating?: boolean
): Component {
  //当传入元素或字符串 且在浏览器环境中 获取el元素 
  el = el && inBrowser ? query(el) : undefined 
  return mountComponent(this, el, hydrating)
}

// devtools global hook
if (inBrowser) {
  //当在浏览器环境
  setTimeout(() => {
    if (config.devtools) {
      if (devtools) {
        //开启dev工具
        devtools.emit('init', Vue)
        
      } else if (
        //如果不存在dev工具
        process.env.NODE_ENV !== 'production' &&
        process.env.NODE_ENV !== 'test'
      ) {
        console[console.info ? 'info' : 'log'](
          'Download the Vue Devtools extension for a better development experience:\n' +
          'https://github.com/vuejs/vue-devtools'
        )
      }
    }
    if (process.env.NODE_ENV !== 'production' &&
      process.env.NODE_ENV !== 'test' &&
      config.productionTip !== false &&
      typeof console !== 'undefined'
    ) {
      console[console.info ? 'info' : 'log'](
        `You are running Vue in development mode.\n` +
        `Make sure to turn on production mode when deploying for production.\n` +
        `See more tips at https://vuejs.org/guide/deployment.html`
      )
    }
  }, 0)

}

export default Vue
