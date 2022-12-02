/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-02-07 11:01:36
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vue\src\core\observer\dep.js
 */
/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index' //从数组中删除一个对象
import config from '../config'

let uid = 0

//依赖收集器
export default class Dep {

  static target: ?Watcher; //当前正在处理的订阅者

  id: number; //id 每一个依赖收集器的唯一id

  subs: Array<Watcher>; //依赖的订阅者

  constructor () {

    this.id = uid++

    this.subs = [] //当前dep关联的watcher

  }

  addSub (sub: Watcher) { //添加当前dep关联的watcher
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) { //移除当前dep关联的watcher数组中指定的watcher
    remove(this.subs, sub)
  }

  
  //在访问属性的响应式属性时会 会向当前的目标watcher推入当前的dep对象
  depend () {

    if (Dep.target) {
       //如果当前观察对象存在 目标watcher
      Dep.target.addDep(this) 

    }

  }

  notify () {


    const subs = this.subs.slice() //获取当前dep关联的watcher

    if (process.env.NODE_ENV !== 'production' && !config.async) {
      
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
    //如果不运行异步，则 subs 不会在调度程序中排序
       // 我们现在需要对它们进行排序以确保它们正确触发
       // 命令
      subs.sort((a, b) => a.id - b.id)

    }

    for (let i = 0, l = subs.length; i < l; i++) {
      //遍历订阅者
      //就是调用相关watcher的所有update方法
      subs[i].update() //调用订阅者的update
    }

  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time. 正在评估的当前目标观察者。 这是全球唯一的，因为一次只能评估一个观察者。
Dep.target = null

const targetStack = [] // 一个维护当前watcher的堆栈

export function pushTarget (target: ?Watcher) {
  targetStack.push(target) //向watcher堆栈顶部加入 当前的watcher
  Dep.target = target //设置当前dep的目标为当前的watcher
}

export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
