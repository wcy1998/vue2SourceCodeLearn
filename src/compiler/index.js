/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-01-14 10:13:21
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vue\src\compiler\index.js
 */
/* @flow */

import { parse } from './parser/index' //解析模板生成ast

import { optimize } from './optimizer' //优化生成的ast结构树

import { generate } from './codegen/index' //生成渲染函数

import { createCompilerCreator } from './create-compiler' //生成 -- 生成创建render函数方法的解析器的方法 -- 的方法


//一个生成 用于 编译函数 的 编译器 但该编译器 是通过createCompilerCreator 来进行创建的
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,  //去掉空格的 template
  options: CompilerOptions //最终的options 用户自己定义的加上基于平台的一些解析节点信息的方法
): CompiledResult {

   //根据编译配置 和 模板生成 抽象语法树节点 将属性变成抽象节点的一些属性值
  const ast = parse(template.trim(), options) 
   
  if (options.optimize !== false) {
    //进行抽象语法树的优化 标记所有节点的静态属性 和 根静态属性
    optimize(ast, options) 
  }
 
  //生成render函数
  const code = generate(ast, options)  //生成渲染函数 执行render函数时就会去收集依赖了

  return {
    ast, //抽象语法树
    render: code.render, //渲染函数的字符串
    staticRenderFns: code.staticRenderFns //静态节点的渲染函数的字符串
  }
})
