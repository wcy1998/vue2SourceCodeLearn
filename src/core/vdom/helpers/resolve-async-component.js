/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-08-24 18:05:12
 * @LastEditors: Please set LastEditors
 * @Description:异步组件构造函数
 * @FilePath: \vue\src\core\vdom\helpers\resolve-async-component.js
 */
/* @flow */

import {
  warn,
  once,
  isDef,
  isUndef,
  isTrue,
  isObject,
  hasSymbol,
  isPromise
} from 'core/util/index'

import { createEmptyVNode } from 'core/vdom/vnode'


//这个函数目的是为了保证能找到异步组件 JS 定义的组件对象，并且如果它是一个普通对象，则调用 Vue.extend 把它转换成一个组件的构造函数。
function ensureCtor (comp: any, base) {
  if (
    comp.__esModule ||
    (hasSymbol && comp[Symbol.toStringTag] === 'Module')
  ) {
    comp = comp.default
  }
  return isObject(comp)
    ? base.extend(comp)
    : comp
}

export function createAsyncPlaceholder (
  factory: Function,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag: ?string
): VNode {
  const node = createEmptyVNode()
  node.asyncFactory = factory
  node.asyncMeta = { data, context, children, tag }
  return node
}

/**
 * @description: 异步组件生产 支持高阶组件  promise require三种方式
 * @param {*}
 * @return {*}
 */

//异步组件生产
export function resolveAsyncComponent (
  factory: Function,  //传入定义异步组件的函数
  baseCtor: Class<Component>, //基础构造器
  context: Component //当前vue实例
): Class<Component> | void {

  if (isTrue(factory.error) && isDef(factory.errorComp)) {
    //如果该组件已经加载失败 就显示错误报错的组件
    return factory.errorComp
  }

  if (isDef(factory.resolved)) {
    //如果函数已经加载成功的了 就实现成功的组件
    return factory.resolved
  }

  if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
    //当函数还在加载时   就返回加载的组件
    return factory.loadingComp
  }

  //对于 factory.contexts 的判断，是考虑到多个地方同时初始化一个异步组件，那么它的实际加载应该只有一次。
  if (isDef(factory.contexts)) {
    factory.contexts.push(context)
  } else {
   
    //将函数的上下文绑定到加载这个组件的那些vue实例
    const contexts = factory.contexts = [context]

    let sync = true

    //加载完成了刷新对应的vue实例
    const forceRender = (renderCompleted: boolean) => {
      for (let i = 0, l = contexts.length; i < l; i++) {
        contexts[i].$forceUpdate()
      }

      if (renderCompleted) {
        contexts.length = 0
      }
    }

 
    //如果组件加载成功
    const resolve = once((res: Object | Class<Component>) => {
      //工厂函数返回的组件
      factory.resolved = ensureCtor(res, baseCtor) 

      // invoke callbacks only if this is not a synchronous resolve
      // (async resolves are shimmed as synchronous during SSR)
      // 仅当这不是同步解析时才调用回调
      //（异步解析在 SSR 期间被填充为同步）
      if (!sync) {
        forceRender(true)
      } else {
        contexts.length = 0
      }
    })
 
    //如果组件加载失败
    const reject = once(reason => {
      process.env.NODE_ENV !== 'production' && warn(
        `Failed to resolve async component: ${String(factory)}` +
        (reason ? `\nReason: ${reason}` : '')
      )
      if (isDef(factory.errorComp)) {
        factory.error = true
        forceRender(true)
      }
    })


    
    //执行我们定义的方法 该方法的执行会返回一个promise对象
    const res = factory(resolve, reject)

    //如果使用的最新的异步组件配置
    if (isObject(res)) {
      if (isPromise(res)) {
        // promise 方式
        if (isUndef(factory.resolved)) {
          res.then(resolve, reject)
        }
      } else if (isPromise(res.component)) {
        //高阶组件方式
        res.component.then(resolve, reject)

        if (isDef(res.error)) {
          factory.errorComp = ensureCtor(res.error, baseCtor)
        }

        if (isDef(res.loading)) {
          factory.loadingComp = ensureCtor(res.loading, baseCtor)
          if (res.delay === 0) {
            factory.loading = true
          } else {
            setTimeout(() => {
              if (isUndef(factory.resolved) && isUndef(factory.error)) {
                factory.loading = true
                forceRender(false)
              }
            }, res.delay || 200)
          }
        }

        if (isDef(res.timeout)) {
          setTimeout(() => {
            if (isUndef(factory.resolved)) {
              reject(
                process.env.NODE_ENV !== 'production'
                  ? `timeout (${res.timeout}ms)`
                  : null
              )
            }
          }, res.timeout)
        }
      }
    }

    sync = false
    // return in case resolved synchronously
    return factory.loading
      ? factory.loadingComp
      : factory.resolved
  }
}
