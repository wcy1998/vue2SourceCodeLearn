/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-01-11 17:00:58
 * @LastEditors: Please set LastEditors
 * @Description: 定义VUE的文件
 * @FilePath: \vue\src\core\instance\index.js
 */
import { initMixin } from './init' //向VUE的原型链中 添加_init方法

import { stateMixin } from './state'//属性相关

import { renderMixin } from './render'//渲染相关

import { eventsMixin } from './events'//事件相关

import { lifecycleMixin } from './lifecycle'//生命周期相关

import { warn } from '../util/index' //vue内部的告警函数

//vue对象
function Vue (options) {

  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }

  this._init(options) //初始化vue
  
}

//向VUE的原型链中 添加_init方法 用于vue实例的初始化
initMixin(Vue) 

//在VUE原型链中添加  '$data'  '$props' 属性 映射到_data,_props属性 来读取实例的data 和 props
//添加 $set $delete $watch 方法  给vue实例调用
stateMixin(Vue)
                 
//在VUE原型链中添加 $on $once $off $emit方法 给vue实例调用
eventsMixin(Vue) 

//在VUE原型链中添加 _update $forceUpdate $destroy 方法 给vue实例调用
lifecycleMixin(Vue)


//在VUE原型链中添加  _o,_n,_s,_l,_t,_q,_i,_m,_f,_k,_b,_v,_e,_u,_g,_d,_p 方法用于渲染时调用 
// $nextTick  _render（将一个vue实例转换成虚拟节点）方法  给vue实例调用
renderMixin(Vue)

export default Vue
