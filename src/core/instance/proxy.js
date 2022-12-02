/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-01-11 19:45:15
 * @LastEditors: Please set LastEditors
 * @Description: 初始化代理
 * @FilePath: \vue\src\core\instance\proxy.js
 */
/* not type checking this file because flow doesn't play well with Proxy */


import config from 'core/config'

import { warn, makeMap, isNative } from '../util/index'

let initProxy

if (process.env.NODE_ENV !== 'production') {
  //不是生产模式时
  const allowedGlobals = makeMap(
    'Infinity,undefined,NaN,isFinite,isNaN,' +
    'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
    'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' +
    'require' // for Webpack/Browserify
  )

  const warnNonPresent = (target, key) => {//提示属性使用但未定义的方法
    warn(
      `Property or method "${key}" is not defined on the instance but ` +
      'referenced during render. Make sure that this property is reactive, ' +
      'either in the data option, or for class-based components, by ' +
      'initializing the property. ' +
      'See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.',
      target
    )
  }

  //实例创建之后，可以通过 vm.$data 访问原始数据对象。
  //Vue 实例也代理了 data 对象上所有的 property，因此访问 vm.a 等价于访问 vm.$data.a。
//以 _ 或 $ 开头的 property 不会被 Vue 实例代理，因为它们可能和 Vue 内置的 property、API 方法冲突。
//你可以使用例如 vm.$data._property 的方式访问这些 property。

  const warnReservedPrefix = (target, key) => {
    warn(
      `Property "${key}" must be accessed with "$data.${key}" because ` +
      'properties starting with "$" or "_" are not proxied in the Vue instance to ' +
      'prevent conflicts with Vue internals' +
      'See: https://vuejs.org/v2/api/#data',
      target
    )
  }

  const hasProxy = //当前环境是否支持 proxy语法
    typeof Proxy !== 'undefined' && isNative(Proxy)

  if (hasProxy) {
    //如果当前环境是支持 proxy语法的
 
    //内置的修饰符
    const isBuiltInModifier = makeMap('stop,prevent,self,ctrl,shift,alt,meta,exact')
    
    //重写config.keyCodes时触发
    config.keyCodes = new Proxy(config.keyCodes, {
      set (target, key, value) {
        if (isBuiltInModifier(key)) {
          //禁止重写内置修饰符的关键词
          warn(`Avoid overwriting built-in modifier in config.keyCodes: .${key}`)
          return false
        } else {
          target[key] = value
          return true
        }
      }
    })
  }

  const hasHandler = { //拦截 in 操作符
    has (target, key) {   

      const has = key in target //判断当前属性 是否在对象中

      const isAllowed = allowedGlobals(key) ||
        (typeof key === 'string' && key.charAt(0) === '_' && !(key in target.$data))
      if (!has && !isAllowed) {
        //如果不在 且 不允许是
        if (key in target.$data) warnReservedPrefix(target, key) //以 _ 或 $ 开头的 property 不会被 Vue 实例代理
        else warnNonPresent(target, key) //提示属性使用但未定义的方法
      }
      return has || !isAllowed
    }
  }

  const getHandler = { //get 处理
    /**
     * @description: 进行获取属性的提醒
     * @param {*} target 代理的目标对象
     * @param {*} key
     * @return {*}
     */
    get (target, key) {
      if (typeof key === 'string' && !(key in target)) {
        //如果属性是 字符串 且 不存在 当前对象中时
        if (key in target.$data){
          //如果该值在 对象的$data 中时
          warnReservedPrefix(target, key) //以 _ 或 $ 开头的 property 不会被 Vue 实例代理
        }else{
          warnNonPresent(target, key) //提示属性使用但未定义的方法
        } 
      }
      return target[key]
    }
  }

  initProxy = function initProxy (vm) { //初始化代理对象
    if (hasProxy) {
      //当前环境支持 proxy语法时

      //获取当前vue实例的options
      const options = vm.$options
      
      //获取
      const handlers = options.render && options.render._withStripped
        ? getHandler  //get拦截
        : hasHandler  //has拦截
      
      //当前vue实例的代理对象
      vm._renderProxy = new Proxy(vm, handlers)

    } else {
      vm._renderProxy = vm
    }
  }
}

export { initProxy }
