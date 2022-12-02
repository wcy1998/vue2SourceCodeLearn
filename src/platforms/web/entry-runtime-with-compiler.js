


//获取一个配置对象 这些配置是一些关于开发不区分平台的一些基础配置
import config from 'core/config' 

import { 
   warn, //vue内部 进行报错警告组件位置信息的函数 用户可以自定义
   cached //利用闭包 创建纯函数的缓存版本。
   } from 'core/util/index'

import { 
   mark, //性能检测的一些方法
   measure //性能检测的一些方法
  } from 'core/util/perf'

import Vue from './runtime/index' //全局引入VUE对象


import { 
  query  // 封装后的查询元素的方法 当传入字符串时 调用原生的方法 传入元素时 直接返回
} from './util/index'

import { 
  compileToFunctions   //用于生成渲染函数的方法
 } from './compiler/index' 

import {  //一些浏览器解析属性内容时 可能会对属性换行符进行编码 此时需要特殊处理
          shouldDecodeNewlines,
          shouldDecodeNewlinesForHref
   } from './util/compat' 

//通过元素的id 返回元素的innerHtml
const idToTemplate = cached(id => { 
  const el = query(id)
  return el && el.innerHTML 
}) 

//这段代码首先缓存了原型上的 $mount 方法，再重新定义该方法
const mount = Vue.prototype.$mount

//调用 vm.$mount 方法挂载 vm，挂载的目标就是把模板渲染成最终的DOM，
//这里不是运行时runtime的vue包 所以需要一些特殊处理
Vue.prototype.$mount = function (
  el?: string | Element, //当前vue需要挂载到的对象
  hydrating?: boolean //和服务端渲染有关
): Component {

  //获取当前实例需要挂载到的真实dom
  el = el && query(el) 


  //不要直接把vue挂载到body 或者 html上
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }
  
  //就是在vue初始化时此时的options已经包含了 一些基本的配置 和 用户自定义的那些配置option
  const options = this.$options 

  //如果用户没有定义render方法时 使用vue-loader 和 仅runtime的vue包时 或者没有写人的方法
  if (!options.render) {
    //获取当前vue实例的options 的 template
    let template = options.template 

    if (template) {
      //如果存在template
      if (typeof template === 'string') {
        if (template.charAt(0) === '#') {
          //通过id去获取真实的template
          template = idToTemplate(template)

          if (process.env.NODE_ENV !== 'production' && !template) {
            //否则提示不存在template
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        //说明template是可以传一个dom元素的
        //如果传入的是一个具有nodeType对象的元素，直接使用该元素的innerHtml
        template = template.innerHTML
      } else {
        //否则进行报错
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
        //如果将vue实例进行了挂载 但是 没有传template此时 获取元素的外部HTML 就是整个挂载对象的结构
      template = getOuterHTML(el)
    }

    if (template) {
     //经过一系列的处理后 如果还存在template

      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
 
        //开始标记标记时间
        mark('compile') 

      }
 
       // 将template生成 render函数 
      const { render, staticRenderFns } = compileToFunctions(template, { 
        outputSourceRange: process.env.NODE_ENV !== 'production', //是不是生产环境
        shouldDecodeNewlines, //当前环境是否会根据a解析换行
        shouldDecodeNewlinesForHref, //当前环境是否会根据href解析换行
        delimiters: options.delimiters, //分隔符
        comments: options.comments  //注释
      }, this)

      options.render = render //设置当前vue实例的渲染函数

      options.staticRenderFns = staticRenderFns //渲染当前vue实例的静态节点的渲染函数数组

      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
 
         //标记下当前vue实例的编译时间
        measure(`vue ${this._name} compile`, 'compile', 'compile end')

      }
    }
  }

  return mount.call(this, el, hydrating) //生成了渲染函数后继续去调用通用的mount函数

}

/**
 * 获取元素的外部HTML，注意
 * <div id="test"><span style="color:red">test1</span> test2</div>
 * innerHTML的值是 <span style="color:red">test1</span> test2 
 * outerHTML的值是 <div id="test"><span style="color:red">test1</span> test2</div>
 */

// 获取元素的外部HTML
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

//向外暴露 生成vue实例渲染函数的方法
Vue.compile = compileToFunctions 
export default Vue
