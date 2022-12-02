/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-02-07 14:57:56
 * @LastEditors: Please set LastEditors
 * @Description: //向VUE的原型链中 添加_init方法 
 * @FilePath: \vue\src\core\instance\init.js
 */

//vue构造函数初始化的文件

import config from '../config' //获取vue跨平台的一些基本配置

import { initProxy } from './proxy' //代理vue实例 使我们可以在vue中不通过this获取 进行一些规范提示

import { initState } from './state' //初始化属性之类的信息

import { initRender } from './render' //

import { initEvents } from './events'//初始化事件绑定

import { mark, measure } from '../util/perf' //性能检测

import { 
  initLifecycle, //初始化生命周期
   callHook 
  } from './lifecycle'

import { initProvide, initInjections } from './inject'

import { 
  extend,
   mergeOptions, //合并options
    formatComponentName 
  } from '../util/index'

let uid = 0


// 引入vue对象时 进行vue构造函数的初始化
export function initMixin(Vue: Class<Component>) {

  
  //vue实例的初始化方法
  Vue.prototype._init = function (
    options?: Object //用户传入的options
    ) {

    const vm: Component = this //当前的vue实例
 
    vm._uid = uid++ //vue实例的唯一标识 随着创建的先后顺序进行递增

    let startTag, endTag

   
    //记录当前vue实例created的用时 开发环境才有
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag) 
    }
       
    vm._isVue = true

    if (options && options._isComponent) { 
      //_isComponent属性是vue内部生成的
      //如果是一个组件进行options的初始化
      initInternalComponent(vm, options) 

    } else {
      //第一次newVUE时会走这里 合并用户定义的options和继承好的options用于后续的渲染工作
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor), //获取VUE对象构造函数中的options 一些基本的配置，主要是vue.options.base vue.options.components 等
        options || {}, //用户自定义的options
        vm 
      )
    }


    if (process.env.NODE_ENV !== 'production') {
      //如果不是生产环境就启用代理进行一些 规范提示
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }

    // 暴露自己
    vm._self = vm

    initLifecycle(vm) //设置当前实例的父实例 和 初始化一些vue实例中关于生命周期相关的属性

    initEvents(vm) //绑定一下父级事件  初始化一些vue实例中关于事件相关的属性

    initRender(vm) //初始化一些vue实例中关于渲染相关的属性

    callHook(vm, 'beforeCreate') 

    initInjections(vm) //初始化将inject配置的provide值放入当前vue实例中，并使其具有响应性

    initState(vm) //initState 的作用是初始化 props、data使其具有响应性，初始化methods，初始化computed，watch等属性创建相应的watch监听变化

    initProvide(vm) // 在state初始化后进行这样provide就可以使用这些值作为提供的对象了

    callHook(vm, 'created')

    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      //如果不是生产环境 //进行了性能检测
      vm._name = formatComponentName(vm, false) 
      mark(endTag)
      //计算当前vue实例生成的时间
      measure(`vue ${vm._name} init`, startTag, endTag)
    }
    
    //由于组件初始化的时候是不传 el 的，因此组件是自己接管了 $mount 的过程
    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}



/**
 * @description: //组件初始实例化时操作 合并生成组件$options
 * 优化内部组件实例化，因为动态选项合并非常慢，而且没有一个内部组件选项需要特殊处理。
 * 这个过程我们重点记住以下几个点即可：
 * opts.parent = options.parent
 * opts._parentVnode = parentVnode，
 * 它们是把之前我们通过 createComponentInstanceForVnode 函数传入的几个参数合并到内部的选项 $options 里了。
 * @param {*} vm 当前vue实例 vue声明的内部选项
 * @param {*} options 用户输入的options
 * @return {*}
 */
export function initInternalComponent(vm: Component, options: InternalComponentOptions) {
  //initInternalComponent 方法首先执行 const opts = vm.$options = Object.create(vm.constructor.options)，
  //这里的 vm.constructor 就是子组件的构造函数 Sub，相当于 vm.$options = Object.create(Sub.options)。
  //接着又把实例化子组件传入的子组件父 VNode 实例 parentVnode、子组件的父 Vue 实例 parent 保存到 vm.$options 中
  //，另外还保留了 parentVnode 配置中的如 propsData 等其它的属性。
  //这么看来，initInternalComponent 只是做了简单一层对象赋值，并不涉及到递归、合并策略等复杂逻辑。


  const opts = vm.$options = Object.create(vm.constructor.options) //初始化当前组件vue实例的$options将构造函数中的options 记录当前$options的原型中

  const parentVnode = options._parentVnode//获取当前组件的vnode 就是在上一级中 组件名称的那个vnode

  opts.parent = options.parent //获取父组件实例

  opts._parentVnode = parentVnode //获取当前组件的vnode 作为当前组件实例的宿主环境

 
  //设置当前组件vue实例 的一些宿主环境传递过来的属性
  const vnodeComponentOptions = parentVnode.componentOptions //获取当组件的组件配置项 卸载组件 标签中的一些信息

  opts.propsData = vnodeComponentOptions.propsData //获取当前组件的props  赋值到当前组件上的一些props 属性等

  opts._parentListeners = vnodeComponentOptions.listeners//获取父虚拟节点的 listeners 赋值到当前组件上的一些监听函数,就是定义在组件上的那些事件

  opts._renderChildren = vnodeComponentOptions.children //获取父虚拟节点的 子节点  当前组件中的 那些文本节点等

  opts._componentTag = vnodeComponentOptions.tag //获取父虚拟节点的 标签

  if (options.render) {
    //如果是行内模板函数
    opts.render = options.render //获取render函数
    opts.staticRenderFns = options.staticRenderFns //获取静态render函数
  }
  
}

/** 
 * @description:
 * @param {*} Ctor vue的构造函数
 * @return {*}
 */
export function resolveConstructorOptions(Ctor: Class<Component>) {

  //VUE对象构造函数中的options 一些基本的配置 之类的 主要是vue.options.base vue.options.components 等
  let options = Ctor.options 
 
  //如果当前构造函数存在父构造函数
  if (Ctor.super) {
            
    //去获取当前构造函数的父级构造函数options
    const superOptions = resolveConstructorOptions(Ctor.super) 

    //获取当前构造函数缓存的父级构造函数的options
    const cachedSuperOptions = Ctor.superOptions 

    //如果缓存的和当前的不一致时
    if (superOptions !== cachedSuperOptions) {
      
      //重新设置当前构造函数的父级构造函数的缓存
      Ctor.superOptions = superOptions 

      ////获取当前构造函数更改过的options
      const modifiedOptions = resolveModifiedOptions(Ctor) //获取当前构造函数更改过的options

      //将更改过的options 覆盖当前的extendoptions
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      
      //将父级的option 和 当前更改的那些options进行合并
      options = Ctor.options = mergeOptions(
        superOptions, //父级的option
         Ctor.extendOptions //扩展的options
         )

      if (options.name) {
        //如果options存在名称，缓存当前的构造函数
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

/**
 * @description:  检查当前构造函数是否有变化
 * @param {*} Ctor 构造函数
 * @return {*}
 */
function resolveModifiedOptions(Ctor: Class<Component>): ?Object {

  let modified

  const latest = Ctor.options //当前构造函数的options
  const sealed = Ctor.sealedOptions//当前构造函数 密封的options

  for (const key in latest) {
    //遍历当前的构造函数
    if (latest[key] !== sealed[key]) {
      //如果存在不相等的
      if (!modified) modified = {}
      modified[key] = latest[key] //记录不相等的options
    }
  }

  return modified //返回不相等的options

}
