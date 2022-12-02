/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-02-07 15:21:39
 * @LastEditors: Please set LastEditors
 * @Description: watcher对象
 * @FilePath: \vue\src\core\observer\watcher.js
 */
import {
  warn,//用于打印错误信息的函数
  remove,//从数组中删除一个项目。
  isObject,//检查值是否为对象。
  parsePath,//用于解析简单的路径的方法
  _Set as Set, //用于判断是否有重复值的一个set 可能是原生的也可能是自己实现的
  handleError, //错误处理方法
  noop //一个空执行函数
} from '../util/index'

import { 
  traverse  //遍历data项进行操作
} from './traverse'

import { queueWatcher } from './scheduler' //刷新观察者队列 必要时并执行

import Dep, //可观察的对象
{ 
  pushTarget, //推入观察者目标对象
  popTarget// //弹出观察者目标对象
 }
 from './dep'

import type { SimpleSet } from '../util/index' //一个set 类型

let uid = 0 //唯一标识

/**
 * 观察者解析表达式，收集依赖项，并在表达式值更改时触发回调。
 * 这用于 $watch() api 和指令。
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component; //vue实例 
  expression: string; //被监听的属性
  cb: Function; //watch执行函数
  id: number;//唯一标识
  deep: boolean; //是不是深度观察 默认false
  user: boolean; //默认false
  lazy: boolean; //默认false value不会再新建的时候就进行get函数的调用
  sync: boolean; //默认false
  dirty: boolean; //与lazy 一致 为了懒惰的观察者
  active: boolean; //是否激活
  deps: Array<Dep>; 
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function; //watch的钩子函数 renderWatch 会传入
  getter: Function; //获取值的函数
  value: any; //当前watch观察的值

   //watcher的构造函数er
  constructor (
    vm: Component, //当前vue实例
    expOrFn: string | Function, // renderWatch就是组件的update 函数 vm._update(vm._render(), hydrating)  其他的watch就是观察的值或者表达式
    cb: Function, //当前watch的执行函数 如果是renderWatch 就是一个空执行函数
    options?: ?Object, // watch的配置 options  renderWatch 会传入一个before钩子 调用 beforeUpdate钩子
    isRenderWatcher?: boolean //是否是一个renderWatcher 组件在mount的时候会生成一个renderWatch 这个时候就会传入true
  ) {

    this.vm = vm //在当前的watch实例中记录 创建它的vue实例

    if (isRenderWatcher) {
       //如果是renderWatch
       //在创建该watch的vue实例上记录 当前的watch
      vm._watcher = this

    }

     //在创建该watch的vue实例上记录 _watchers 所有与当前vue实例相关的watch
    vm._watchers.push(this) 

    if (options) {
      //如果存在配置项
      this.deep = !!options.deep //是否深度观察
      this.user = !!options.user //
      this.lazy = !!options.lazy //
      this.sync = !!options.sync //
      this.before = options.before //renderWatch 是vue内部自带的 

    } else {
     //用户没有定义watch的配置时 进行初始化设置
      this.deep = this.user = this.lazy = this.sync = false

    }

    this.cb = cb //当前watch实例 要执行的函数 handler

    this.id = ++uid // 当前watch实例的唯一标识

    this.active = true //当前watch实例 是不是active状态的

    this.dirty = this.lazy // for lazy watchers 

    this.deps = [] //初始化当前watcher实例的关联的deps数组

    this.newDeps = [] //初始化当前watchers新的deps数组，与之前的数组做对比可以 提升性能

    this.depIds = new Set() //初始化当前watcher实例的关联的deps 的 id set

    this.newDepIds = new Set() //初始化当前watcher实例的关联的deps 的 新的 id set

    this.expression = process.env.NODE_ENV !== 'production' //当前要观察的表达式对象
      ? expOrFn.toString()
      : ''


    // parse expression for getter
    if (typeof expOrFn === 'function') {
       
      this.getter = expOrFn  //如果观察的是一个函数就让 getter 为函数

    } else {

      this.getter = parsePath(expOrFn) //否则就根据表达式 返回一个getter函数

      if (!this.getter) {
        //如果不存在或者解析不出 getter 函数
        this.getter = noop

        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
        //观看路径失败，Watcher 只接受简单的点分隔路径。 要完全控制，请改用函数
      }

    }

    this.value = this.lazy //如果是lazy的就先不记录value值
      ? undefined
      : this.get()

  }


  /**
   * @description:  获取当前的value值 如果lazy为false时
   * @param {*}
   * @return {*}
   */
  get () {

    pushTarget(this) //向全局的watcher堆栈的顶部加入当前的watcher实例 ，并把dep的目标设置为当前的watcher

    let value

    const vm = this.vm //获取当前watcher实例 关联的 vue实例

    try {

      value = this.getter.call(vm, vm) //第一次 渲染时相当于 调用 vm._update(vm._render(), hydrating)

    } catch (e) {

      if (this.user) {
        //如果用户设置了 user为true 进行报错提示
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
      
    } finally {

      if (this.deep) {
        //如果是深层 watch 观察每一层
        traverse(value)
      }

      popTarget() //弹出当前watcher 取消目标设置 //更换当前dep的目标为新的栈顶元素

      this.cleanupDeps() //清空当前watcher关联的dep 记录上一次的

    }

    return value
    
  }

 
  //向当前的watcher 添加相关依赖的属性
  addDep (dep: Dep) {
    
    //获取dep的id
    const id = dep.id
     
    //如果新数组中没有改id 防止重复加入
    if (!this.newDepIds.has(id)) {
      //向新数组中加入当前dep
      this.newDepIds.add(id)
      this.newDeps.push(dep)

      if (!this.depIds.has(id)) {
        //如果当前watcher的dep数组中也没有当前dep
        dep.addSub(this) //向当前的dep对象添加当前watcher
      }

    }
  }

  /**
   * 清空deps
   */
  cleanupDeps () {

    //获取当前watcher关联的deps数组
    let i = this.deps.length

    while (i--) { 
      
      //从后往前获取当前watcher关联的每一个dep
      const dep = this.deps[i]
       
      if (!this.newDepIds.has(dep.id)) {

        //如果新的dep数组中不存在当前的dep 就将dep取消关联当前的watcher
        dep.removeSub(this)

      }

    }

  
    let tmp = this.depIds //获取当前的dep ids

    this.depIds = this.newDepIds //获取当前新的dep  ids

    this.newDepIds = tmp 

    this.newDepIds.clear() //清空新的
    
    tmp = this.deps 

    this.deps = this.newDeps

    this.newDeps = tmp

    this.newDeps.length = 0

  }

  /**
   * 更新当前watch 更新页面
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      //如果是懒更新的
      //当页面更新时就会重新的去调用get了
      this.dirty = true
    } else if (this.sync) {
      //如果是异步的
      this.run()
    } else {
      //不是异步的
      queueWatcher(this)
    }
  }

  /**
    执行更新
   */
  run () {

    if (this.active) {

      //如果是激活状态的 获取新值
      //获取当前watcher的值 调用 vm._update(vm._render(), hydrating)
      const value = this.get()

      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        //如果value不相同 或者 val 是一个对象 或者是deep的

        // set new value
        const oldValue = this.value
        this.value = value

        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          //调用执行函数
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  //lazy的watcher都会调用 computed就是 第一次调用时会走函数去获取
  evaluate () {
    this.value = this.get() //重新获取值
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
