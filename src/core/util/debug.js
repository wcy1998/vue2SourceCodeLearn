/* @flow */

import config from '../config' //vue的开发基本配置
import { noop } from 'shared/util' //一个空执行函数

export let warn = noop //警告函数 默认是空执行

export let tip = noop  //提示函数 默认是空执行

export let generateComponentTrace = (noop: any) // work around flow check

export let formatComponentName = (noop: any)

if (process.env.NODE_ENV !== 'production') {

  //如果不是生产模式

  const hasConsole = typeof console !== 'undefined' //判断当前环境是否支持console
  const classifyRE = /(?:^|[-_])(\w)/g //不清楚

  const classify = str => str //
    .replace(classifyRE, c => c.toUpperCase())
    .replace(/[-_]/g, '')

  /**
   * @description: 警告函数
   * @param {*}
   * @return {*}
   */
  warn = (msg, vm) => {

    const trace = vm ? generateComponentTrace(vm) : '' //生成当前操作vue实例的位置信息

    if (config.warnHandler) {
      //如果存在用户通过Vue.config.warnHandler自定义的警告处理函数 则进行调用
      config.warnHandler.call(null, msg, vm, trace)
    } else if (hasConsole && (!config.silent)) {
        //如果不存在 就 console.error()
      console.error(`[Vue warn]: ${msg}${trace}`)

    }
  }

  /**
   * @description: 提示函数
   * @param {*}
   * @return {*}
   */
  tip = (msg, vm) => {
    if (hasConsole && (!config.silent)) {
      console.warn(`[Vue tip]: ${msg}` + (
        vm ? generateComponentTrace(vm) : ''
      ))
    }
  }

  /**
   * @description: 返回组件名+文件信息
   * @param {*}
   * @return {*}
   */
  formatComponentName = (vm, includeFile) => {

    if (vm.$root === vm) {
      //当是根组件时
      return '<Root>'
    }
  
     //获取vue实例的options
    const options = typeof vm === 'function' && vm.cid != null //当不是组件时
      ? vm.options //返回options
      : vm._isVue //当是vue实例时 返回vue实例的options
        ? vm.$options || vm.constructor.options
        : vm

    let name = options.name || options._componentTag //获取vue实例 的名称

    const file = options.__file //？？？

    if (!name && file) {
      //如果不存在名称 存在 file
      const match = file.match(/([^/\\]+)\.vue$/)
      name = match && match[1]
    }

    return (
      //返回组件名 + 文件信息
      (name ? `<${classify(name)}>` : `<Anonymous>`) +
      (file && includeFile !== false ? ` at ${file}` : '')
    )
  }

  /**
   * @description: 重复函数
   * @param {*}
   * @return {*}
   */
  const repeat = (str, n) => {
    let res = ''
    while (n) {
      if (n % 2 === 1) res += str
      if (n > 1) str += str
      n >>= 1
    }
    return res
  }

  /**
   * @description: 根据当前vue实例生成错误的生成位置路径
   * @param {*}
   * @return {*}
   */
  generateComponentTrace = vm => {

    if (vm._isVue && vm.$parent) {
      //如果是vue  且存在父实例时

      const tree = []

      let currentRecursiveSequence = 0 //当前递归的深度

      while (vm) {
        //当存在实例时
        if (tree.length > 0) {
          //如果tree存在信息
          const last = tree[tree.length - 1] //最里层的vue实例

          if (last.constructor === vm.constructor) {

            //如果父实例 和 子实例的构造函数相同 

            currentRecursiveSequence++ //递归层级加1

            vm = vm.$parent //继续向外递归

            continue

          } else if (currentRecursiveSequence > 0) {
            //向外递归至 父子的构造函数不同时 

            //将tree尾 替换成 [最后一个信息，和递归深度的信息]
            tree[tree.length - 1] = [last, currentRecursiveSequence] //说明当前相同构造函数的组件的嵌套深度
 
            //清空递归深度
            currentRecursiveSequence = 0

          }

        }
       
        //向tree中推入当前vue实例
        tree.push(vm)
 
        //遍历下一个
        vm = vm.$parent

      }

      return '\n\nfound in\n\n' + tree
        .map((vm, i) => `${
          i === 0 ? '---> ' : repeat(' ', 5 + i * 2)  //生成前面的空格区域
        }${
          Array.isArray(vm)
            ? `${formatComponentName(vm[0])}... (${vm[1]} recursive calls)`
            : formatComponentName(vm)
        }`)
        .join('\n')
    } else {
      //当组件不存在父实例时 直接找到当前组件信息
      return `\n\n(found in ${formatComponentName(vm)})`
    }
  }
}
