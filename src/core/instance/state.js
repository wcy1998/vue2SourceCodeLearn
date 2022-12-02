/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-02-07 15:22:16
 * @LastEditors: Please set LastEditors
 * @Description: 初始化时调用 
 * @FilePath: \vue\src\core\instance\state.js
 */
/* @flow */


import config from '../config' //vue的默认配置对象
import Watcher from '../observer/watcher'
import Dep, { pushTarget, popTarget } from '../observer/dep'
import { isUpdatingChildComponent } from './lifecycle'

import {
  set, //在对象上设置属性。 如果该属性不存在，则添加新属性并触发更改通知。
  del,
  observe,
  defineReactive, //使对象属性具有响应特性
  toggleObserving //是否开启观察属性
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  hyphenate,
  isReserved,
  handleError,
  nativeWatch,
  validateProp, //验证prop值
  isPlainObject,
  isServerRendering,
  isReservedAttribute
} from '../util/index'


/**
 * @description: 这里是内存中管理的地方
 * @param {*}
 * @return {*}
 */
const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

/**
 * @description: 代理属性 可以直接 用this.x 访问 prop data computed 中的x
 * @param {*} target 对象原型
 * @param {*} sourceKey 
 * @param {*} key
 * @return {*}
 */
export function proxy (target: Object, sourceKey: string, key: string) {

  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key] 
  }

  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }

  Object.defineProperty(target, key, sharedPropertyDefinition)  

}


//初始化props响应式绑定 
export function initState (vm: Component) {


  vm._watchers = []

  const opts = vm.$options

  //如果用户配置了props 初始化props
  if (opts.props) initProps(vm, opts.props)
 
   //如果用户配置了methods 初始化methods
  if (opts.methods) initMethods(vm, opts.methods)
 
  //如果用户配置了data 初始化data  否则观察一个空的对象
  if (opts.data) {
    initData(vm)
  } else {
    //否则观察一个空的data
    observe(vm._data = {}, true /* asRootData */)
  }

  //如果用户配置了computed 初始化computed
  if (opts.computed) initComputed(vm, opts.computed)
 
  //如果用户配置了watch 且该watch 不是 nativeWatch  初始化initWatch
  //火狐浏览器的对象 存在watch这个属性
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}


