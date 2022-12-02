/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-01-11 19:15:09
 * @LastEditors: Please set LastEditors
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: \vue\src\core\global-api\assets.js
 */


import { ASSET_TYPES } from 'shared/constants' // 'component','directive','filter'
import {
  isPlainObject, //判断是不是对象
  validateComponentName //检测组件名是否合法
} from '../util/index'



/**
 * @description:
 *  Vue.component 函数 进行组件的注册  定义Vue.component Vue.directive Vue.filter 三种注册函数
 * @param {*} Vue
 * @return {*} 
 */
export function initAssetRegisters(Vue: GlobalAPI) {
  ASSET_TYPES.forEach(type => {
    //VUE.component   VUE.directive  VUE.filter 
    Vue[type] = function (
      id: string, //注册的组件名称 或 指令名称
      definition: Function | Object //组件的定义 指令的定义
    ): Function | Object | void { //返回一个函数 或 对象

      if (!definition) {
        //如果没有进行组件，过滤函数，指定的定义
        return this.options[type + 's'][id] //返回options中的定义

      } else {

        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          validateComponentName(id) //验证组件名称是否合法
        }
        if (type === 'component' && isPlainObject(definition)) {
          //如果是组件 且 definition 是一个对象时
          definition.name = definition.name || id //当定义中有名字时用id替代name

          definition = this.options._base.extend(definition) //在基础构造函数上 扩展用户的定义
        }

        if (type === 'directive' && typeof definition === 'function') {
          //当注册指令时 指令定义为函数
          definition = { bind: definition, update: definition }
        }

        this.options[type + 's'][id] = definition //将注册好的 组件 或 指令 或 过滤函数 加入构造函数的options中

        return definition //返回 组件的定义  或 指令的定义 或 过滤函数的定义

      }
    }
  })
}
