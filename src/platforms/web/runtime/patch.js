/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-10-13 11:23:38
 * @LastEditors: your name
 * @Description: In User Settings Edit
 * @FilePath: \vue\src\platforms\web\runtime\patch.js
 */
/* @flow */

import * as nodeOps from 'web/runtime/node-ops' // 一系列 封装后 的 DOM 操作的方法

import { createPatchFunction } from 'core/vdom/patch' //创建patch函数的方法

import baseModules from 'core/vdom/modules/index'//指令和ref的一些钩子

import platformModules from 'web/runtime/modules/index'//attrs class dom-props events style transition 一些钩子的实现




const modules = platformModules.concat(baseModules) //最终的模块 一系列用于更新的操作


export const patch: Function = createPatchFunction({ 
    nodeOps, //nodeOps 封装了一系列 DOM 操作的方法，
    modules //modules 定义了一些模块的钩子函数的实现，
 })