// 初始化用户配置的props 并进行响应式设置,在初始化props期间是不会收集依赖的
function initProps (
  vm: Component, //当前的vue实例
  propsOptions: Object //当前用户定义的props
  ) {

  //用户使用时实际传入的props数据
  const propsData = vm.$options.propsData || {}
 
  //用户定义的props
  const props = vm._props = {}

  //缓存的那些propKey
  const keys = vm.$options._propKeys = [] 

  //是不是根实例
  const isRoot = !vm.$parent 

  if (!isRoot) {
   //当不是根实例初始化时 不进行依赖收集
    toggleObserving(false)
  }

  for (const key in propsOptions) {

    //缓存用户定义的key值
    keys.push(key)

    //验证props 如果传的undefined 就使用default 然后处理一些boolean转换
    const value = validateProp(key, propsOptions, propsData, vm) 

    if (process.env.NODE_ENV !== 'production') {
      //如果不是生产环境
      const hyphenatedKey = hyphenate(key) //将prop键值转换为 - -形式
      if (isReservedAttribute(hyphenatedKey) ||
          config.isReservedAttr(hyphenatedKey)) {
            //如果定义的prop 是 已保留的属性值 进行 提示
        warn(
          `"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }

      //给props设置为响应的
      defineReactive(props, key, value, () => {
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })

    } else {
      //是props具有响应性
      defineReactive(props, key, value)
    }
    if (!(key in vm)) {
      //如果在vm中获取不到当前值时 进行代理
      proxy(vm, `_props`, key)
    }
  }
  toggleObserving(true)
}

/**
 * @description: 初始化用户定义的data
 * @param {*} vm
 * @return {*}
 */
function initData (vm: Component) {

  //获取用户定义的data
  let data = vm.$options.data 

  
  //如果用户定义的data是一个方法 调用该方法获取data
  //如果用户定义的是一个普通的对象
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}

  if (!isPlainObject(data)) {
    //如果返回的值不是一个对象时
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }


  const keys = Object.keys(data)
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length
  //判断props 和 methods中是否存在这些值
  while (i--) {
    const key = keys[i]
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `Method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) {
      proxy(vm, `_data`, key)
    }
  }
  // 观察该值使data 具有响应性
  observe(data, true /* asRootData */)
}


/**
 * @description: 当用户定义的data是一个方法时调用
 * @param {*} data 用户定义的data
 * @param {*} vm 当前vue实例
 * @return {*}
 */
export function getData (data: Function, vm: Component): any {

  // #7573 disable dep collection when invoking data getters

  pushTarget()

  try {
    return data.call(vm, vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  } finally {
    popTarget()
  }
}

const computedWatcherOptions = { lazy: true }

/**
 * @description: 初始化计算属性
 * @param {*} vm 当前vue实例
 * @param {*} computed  用户定义的计算属性
 * @return {*}
 */
function initComputed (vm: Component, computed: Object) {

 
  //初始化计算属性watchers
  const watchers = vm._computedWatchers = Object.create(null)

  //判断是不是服务端渲染
  const isSSR = isServerRendering()

  for (const key in computed) {
    //用户自己定义的某个计算属性的内容
    const userDef = computed[key]
 
    //判断定义是不是一个方法 如果不是 就获取 该对象的get属性
    const getter = typeof userDef === 'function' ? userDef : userDef.get

    if (process.env.NODE_ENV !== 'production' && getter == null) {
        //当传的不是一个方法时，需要使用带有get 的对象
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }

    if (!isSSR) {

       //创建一个watcher去观察这个computed的值，一旦变化就去发起响应
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions  //计算属性的watcher都是lazy的
      )
      
    }


    //组件定义的计算属性已经在组件原型。 我们只需要在这里定义实例化时定义的计算属性。
    if (!(key in vm)) {
      //如果当前vue实例中不存在该计算属性时
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}

//定义计算属性
export function defineComputed (
  target: any, //vue实例
  key: string, //计算属性值的键值
  userDef: Object | Function  //用户定义的计算属性的内容
) {
 
  //服务端渲染不需要缓存
  const shouldCache = !isServerRendering()

  if (typeof userDef === 'function') {

    //如果用户定义的是一个方法
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key) //缓存版本
      : createGetterInvoker(userDef)//不缓存的
    sharedPropertyDefinition.set = noop

  } else {

    //如果用户定义的是一个对象
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop

  }
  if (process.env.NODE_ENV !== 'production' &&
      sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  //重写计算属性的描述
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

/**
 * @description: 创建计算属性的get函数
 * @param {*} key 计算属性的键值
 * @return {*}
 */
function createComputedGetter (key) {

  return function computedGetter () {
   
    //获取当前vue实例中 该计算属性的watcher的值
    const watcher = this._computedWatchers && this._computedWatchers[key]

    if (watcher) {
      //如果存在watcher
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }
      //返回watcher的value
      return watcher.value
    }

  }

}

function createGetterInvoker(fn) {
  return function computedGetter () {
    return fn.call(this, this)
  }
}

//初始化用户定义的方法
function initMethods (vm: Component, methods: Object) {

  //获取用户定义的props
  const props = vm.$options.props 

  //遍历用户定义的methods 如果传入的methods不是一个方法，或者已经在props中定义了 那就进行提示
  //给vm上添加这个方法名称的属性 并进行bind 如果定义的不是方法就绑定一个空执行函数
  for (const key in methods) {
    if (process.env.NODE_ENV !== 'production') {
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[key]}" in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      if (props && hasOwn(props, key)) {
        //如果props中已经存在方法中的值时 进行提示
        warn(
          `Method "${key}" has already been defined as a prop.`,
          vm
        )
      }

      if ((key in vm) && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
          `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)

  }

}

/**
 * @description: 初始化vue的watch
 * @param {*} vm 当前vue实例
 * @param {*} watch 用户自己定义的watch
 * @return {*}
 */
function initWatch (vm: Component, watch: Object) {

  for (const key in watch) {
    //遍历用户自己定义的watch配置项

    //用户配置的某个watch的内容
    //handler可以是一个数组
    const handler = watch[key]

    if (Array.isArray(handler)) {
      //如果是一个数组 创建watch
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }

}

//创建一个watcher 监听变量
function createWatcher (
  vm: Component, //当前vue实例
  expOrFn: string | Function, //被监听的属性 或表达式
  handler: any, //处理函数
  options?: Object //配置项
) {
  if (isPlainObject(handler)) {

    //当处理函数是一个对象时
    options = handler

    handler = handler.handler //取出处理对象中的handler
     
  }

  if (typeof handler === 'string') {

    // watch的处理函数是可以传递一个数组的
    handler = vm[handler]

  }

  return vm.$watch(expOrFn, handler, options)
}


export function stateMixin (Vue: Class<Component>) {
   
  const dataDef = {} //data属性的描述对象
  const propsDef = {} //prop属性的描述对象
  
  dataDef.get = function () { return this._data } 
  propsDef.get = function () { return this._props }

  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function () {
       //不要直接替换当前的data 应该去修改它内部的字段
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }

    propsDef.set = function () {
        //prop是只读的
      warn(`$props is readonly.`, this)

    }
  }
  
  //将$data 映射到_data属性上  将$props 映射到_props属性上
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  Vue.prototype.$set = set //在对象上设置属性。 如果该属性不存在，则添加新属性并触发更改通知。

  Vue.prototype.$delete = del //删除属性并在必要时触发更改。


  //添加 $watche属性 提供 生成watch属性的方法
  Vue.prototype.$watch = function (
    expOrFn: string | Function, //被watch的属性 
    cb: any, //要执行的函数
    options?: Object // deep immediate //这些watch的配置
  ): Function {

    const vm: Component = this

    if (isPlainObject(cb)) {
      //当函数是对象时 创建一个watch
      return createWatcher(vm, expOrFn, cb, options)
    }

    options = options || {}

    //这是一个user watcher
    options.user = true

    //创建一个watcher 开启这个属性的监听
    const watcher = new Watcher(vm, expOrFn, cb, options)

    if (options.immediate) {
      //如果设置了immediate属性

      try {
         //执行一次函数
        cb.call(vm, watcher.value)

      } catch (error) {

        handleError(error, vm, `callback for immediate watcher "${watcher.expression}"`)

      }
    }

    return function unwatchFn () {
      watcher.teardown()
    }

  }
}
