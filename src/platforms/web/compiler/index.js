/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-11-30 14:09:06
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vue\src\platforms\web\compiler\index.js
 */
/* @flow */

import { baseOptions } from './options' //基本的一些解析操作

import { createCompiler } from 'compiler/index' //生成创建render函数方法的解析器的方法

const { 
    compile,
    compileToFunctions //将html转换成render函数的方法
     } = createCompiler(baseOptions) 

export { compile, compileToFunctions }
