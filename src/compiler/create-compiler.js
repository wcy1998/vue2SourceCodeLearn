/* @flow */



import {
   extend // 将属性混合到目标对象中。
} from 'shared/util' 

import { 
  detectErrors //检测模板中的有问题的表达式
} from './error-detector'

import { createCompileToFunctionFn } from './to-function'


//生成 -- 生成创建render函数方法的解析器的方法 -- 的方法
export function createCompilerCreator (
  baseCompile: Function //基础的编译方法
  ): Function {


  return function createCompiler (baseOptions: CompilerOptions) {

    function compile (
      template: string,  //用户传入的当前vue实例的模板
      options?: CompilerOptions //编译配置
    ): CompiledResult {

      //获取最终基本编译配置  这个配置是同步平台时不同的
      const finalOptions = Object.create(baseOptions)  

      const errors = []

      const tips = []
      
      //一个编译报警函数
      let warn = (msg, range, tip) => {

        (tip ? tips : errors).push(msg)

      }

      
      if (options) {
       //用户定义了编译时的配置

        if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
          //当不是生成环境时

          //获取传入的template开头的空格数量
          const leadingSpaceLength = template.match(/^\s*/)[0].length  

          warn = (msg, range, tip) => {

            const data: WarningMessage = { msg }

            if (range) {

              if (range.start != null) {
                data.start = range.start + leadingSpaceLength
              }

              if (range.end != null) {
                data.end = range.end + leadingSpaceLength
              }

            }
            (tip ? tips : errors).push(data)
          }

        }

        if (options.modules) {
              //如果用户自己定义的编译配置 传入了modules的配置 就加上
          finalOptions.modules =

            (baseOptions.modules || []).concat(options.modules)

        }

        if (options.directives) {
           //如果用户自己定义的编译配置传入了 自定义的指令时配置时 进行扩展
          finalOptions.directives = extend(
            Object.create(baseOptions.directives || null),
            options.directives
          )

        }

        for (const key in options) {
           // 遍历用户自己定义的其他编译配置 都加入到最终的配置项中
          if (key !== 'modules' && key !== 'directives') {
            finalOptions[key] = options[key]
          }
        }
      }
 
       //设置警告函数
      finalOptions.warn = warn 

      
      //获取整个抽象语法树的渲染函数 静态节点的渲染函数 和抽象语法树
      const compiled = baseCompile(template.trim(), finalOptions)

      if (process.env.NODE_ENV !== 'production') {
        detectErrors(compiled.ast, warn)
      }

      compiled.errors = errors

      compiled.tips = tips

      return compiled
      
    }
   
    return {
      compile, 
      compileToFunctions: createCompileToFunctionFn(compile) //这个是用来生成渲染函数的编译函数
    }
  }

}
