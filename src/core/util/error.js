/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-08-09 15:10:16
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vue\src\core\util\error.js
 */
/* @flow */

import config from '../config'
import { warn } from './debug'
import { inBrowser, inWeex } from './env'
import { isPromise } from 'shared/util'

/**
 * @description: 错误处理
 * @param {*} err 错误对象
 * @param {*} vm 虚拟dom
 * @param {*} info 信息
 * @return {*}
 */
export function handleError (err: Error, vm: any, info: string) {
  if (vm) {
    let cur = vm
    while ((cur = cur.$parent)) {
       //当前虚拟dom存在父组件时 并将当前组件设为 父组件
      const hooks = cur.$options.errorCaptured //错误捕获钩子
      if (hooks) {
        // 当有捕获到的错误时
        for (let i = 0; i < hooks.length; i++) {
          try {
            const capture = hooks[i].call(cur, err, vm, info) === false
            if (capture) return
          } catch (e) {
            globalHandleError(e, cur, 'errorCaptured hook')
          }
        }
      }
    }
  }
  globalHandleError(err, vm, info) //全局错误处理
}

/**
 * @description:  使用错误处理调用
 * @param {*}
 * @return {*}
 */
export function invokeWithErrorHandling (
  handler: Function, //处理函数
  context: any, //vue实例
  args: null | any[],//参数
  vm: any,//vue实例
  info: string //钩子函数信息
) {

  let res
  try {
    res = args ? handler.apply(context, args) : handler.call(context) //存在函数时 调用该函数

    if (res && !res._isVue && isPromise(res)) {
      //返回的是 promisi函数
      res.catch(e => handleError(e, vm, info + ` (Promise/async)`))
    }

  } catch (e) {

    handleError(e, vm, info)

  }

  return res
}

/**
 * @description: 全局错误处理
 * @param {*} err 错误对象
 * @param {*} vm 虚拟dom
 * @param {*} info 信息
 * @return {*}
 */
function globalHandleError (err, vm, info) {
  if (config.errorHandler) {
    try {
      return config.errorHandler.call(null, err, vm, info)
    } catch (e) {
      logError(e, null, 'config.errorHandler')
    }
  }
  logError(err, vm, info)
}

/**
 * @description: 打印错误
 * @param {*} err
 * @param {*} vm
 * @param {*} info
 * @return {*}
 */
function logError (err, vm, info) {
  if (process.env.NODE_ENV !== 'production') {
    warn(`Error in ${info}: "${err.toString()}"`, vm)
  }
  /* istanbul ignore else */
  if ((inBrowser || inWeex) && typeof console !== 'undefined') {
    console.error(err)
  } else {
    throw err
  }
}
