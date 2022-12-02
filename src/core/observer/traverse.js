/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-08-20 09:30:48
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vue\src\core\observer\traverse.js
 */

import { 
  _Set as Set, //判断重复键值的set
   isObject //判断是否是对象的函数
   } from '../util/index'

import type {
   SimpleSet  //一个类型声明文件
  } from '../util/index'

import VNode from '../vdom/vnode'//一个虚拟节点类


const seenObjects = new Set() //已存在的对象

/**
 * 递归遍历一个对象以调用所有转换后的 getter，
 * 以便对象内的每个嵌套属性都被收集为“深层”依赖项。
 */

export function traverse (val: any) {

  _traverse(val, seenObjects)

  seenObjects.clear()

}


/**
 * @description: 遍历当前的data项 
 * @param {*} val 当前data项
 * @param {*} seen 用于记录的set
 * @return {*}
 */
function _traverse (val: any, seen: SimpleSet) {

  let i,
   keys

  //当前data项为数组时
  const isA = Array.isArray(val) 

  if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
    //当前data项不为数组 并且 不为对象时  或 data项被冻结了或为一个非对象时  或 data是一个虚拟节点
    //就没有必要进行深度的观察了
    return 
  }

  if (val.__ob__) {

    //如果当前val被观察过了

    //获取当前值的dep id
    const depId = val.__ob__.dep.id

    if (seen.has(depId)) {
      //如果当前的
      return
    }
    seen.add(depId)
    //当set添加 改id 如果set中不存在该值

  }

  if (isA) {
   //如果是一个数组
    i = val.length

    while (i--) _traverse(val[i], seen) //遍历当前数组的每一项
 
  } else {
    //如果是一个对象
    keys = Object.keys(val)
    i = keys.length

    while (i--) _traverse(val[keys[i]], seen) //遍历当前数组的每一项

  }

}
