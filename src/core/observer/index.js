/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-02-07 15:06:34
 * @LastEditors: Please set LastEditors
 * @Description: vue观察者文件
 * @FilePath: \vue\src\core\observer\index.js
 */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * 在某些情况下，我们可能希望禁用组件内部的观察的过程
 */
export let shouldObserve: boolean = true //是否应该观察对象属性

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * 附加到每个被观察的观察者类
  * 目的。 一旦附加，观察者将转换目标
  * 对象的属性键到 getter/setter 中
  * 收集依赖项并发送更新。
 */
export class Observer {
  value: any; //被观察的值 是一个对象或者数组
  dep: Dep; //dep对象 不一定传
  vmCount: number; // 拥有此对象当做根$data的vue实例个数 number of vms that have this object as root $data

  /**
   * @description: 该对象只存在于对象或者数组
   * @param {*} value 要观察的值
   * @return {*}
   */
  constructor (value: any) {

    this.value = value  //当前observe的值

    this.dep = new Dep() //新建一个dep对象

    this.vmCount = 0 //当前对象关联的vm数量
    
    def(value, '__ob__', this)//向当前属性添加__ob__属性 执行当前observe对象

    if (Array.isArray(value)) {
      //当值为数组时
      if (hasProto) {
         //当前环境可以使用原型时
         //更改数组的原型
        protoAugment(value, arrayMethods) //用来触发更新的
      } else {
        //复制原型
        copyAugment(value, arrayMethods, arrayKeys)
      }
     
      //并观察当前的数组中的每一个值
      this.observeArray(value) //递归遍历观察数组中的所有项

    } else {
         //当值为对象时
      this.walk(value)
    }

  }

  /**
   * 当observe的值为对象时
   */
  walk (obj: Object) {
    
    //遍历当前对象的每一个值 进行set get设置
    const keys = Object.keys(obj)

    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }

  }

  /**
   * 当观察的是一个数组时
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}


//观察一个对象使其具有响应性
export function observe (
  value: any,  //对象值
  asRootData: ?boolean //是不是根对象
  ): Observer | void {

  if (!isObject(value) || value instanceof VNode) {
      //如果观察的属性不是对象  或 是vnode 类型 就停止观察
    return
  }


  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    //如果当前值已经被观察过了复用当前的__ob__
    ob = value.__ob__ 
  } else if (

    shouldObserve && //如果是observe

    !isServerRendering() && //不是服务端渲染时

    (Array.isArray(value) || isPlainObject(value)) && //是数组或者对象时

    Object.isExtensible(value) && //是可以扩展的对象

    !value._isVue //不是一个vue实例

  ) {
    //根据当前的val对象 生成一个 observer 对象
    ob = new Observer(value)
  }

  if (asRootData && ob) { 
       //如果是根属性 且存在 observer对象时 vmCount++
    ob.vmCount++  

  }
  return ob
}


 //重写一个对象属性的setter getter使其具有响应性,能收起依赖 并唤起更新

export function defineReactive (
  obj: Object, //要被复制的对象
  key: string, //对象中的某个key值
  val: any, //对象中某个key值对应的value
  customSetter?: ?Function, //自定义的回调 可能是一个告警函数
  shallow?: boolean //是否是浅层
) {

  
  const dep = new Dep() //创建一个dep对象

  //获取当前对象属性的描述对象 如果是不能configurable 的 就不进行响应式绑定
  const property = Object.getOwnPropertyDescriptor(obj, key) //获取指定属性的描述

  if (property && property.configurable === false) {
    //如果是不可配置的就返回
    return
  }

  //获取当前对象属性的 get 和 set 刚开始是不存在的
  const getter = property && property.get //获取该属性的getter
  const setter = property && property.set //获取该属性的setter

  if ((!getter || setter) && arguments.length === 2) {
     //如果有setter 或 没有getter  且只传了两个参数 设置一下val
    val = obj[key]
  }

  let childOb = !shallow && observe(val)  //如果当前值是一个对象时且不是vnode类型的值时 继续观察 返回一个观察对象

  //重写当前对象属性的set get 使其具有响应性
  Object.defineProperty(obj, key, {
    enumerable: true, //可遍历
    configurable: true, //可配置

    /**
     * @description: 当访问当前属性时就会进行依赖收集
     * @param {*}
     * @return {*}
     */
    get: function reactiveGetter () {
      
      //获取当前属性值
      const value = getter ? getter.call(obj) : val 
      
      //如果当前dep有目标
      if (Dep.target) {
        
        dep.depend() //进行依赖收集 向当前的watcher 中加入当前的dep对象信息 向dep对象中添加当前watcher信息

        if (childOb) {

          //如果当前值是一个数组或者对象 则会返回一个observe 对象
          childOb.dep.depend() //让当前的observer对象的dep 进行依赖收集

          if (Array.isArray(value)) {
            //如果当前值是一个数组时 遍历所有的值进行依赖收集
            dependArray(value)
          }
        }
      }
      return value
    },

    /**
     * @description: 当给对象属性赋值时触发 进行页面的更新
     * @param {*} newVal
     * @return {*}
     */
    set: function reactiveSetter (newVal) {
   
      //获取当前对象属性的值
      const value = getter ? getter.call(obj) : val


      if (newVal === value || (newVal !== newVal && value !== value)) {
        //如果值 没发生改变  不进行派发
        return
      }

      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
         //如果不是生产环境
        customSetter()
      }

      // #7981: for accessor properties without setter
      //如果当前属性只有get 没有set 时 不进行派发
      if (getter && !setter) return  

      //如果存在set 调用set
      if (setter) {
        //如果存在setter 调用setter
        setter.call(obj, newVal)
      } else {
        //否则让val = 新值
        val = newVal
      }
 
      //如果新的值是一个对象或者数组 重新进行响应式绑定
      childOb = !shallow && observe(newVal) 

       //通知当前属性的所有的订阅者
      dep.notify() 
      
    }

  })
}

/**
 * 在对象上设置属性。 如果该属性不存在，则添加新属性并触发更改通知。
 */
/**
 * @description:  
 * @param {*} target 新data
 * @param {*} key 键值
 * @param {*} val 旧data
 * @return {*}
 */
export function set (target: Array<any> | Object, key: any, val: any): any {

  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    //如果不存在新值 且 是基本值时 不能给 基本值 undefined null 设置响应性
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }

  if (Array.isArray(target) && isValidArrayIndex(key)) {
    //如果新值是一个数组
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }

  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * 删除属性并在必要时触发更改。
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 * 当数组被触摸时收集对数组元素的依赖关系，因为我们不能像属性 getter 那样拦截数组元素的访问。
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
