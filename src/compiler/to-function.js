/* @flow */

import { noop, extend } from 'shared/util'
import { warn as baseWarn, tip } from 'core/util/debug'
import { generateCodeFrame } from './codeframe'

type CompiledFunctionResult = {
  render: Function;
  staticRenderFns: Array<Function>;
};

function createFunction (code, errors) {
  try {
    return new Function(code) //返回一个可执行的函数
  } catch (err) {
    errors.push({ err, code })
    return noop
  }
}


export function createCompileToFunctionFn (
  compile: Function //编译函数
  ): Function {

  const cache = Object.create(null) //创建一个空内存

  return function compileToFunctions (
    template: string, //当前vue实例的模板
    options?: CompilerOptions, //编译配置
    vm?: Component //当前vue实例
  ): CompiledFunctionResult {

     //获取当前options 的拷贝
    options = extend({}, options)
   
    //获取告警函数
    const warn = options.warn || baseWarn
  
    //删除告警函数
    delete options.warn

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production') {
      // detect possible CSP restriction
      //检测可能的 CSP 限制
      try {
        new Function('return 1')
      } catch (e) {
        if (e.toString().match(/unsafe-eval|CSP/)) {
          warn(
            'It seems you are using the standalone build of Vue.js in an ' +
            'environment with Content Security Policy that prohibits unsafe-eval. ' +
            'The template compiler cannot work in this environment. Consider ' +
            'relaxing the policy to allow unsafe-eval or pre-compiling your ' +
            'templates into render functions.'
          )
        }
      }
    }

    // //获取用户自定义的分割符
    const key = options.delimiters 
      ? String(options.delimiters) + template
      : template

    if (cache[key]) { //查看内存中是否存在该模板 直接返回该模板的渲染函数
      return cache[key]
    }

    //返回整个抽象语法树的渲染函数 静态节点的渲染函数 和抽象语法树
    const compiled = compile(template, options) 

    if (process.env.NODE_ENV !== 'production') {
      //如果是开发模式
      if (compiled.errors && compiled.errors.length) {
        if (options.outputSourceRange) {
          compiled.errors.forEach(e => {
            warn(
              `Error compiling template:\n\n${e.msg}\n\n` +
              generateCodeFrame(template, e.start, e.end),
              vm
            )
          })
        } else {
          warn(
            `Error compiling template:\n\n${template}\n\n` +
            compiled.errors.map(e => `- ${e}`).join('\n') + '\n',
            vm
          )
        }
      }
      if (compiled.tips && compiled.tips.length) {
        if (options.outputSourceRange) {
          compiled.tips.forEach(e => tip(e.msg, vm))
        } else {
          compiled.tips.forEach(msg => tip(msg, vm))
        }
      }
    }

    // turn code into functions
    const res = {}

    const fnGenErrors = []
   
    //根据complied渲染函数生成真正的渲染函数
    res.render = createFunction(compiled.render, fnGenErrors) //真正的渲染函数
 
    //返回一个静态节点渲染函数的渲染函数
    res.staticRenderFns = compiled.staticRenderFns.map(code => { //静态渲染函数
      return createFunction(code, fnGenErrors)
    })

    // check function generation errors.
    // this should only happen if there is a bug in the compiler itself.
    // mostly for codegen development use
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production') {
      if ((!compiled.errors || !compiled.errors.length) && fnGenErrors.length) {
        warn(
          `Failed to generate render function:\n\n` +
          fnGenErrors.map(({ err, code }) => `${err.toString()} in\n\n${code}\n`).join('\n'),
          vm
        )
      }
    }

    return (cache[key] = res) //返回当前的渲染函数

  }
}
