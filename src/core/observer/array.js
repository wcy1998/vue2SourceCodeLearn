/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-02-07 11:39:29
 * @LastEditors: your name
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: \vue\src\core\observer\array.js
 */
/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto) //自定义的数组方法 用来触发更新

const methodsToPatch = [
  'push', //push
  'pop', //pop
  'shift',//shift
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 * 拦截变异方法并发出事件
 */
methodsToPatch.forEach(function (method) {

  // 缓存原有的方法
  const original = arrayProto[method]

  def(arrayMethods, method, function mutator (...args) {
     
    //重写原有的数组方法 先调用原有数组方法返回 结果
    const result = original.apply(this, args)

    //获取当前数组对应的observer对象
    const ob = this.__ob__

    let inserted

    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    //观察参数数组
    if (inserted) ob.observeArray(inserted)

    // notify change
    ob.dep.notify() //调用当前对象的dep关联的watcher 的 update

    return result

  })

})
