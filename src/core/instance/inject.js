/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-02-07 14:53:45
 * @LastEditors: Please set LastEditors
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: \vue\src\core\instance\inject.js
 */
/* @flow */

import { hasOwn } from 'shared/util'
import { warn, hasSymbol } from '../util/index'
import { defineReactive, toggleObserving } from '../observer/index'



//初始化当前vue实例的provide属性
export function initProvide (vm: Component) {
  
  //获取用户定义的provide相关信息
  const provide = vm.$options.provide
  if (provide) {
    //如果用户配置了provide，将这些值放到vm对象上
    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide
  }
}


//初始化将inject配置的provide值放入当前vue实例中，并使其具有响应性
export function initInjections (vm: Component) {

  //找到inject相关的那些provide值
  const result = resolveInject(vm.$options.inject, vm) 

  if (result) {
    //如果存在结果
    toggleObserving(false) //停止observe

    Object.keys(result).forEach(key => {
      if (process.env.NODE_ENV !== 'production') {
        //使这些provide的值具有响应性
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
            `overwritten whenever the provided component re-renders. ` +
            `injection being mutated: "${key}"`,
            vm
          )
        })
      } else {
        defineReactive(vm, key, result[key])
      }
    })

    toggleObserving(true)

  }

}

//获取当前实例的inject注入信息
export function resolveInject (
  inject: any, //用户定义的inject信息
  vm: Component
  ): ?Object {
  if (inject) {


    const result = Object.create(null) 
          
    const keys = hasSymbol
      ? Reflect.ownKeys(inject)  
      : Object.keys(inject) 
 


      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        //  如果key值  遇到__ob__对象就跳过
        if (key === '__ob__') continue

        //获取inject配置中某项的from值
        const provideKey = inject[key].from

        //获取当前vue实例
        let source = vm

        //从当前实例开始不断的向父实例去搜索，将最先找到的provide值放入result中
        while (source) {

          if (source._provided && hasOwn(source._provided, provideKey)) {

            result[key] = source._provided[provideKey]

            break

          }
          source = source.$parent
          
        }
        
        //如果找不到的话 就使用inject中的默认值
        if (!source) {
          if ('default' in inject[key]) {
            const provideDefault = inject[key].default
            result[key] = typeof provideDefault === 'function'
              ? provideDefault.call(vm)
              : provideDefault
          } else if (process.env.NODE_ENV !== 'production') {
            warn(`Injection "${key}" not found`, vm)
          }
        }

      }
    return result
  }
}
