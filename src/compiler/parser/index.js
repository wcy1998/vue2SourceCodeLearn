/* @flow */

import he from 'he'
import { parseHTML } from './html-parser'
import { parseText } from './text-parser'
import { parseFilters } from './filter-parser'
import { genAssignmentCode } from '../directives/model'
import { extend, cached, no, camelize, hyphenate } from 'shared/util'
import { isIE, isEdge, isServerRendering } from 'core/util/env'

import {
  addProp, //添加prop
  addAttr, //添加属性
  baseWarn, //基础的告警方法
  addHandler, //给抽象节点添加 事件处理
  addDirective,
  getBindingAttr,
  getAndRemoveAttr,
  getRawBindingAttr,
  pluckModuleFunction,
  getAndRemoveAttrByRegex
} from '../helpers'

export const onRE = /^@|^v-on:/  //以@ 或v-on开头


export const dirRE = process.env.VBIND_PROP_SHORTHAND
  ? /^v-|^@|^:|^\./  //v- 或 @ 或 ：或 .开头
  : /^v-|^@|^:/  //v- 或 @ 或 ：开头

export const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/ //匹配for 循环的 的正则
export const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/  //匹配for循环迭代项的 正则
const stripParensRE = /^\(|\)$/g  // 匹配括号的正则 
const dynamicArgRE = /^\[.*\]$/   //匹配动态表达式的正则

const argRE = /:(.*)$/    //匹配 :*** 内容的正则
export const bindRE = /^:|^\.|^v-bind:/ //匹配 : 开头  .开头 v-bind开头的 正则
const propBindRE = /^\./ //匹配. 开头的正则
const modifierRE = /\.[^.]+/g //匹配修饰符的正则

const slotRE = /^v-slot(:|$)|^#/ //匹配v-slot的正则

const lineBreakRE = /[\r\n]/ //匹配换行的正则
const whitespaceRE = /\s+/g //匹配空格的正则

const invalidAttributeRE = /[\s"'<>\/=]/

const decodeHTMLCached = cached(he.decode) //html解码的缓存


// configurable state
export let warn: any  //告警函数
let delimiters //分隔符
let transforms //一些转变方法
let preTransforms //前置转变方法
let postTransforms //后置转变方法
let platformIsPreTag //是不是pre标签
let platformMustUseProp //是不是必须使用prop
let platformGetTagNamespace //获取命名空间的方法
let maybeComponent //是不是可能是一个组件


//创建一个抽象语法节点
export function createASTElement(
  tag: string, //标签名
  attrs: Array<ASTAttr>, //标签属性
  parent: ASTElement | void //父标签节点
): ASTElement {

  return {
    type: 1, //节点类型
    tag, //节点标签名
    attrsList: attrs, //节点属性列表
    attrsMap: makeAttrsMap(attrs),//生成属性的map结构 并根据属性名 去重
    rawAttrsMap: {},
    parent,  //节点的父节点
    attrs: {},
    children: []
  }

}

/**
 * 将template 转换成 抽象语法树
 */
export function parse(
  template: string, //当前vue实例的模板
  options: CompilerOptions //基于用户自定义和平台的基本编译配置
): ASTElement | void {

  warn = options.warn || baseWarn //获取用于提示告警的函数

  platformIsPreTag = options.isPreTag || no //判断一个字符串是不是pre

  platformMustUseProp = options.mustUseProp || no //判断是不是必须使用props元素属性

  platformGetTagNamespace = options.getTagNamespace || no //获取标签的命名空间的函数

  const isReservedTag = options.isReservedTag || no //判断是不是浏览器或vue保留的标签

  maybeComponent = (el: ASTElement) => !!el.component || !isReservedTag(el.tag) //判断一个节点是不是组件

  transforms = pluckModuleFunction(options.modules, 'transformNode') //摘取 所有模块中的transformNode 方法 class style

  preTransforms = pluckModuleFunction(options.modules, 'preTransformNode') //提取 所有模块中的preTransformNode 方法 v-model

  postTransforms = pluckModuleFunction(options.modules, 'postTransformNode') //提取 所有模块中的postTransformNode 方法 weex才有


  delimiters = options.delimiters //获取用户定义的分隔符

  const whitespaceOption = options.whitespace //空格配置

  const preserveWhitespace = options.preserveWhitespace !== false   //是否保留空格


  let warned = false //是否报错了
  //进行一次提示
  function warnOnce(msg, range) {
    if (!warned) {
      warned = true
      warn(msg, range)
    }

  }


  //当自闭和标签时 和遇到闭合标签时 触发 
  function closeElement(element) {

    //移除当前标签子节点中的空节点
    trimEndingWhitespace(element)

    if (!inVPre && !element.processed) {
      //如果节点不是 v-pre 并且 没有 processed 进行处理 处理当前节点
      element = processElement(element, options)
    }

    if (!stack.length && element !== root) {
      //如果栈空了 且当前节点不是根节点时 允许根节点是 v-if else的
      if (root.if && (element.elseif || element.else)) {
        //如果根节点时 v-if修饰的 当前节点时 v-else 或 v-else-if修饰的
        if (process.env.NODE_ENV !== 'production') {
          checkRootConstraints(element)
        }
        addIfCondition(root, {
          exp: element.elseif,
          block: element
        })
      } else if (process.env.NODE_ENV !== 'production') {
        warnOnce(
          `Component template should contain exactly one root element. ` +
          `If you are using v-if on multiple elements, ` +
          `use v-else-if to chain them instead.`,
          { start: element.start }
        )
      }
    }

    if (currentParent && !element.forbidden) {
      //如果存在父节点环境 且当前节点不是被禁止的

      if (element.elseif || element.else) {
        //如果节点存在v-if v-else 进行处理 添加if条件
        processIfConditions(element, currentParent)
      } else {
        
        if (element.slotScope) {
          //如果节点存在作用域插槽
          //获取插槽目标将父元素的scopedSlots 设置为当前的节点
          const name = element.slotTarget || '"default"';
          (currentParent.scopedSlots || (currentParent.scopedSlots = {}))[name] = element //将作用域插槽设置为当前节点
        }

        //向当前父环境推入当前的节点作为子节点
        currentParent.children.push(element)

        element.parent = currentParent

      }
    }

    //清除当前节点的子节点中那些存在作用域插槽的相关节点 这个节点现在已经存在于scopedSlots中了
    element.children = element.children.filter(c => !(c: any).slotScope)

    // 清除空节点
    trimEndingWhitespace(element)

    // check pre state
    if (element.pre) {
      //如果当前节点时pre 的 取消 v-pre状态
      inVPre = false
    }
    if (platformIsPreTag(element.tag)) {
      //如果当前节点时pre 的 取消pre状态
      inPre = false
    }
    // 调用postTransforms weex 才有
    for (let i = 0; i < postTransforms.length; i++) {
      postTransforms[i](element, options)
    }
  }


  // 移除空节点
  function trimEndingWhitespace(el) {

    // remove trailing whitespace node
    if (!inPre) {
      //如果当前标签没有被v-pre修饰
      let lastNode
      while (
        (lastNode = el.children[el.children.length - 1]) &&
        lastNode.type === 3 &&
        lastNode.text === ' '
      ) {
        //移除空节点
        el.children.pop()
      }

    }
  }

  //检查根节点限制
  function checkRootConstraints(el) {

    if (el.tag === 'slot' || el.tag === 'template') {
      //如果是slot 或 时template
      //不能使用template  和 slot 当做根节点
      warnOnce(
        `Cannot use <${el.tag}> as component root element because it may ` +
        'contain multiple nodes.',
        { start: el.start }
      )
    }
    if (el.attrsMap.hasOwnProperty('v-for')) {
      //如果更节点存在 v-for 进行报错提示
      warnOnce(
        'Cannot use v-for on stateful component root element because ' +
        'it renders multiple elements.',
        el.rawAttrsMap['v-for']
      )
    }
  }


  const stack = [] //一个栈用于同步存储当前解析到的ast节点的相关信息

  let root //当前template解析出来的第一个开始标签为根节点

  let currentParent //解析到当前内容时 的 父级标签

  let inVPre = false //当前解析到的标签是不是在v-pre中

  let inPre = false //是否在pre标签中

  //解析html生成ast
  parseHTML(
    template,  //当前vue实例的template
    {
      warn, //告警函数
      expectHTML: options.expectHTML, //期望html
      isUnaryTag: options.isUnaryTag,//是否是一元标签
      canBeLeftOpenTag: options.canBeLeftOpenTag, //是否是左开标签
      shouldDecodeNewlines: options.shouldDecodeNewlines, //是否解析换行符
      shouldDecodeNewlinesForHref: options.shouldDecodeNewlinesForHref, //是否href解析换行符
      shouldKeepComment: options.comments,//是否保留注释
      outputSourceRange: options.outputSourceRange, //是否是生成环境

      //解析开始标签，开始生成ast节点
      start(
        tag,  //标签名
        attrs,  //标签属性
        unary, //是否是自闭和标签
        start //标签在html中的起始位置
      ) {

        //获取当前标签所存在的命名空间 如果是最顶级的标签 就根据标签名判断命名空间
        const ns = (currentParent && currentParent.ns) || platformGetTagNamespace(tag)

        //如果是 svg的命名空间 且 是ie浏览器 做下兼容处理
        if (isIE && ns === 'svg') {
          attrs = guardIESVGBug(attrs)
        }

        //生成一个抽象语法节点
        let element: ASTElement = createASTElement(tag, attrs, currentParent)

        //设置当前标签的命名空间
        if (ns) {
          element.ns = ns
        }

        if (process.env.NODE_ENV !== 'production') {
          if (options.outputSourceRange) {
            element.start = start
            //原生的属性map 与attrsMap 一致
            element.rawAttrsMap = element.attrsList.reduce((cumulated, attr) => {
              cumulated[attr.name] = attr
              return cumulated
            }, {})
          }

          //验证属性名的正确性
          attrs.forEach(attr => {
            if (invalidAttributeRE.test(attr.name)) {
              warn(
                `Invalid dynamic argument expression: attribute names cannot contain ` +
                `spaces, quotes, <, >, / or =.`,
                {
                  start: attr.start + attr.name.indexOf(`[`),
                  end: attr.start + attr.name.length
                }
              )
            }

          })
        }

        //style标签 和 text/javascript类型的script标签是被禁止的
        if (isForbiddenTag(element) && !isServerRendering()) {
          element.forbidden = true
          process.env.NODE_ENV !== 'production' && warn(
            'Templates should only be responsible for mapping the state to the ' +
            'UI. Avoid placing tags with side-effects in your templates, such as ' +
            `<${tag}>` + ', as they will not be parsed.',
            { start: element.start }
          )
        }

        //处理input特殊元素 针对v-model属性进行处理 的type属性  提前处理
        for (let i = 0; i < preTransforms.length; i++) {

          element = preTransforms[i](element, options) || element

        }

        //如果当前不在v-pre包裹的元素中
        if (!inVPre) {

          //处理当前抽象节点的v-pre属性
          processPre(element)

          if (element.pre) {
            inVPre = true
          }

        }

        if (platformIsPreTag(element.tag)) {
          //如果是<pre 标签
          inPre = true
        }


        if (inVPre) {

          //如果当前节点是v-pre的
          processRawAttrs(element)

        } else if (!element.processed) {

          //解析 v-for
          processFor(element)

          //解析 v-if
          processIf(element)

          //解析v-once
          processOnce(element)

        }

        if (!root) {
          //如果不存在root
          root = element  //记录当前template解析出来的第一个开始标签为根节点

          if (process.env.NODE_ENV !== 'production') {
            //根节点不能是 slot 或 template 或包含v-for标签
            checkRootConstraints(root)
          }

        }


        if (!unary) {
          //如果当前节点不是单闭和标签 将当前节点记录为父节点
          currentParent = element
          stack.push(element)

        } else {
          //如果当前节点是单闭和标签
          //进行关闭操作
          closeElement(element)
        }
      },


      //处理结束标签
      end(
        tag,  //标签名
        start, //标签开始位置
        end //标签结束位置
      ) {

        //获取栈顶节点
        const element = stack[stack.length - 1]

        // 弹出栈顶元素
        stack.length -= 1

        //将当前的父级元素设置为 新的栈顶元素
        currentParent = stack[stack.length - 1]

        if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
          //如果不是生产环境  记录下当前元素的结束信息
          element.end = end
        }
        closeElement(element)
      },


      //处理解析出来的文本信息向父级标签插入一个文本节点
      chars(
        text: string, //文本内容
        start: number,  //文本开始位置
        end: number //文本结束位置
      ) {

        if (!currentParent) {
          if (process.env.NODE_ENV !== 'production') {
            if (text === template) {
              warnOnce(
                'Component template requires a root element, rather than just text.',
                { start }
              )
            } else if ((text = text.trim())) {
              warnOnce(
                `text "${text}" outside root element will be ignored.`,
                { start }
              )
            }
          }
          return
        }

        //如果父节点是textarea 且  placeholder属性等于当前文本 就不用在添加了
        if (isIE &&
          currentParent.tag === 'textarea' &&
          currentParent.attrsMap.placeholder === text
        ) {
          //如果文本是占位符时 返回
          return
        }

        //获取父节点的子节点
        const children = currentParent.children

        if (inPre || text.trim()) {
          //如果是pre标签内 将文本去掉首尾空格还存在
          //判断父节点是不是 'script' 'style' 节点

          text = isTextTag(currentParent) ? text : decodeHTMLCached(text)

        } else if (!children.length) {
          //如果没有子节点
          // remove the whitespace-only node right after an opening tag
          text = ''

        } else if (whitespaceOption) {

          if (whitespaceOption === 'condense') {
            // in condense mode, remove the whitespace node if it contains
            // line break, otherwise condense to a single space
            text = lineBreakRE.test(text) ? '' : ' '
          } else {
            text = ' '
          }
        } else {
          text = preserveWhitespace ? ' ' : ''
        }

        if (text) {
          //如果存在文本内容
          if (whitespaceOption === 'condense') {
            // condense consecutive whitespaces into single space
            text = text.replace(whitespaceRE, ' ')
          }

          let res

          let child: ?ASTNode

          if (!inVPre && text !== ' ' && (res = parseText(text, delimiters))) {
            //当不是 v-pre 且文本不为空 去解析文本 形成 type 为2 的节点
            child = {
              type: 2,
              expression: res.expression,
              tokens: res.tokens,
              text
            }
          } else if (text !== ' ' || !children.length || children[children.length - 1].text !== ' ') {
            //当是v-pre的直接返回文本原貌
            child = {
              type: 3,
              text
            }
          }

          if (child) {
            if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
              child.start = start
              child.end = end
            }
            //向当前父环境插入当前文本节点 或 type为2 的节点
            children.push(child)
          }

        }
      },

      //解析注释信息
      comment(text: string, start, end) {

        //不能将注释直接加到根节点上

        if (currentParent) {

          //如果当前内容存在父级标签，就是当前注释是被包裹的

          //创建一个文本的ast节点 标记是注释
          const child: ASTText = {
            type: 3,
            text,
            isComment: true
          }
          if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
            //如果是开发环境 就记录下 位置信息
            child.start = start
            child.end = end
          }
          //向当前的父级节点 加入 当前的节点
          currentParent.children.push(child)
        }
      }

    })

  //解析当前vue实例生成抽象语法树
  return root
}

//判断当前节点是否存在v-pre属性
function processPre(el) {
  if (getAndRemoveAttr(el, 'v-pre') != null) {
    el.pre = true
  }
}

//处理节点的原生属性
function processRawAttrs(el) {


  const list = el.attrsList
  const len = list.length
  if (len) {

    //如果存在属性
    const attrs: Array<ASTAttr> = el.attrs = new Array(len)

    for (let i = 0; i < len; i++) {
      attrs[i] = {
        name: list[i].name,
        value: JSON.stringify(list[i].value)
      }
      if (list[i].start != null) {
        attrs[i].start = list[i].start
        attrs[i].end = list[i].end
      }
    }
  } else if (!el.pre) {
    //如果没有属性的 且 不是 v-pre的 就是plain的
    el.plain = true
  }
}


//解析当前的元素
export function processElement(
  element: ASTElement, //抽象元素节点
  options: CompilerOptions //编译配置
) {

  //先处理抽象节点的key值，向抽象节点添加key值 并进行相关的提示
  processKey(element)

  //如果当前节点不存在 key值 且 没有插槽作用域 且没有属性 就是一个普通的plain 元素
  element.plain = (
    !element.key && //不存在key值
    !element.scopedSlots && //没有插槽作用域
    !element.attrsList.length //没有属性
  )

  //处理当前抽象节点的动态绑定的ref信息
  processRef(element)

  //处理当前抽象节点的作用域插槽相关信息
  processSlotContent(element)

  //处理slot节点的信息
  processSlotOutlet(element)

  //处理当前节点的 is 和 inline-template 信息
  processComponent(element)

  //获取出节点上的 style class信息 绑定到 节点的  staticClass classBinding 等属性上
  for (let i = 0; i < transforms.length; i++) {
    element = transforms[i](element, options) || element
  }

  //处理剩余的属性
  processAttrs(element)

  return element

}


//处理节点的key值
function processKey(el) {

  //获取当前抽象节点的key表达式
  const exp = getBindingAttr(el, 'key')

  if (exp) {
    //如果设置了key值
    if (process.env.NODE_ENV !== 'production') {
      //当不是生产模式时
      if (el.tag === 'template') {
        //如果是template标签 不用设置key值
        warn(
          `<template> cannot be keyed. Place the key on real elements instead.`,
          getRawBindingAttr(el, 'key')
        )
      }

      //不要在  transition-group 中设置 index 为key
      if (el.for) {
        const iterator = el.iterator2 || el.iterator1
        const parent = el.parent
        if (iterator && iterator === exp && parent && parent.tag === 'transition-group') {
          warn(
            `Do not use v-for index as key on <transition-group> children, ` +
            `this is the same as not using keys.`,
            getRawBindingAttr(el, 'key'),
            true /* tip */
          )
        }

      }
    }

    el.key = exp //让抽象元素的key等于表达式值

  }
}


//处理节点的ref信息
function processRef(el) {

  //获取动态绑定的ref的表达式
  const ref = getBindingAttr(el, 'ref')

  if (ref) {
    el.ref = ref
    //只要当前节点的父节点中存在 for 就算
    el.refInFor = checkInFor(el)

  }
}

//处理抽象节点的v-for相关信息
export function processFor(el: ASTElement) {

  let exp

  if ((exp = getAndRemoveAttr(el, 'v-for'))) {

    //获取v-for的表达式解析后的结果
    const res = parseFor(exp)

    if (res) {
      //如果解析成功 将这些属性合并到el抽象元素中
      extend(el, res)
    } else if (process.env.NODE_ENV !== 'production') {
      //当不是生产模式时提示v-for 格式错误
      warn(
        `Invalid v-for expression: ${exp}`,
        el.rawAttrsMap['v-for']
      )
    }
  }
}

//v-for 表达式解析完后的格式
type ForParseResult = {
  for: string; // in后面的值 就是被遍历的对象
  alias: string; // in前面的值 （）中 第一个，前面的值 表示被迭代对象的别名表示
  iterator1?: string; //第一个，后面的值
  iterator2?: string; //第二个，后面的值
};


//解析节点中的v-for信息
export function parseFor(
  exp: string //v-for的表达式内容
): ?ForParseResult {

  //正则匹配v-for的表达式
  const inMatch = exp.match(forAliasRE)

  //如果没有匹配的就返回
  if (!inMatch) return

  const res = {}

  //inMatch[2] 就是 in 后面的值
  res.for = inMatch[2].trim()

  //inMatch[1] 就是 in 前面的值 去掉（ ）
  const alias = inMatch[1].trim().replace(stripParensRE, '')

  //匹配 ，后面的内容 
  const iteratorMatch = alias.match(forIteratorRE)

  if (iteratorMatch) {

    // alias 为，前面的内容
    res.alias = alias.replace(forIteratorRE, '').trim()

    // ，后面的值
    res.iterator1 = iteratorMatch[1].trim()

    //第二个 ，后面的值
    if (iteratorMatch[2]) {
      res.iterator2 = iteratorMatch[2].trim()
    }

  } else {
    res.alias = alias
  }

  return res
}


//处理v-if相关信息
function processIf(el) {
  const exp = getAndRemoveAttr(el, 'v-if')
  if (exp) {
    el.if = exp
    addIfCondition(el, {
      exp: exp,
      block: el
    })
  } else {
    if (getAndRemoveAttr(el, 'v-else') != null) {
      el.else = true
    }
    const elseif = getAndRemoveAttr(el, 'v-else-if')
    if (elseif) {
      el.elseif = elseif
    }
  }
}


// 处理v-if的条件
function processIfConditions(el, parent) {

  //找到父节点的子节点
  const prev = findPrevElement(parent.children)

  //添加一个if条件
  if (prev && prev.if) {
    addIfCondition(prev, {
      exp: el.elseif,
      block: el
    })
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `v-${el.elseif ? ('else-if="' + el.elseif + '"') : 'else'} ` +
      `used on element <${el.tag}> without corresponding v-if.`,
      el.rawAttrsMap[el.elseif ? 'v-else-if' : 'v-else']
    )
  }
}

//找到前一个元素
function findPrevElement(children: Array<any>): ASTElement | void {
  let i = children.length
  while (i--) {
    if (children[i].type === 1) {
      return children[i]
    } else {
      if (process.env.NODE_ENV !== 'production' && children[i].text !== ' ') {
        warn(
          `text "${children[i].text.trim()}" between v-if and v-else(-if) ` +
          `will be ignored.`,
          children[i]
        )
      }
      children.pop()
    }
  }
}

//添加if条件
export function addIfCondition(
  el: ASTElement, //当前节点
  condition: ASTIfCondition //表达式条件
) {

  if (!el.ifConditions) {
    el.ifConditions = []
  }

  el.ifConditions.push(condition)

}


//处理v-once信息
function processOnce(el) {

  const once = getAndRemoveAttr(el, 'v-once')
  if (once != null) {
    el.once = true
  }
}


// 这里是兼容2.6之前的 处理当前节点的slot信息 <template slot="xxx">, <div slot-scope="xxx">
//将作用域插槽的表达式 放入el.scopeSlot中
function processSlotContent(el) {


  let slotScope //作用域插槽

  if (el.tag === 'template') {


    //获取scope 属性的值
    slotScope = getAndRemoveAttr(el, 'scope')

    if (process.env.NODE_ENV !== 'production' && slotScope) {
      warn(
        `the "scope" attribute for scoped slots have been deprecated and ` +
        `replaced by "slot-scope" since 2.5. The new "slot-scope" attribute ` +
        `can also be used on plain elements in addition to <template> to ` +
        `denote scoped slots.`,
        el.rawAttrsMap['scope'],
        true
      )
    }

    //获取slot-scope的内容
    el.slotScope = slotScope || getAndRemoveAttr(el, 'slot-scope')

  } else if ((slotScope = getAndRemoveAttr(el, 'slot-scope'))) {

    //如果是其他标签元素  获取slot-scope的属性内容

    if (process.env.NODE_ENV !== 'production' && el.attrsMap['v-for']) {
      //如果不是生产模式 且当前节点 是v-for slot-scope 不推荐一起使用 应该用一层template 包裹一下
      warn(
        `Ambiguous combined usage of slot-scope and v-for on <${el.tag}> ` +
        `(v-for takes higher priority). Use a wrapper <template> for the ` +
        `scoped slot to make it clearer.`,
        el.rawAttrsMap['slot-scope'],
        true
      )
    }

    el.slotScope = slotScope

  }

  //获取当前的插槽目标
  const slotTarget = getBindingAttr(el, 'slot')

  if (slotTarget) {

    //如果没设置就设置为 default
    el.slotTarget = slotTarget === '""' ? '"default"' : slotTarget //如果没设置就设置为 default

    //动态slot
    el.slotTargetDynamic = !!(el.attrsMap[':slot'] || el.attrsMap['v-bind:slot']) //动态slot

    //将插槽保留为原生阴影 DOM 兼容性的属性 仅适用于非作用域插槽。
    if (el.tag !== 'template' && !el.slotScope) {

      addAttr(el, 'slot', slotTarget, getRawBindingAttr(el, 'slot'))

    }
  }

  //这里是针对2.6以后的插槽相关语法的处理
  if (process.env.NEW_SLOT_SYNTAX) {
    if (el.tag === 'template') {
      // v-slot on <template>
      const slotBinding = getAndRemoveAttrByRegex(el, slotRE)
      if (slotBinding) {
        if (process.env.NODE_ENV !== 'production') {
          if (el.slotTarget || el.slotScope) {
            warn(
              `Unexpected mixed usage of different slot syntaxes.`,
              el
            )
          }
          if (el.parent && !maybeComponent(el.parent)) {
            warn(
              `<template v-slot> can only appear at the root level inside ` +
              `the receiving the component`,
              el
            )
          }
        }

        const { name, dynamic } = getSlotName(slotBinding)

        el.slotTarget = name

        el.slotTargetDynamic = dynamic

        el.slotScope = slotBinding.value || `_` // force it into a scoped slot for perf

      }
    } else {

      // v-slot on component, denotes default slot
      const slotBinding = getAndRemoveAttrByRegex(el, slotRE)

      if (slotBinding) {
        if (process.env.NODE_ENV !== 'production') {
          if (!maybeComponent(el)) {
            warn(
              `v-slot can only be used on components or <template>.`,
              slotBinding
            )
          }
          if (el.slotScope || el.slotTarget) {
            warn(
              `Unexpected mixed usage of different slot syntaxes.`,
              el
            )
          }
          if (el.scopedSlots) {
            warn(
              `To avoid scope ambiguity, the default slot should also use ` +
              `<template> syntax when there are other named slots.`,
              slotBinding
            )
          }
        }
        // add the component's children to its default slot
        const slots = el.scopedSlots || (el.scopedSlots = {})

        const { name, dynamic } = getSlotName(slotBinding)

        const slotContainer = slots[name] = createASTElement('template', [], el)

        slotContainer.slotTarget = name

        slotContainer.slotTargetDynamic = dynamic

        slotContainer.children = el.children.filter(c => !(c: any).slotScope)

        slotContainer.slotScope = slotBinding.value || `_`
        // remove children as they are returned from scopedSlots now
        el.children = []
        // mark el non-plain so data gets generated
        el.plain = false
      }
    }
  }
}

//处理节点的slot name 的信息
function getSlotName(binding) {
  let name = binding.name.replace(slotRE, '')
  if (!name) {
    if (binding.name[0] !== '#') {
      name = 'default'
    } else if (process.env.NODE_ENV !== 'production') {
      warn(
        `v-slot shorthand syntax requires a slot name.`,
        binding
      )
    }
  }
  return dynamicArgRE.test(name)
    // dynamic [name]
    ? { name: name.slice(1, -1), dynamic: true }
    // static name
    : { name: `"${name}"`, dynamic: false }
}


//处理slot节点的信息
function processSlotOutlet(el) {

  if (el.tag === 'slot') {
    //如果当前节点是 slot标签
    el.slotName = getBindingAttr(el, 'name')

    if (process.env.NODE_ENV !== 'production' && el.key) {
      //如果slot不需要key值
      warn(
        `\`key\` does not work on <slot> because slots are abstract outlets ` +
        `and can possibly expand into multiple elements. ` +
        `Use the key on a wrapping element instead.`,
        getRawBindingAttr(el, 'key')
      )
    }

  }
}


//处理组件相关信息
function processComponent(el) {

  let binding //获取is的值

  //获取当前标签的 is值 设置当前标签的component值
  if ((binding = getBindingAttr(el, 'is'))) {
    el.component = binding
  }

  if (getAndRemoveAttr(el, 'inline-template') != null) {
    //如果当前抽象节点存在 inline-template 就标记当前抽象节点是一个inlineTemplate
    el.inlineTemplate = true
  }
}


//处理节点的剩余属性
function processAttrs(el) {

  //获取还没被处理的属性列表
  const list = el.attrsList

  let i, //当前遍历项的索引
    l,  //属性列表长度

    name, //当前属性名 除了修饰符的部分
    rawName, //原始属性名

    value, //属性值

    modifiers, //属性的修饰符

    syncGen,
    isDynamic

  for (i = 0, l = list.length; i < l; i++) {

    //当前属性名称
    name = rawName = list[i].name

    //当前属性值
    value = list[i].value

    if (dirRE.test(name)) {
      //^v-|^@|^:|^\. 如果属性名 可能是动态prop  指令  事件 


      // 说明当前节点存在 绑定传值的属性
      el.hasBindings = true

      // 解析属性名中的修饰符 当前属性使用了哪些的修饰符
      modifiers = parseModifiers(name.replace(dirRE, ''))

      //如果当前属性是.name 的形式 说明是一个prop
      if (process.env.VBIND_PROP_SHORTHAND && propBindRE.test(name)) {

        (modifiers || (modifiers = {})).prop = true
        
        //将修饰符部分去除
        name = `.` + name.slice(1).replace(modifierRE, '')

      } else if (modifiers) {

        //将修饰符部分去除
        name = name.replace(modifierRE, '')

      }
      
      //如果是v-bind的属性说明是一个props
      if (bindRE.test(name)) {
        name = name.replace(bindRE, '')

        //解析出属性值中的过滤函数 如果没有过滤函数 就是当前字符串
        value = parseFilters(value)

        //判断是不是动态传入的prop
        isDynamic = dynamicArgRE.test(name)

        if (isDynamic) {
          name = name.slice(1, -1)
        }

        if (
          process.env.NODE_ENV !== 'production' &&
          value.trim().length === 0
        ) {
          warn(
            `The value for a v-bind expression cannot be empty. Found in "v-bind:${name}"`
          )
        }


        if (modifiers) {
          //如果存在修饰符

          if (modifiers.prop && !isDynamic) {

            //如果是.prop修饰的 且不是动态属性 将属性名驼峰化
            name = camelize(name)

            //如果是 innerHtml 转换下 innerHTML
            if (name === 'innerHtml') name = 'innerHTML'

          }

          if (modifiers.camel && !isDynamic) {
            //如果是  .camel 修饰 不是[] 进行驼峰化
            name = camelize(name)
          }

          //.sync修饰的属性进行特殊处理
          if (modifiers.sync) {
            //如果是 .sync修饰符的属性

            //$set(a.b, \"c\", $event)   ||  a = $event
            syncGen = genAssignmentCode(value, `$event`)

            if (!isDynamic) {
              //如果不是动态[ ]属性
              
              //添加一个函数处理器
              addHandler(
                el, //当前抽象节点
                `update:${camelize(name)}`,
                syncGen,
                null,
                false,
                warn,
                list[i] //当前整个属性
              )

              if (hyphenate(name) !== camelize(name)) {
                //如果驼峰不一致 在加一个
                addHandler(
                  el,
                  `update:${hyphenate(name)}`,
                  syncGen,
                  null,
                  false,
                  warn,
                  list[i]
                )
              }
            } else {
              // handler w/ dynamic event name
              addHandler(
                el,
                `"update:"+(${name})`,
                syncGen,
                null,
                false,
                warn,
                list[i],
                true // dynamic
              )
            }
          }

        }

        if ((modifiers && modifiers.prop) || (
          !el.component && platformMustUseProp(el.tag, el.attrsMap.type, name)
        )
        ) {

          //如果是.prop修饰的 或者不是一个组件节点且是不许穿prop 的属性 加入一个prop属性
          addProp(el, name, value, list[i], isDynamic)

        } else {

          //否则加入一个普通属性
          addAttr(el, name, value, list[i], isDynamic)

        }

      } 

      //如果是v-on 说明是一个事件
      else if (onRE.test(name)) {

        //获取事件名
        name = name.replace(onRE, '')
        
        //是否是动态属性名
        isDynamic = dynamicArgRE.test(name)

        if (isDynamic) {

          name = name.slice(1, -1)

        }
        
        //添加一个事件处理
        addHandler(el, name, value, modifiers, false, warn, list[i], isDynamic)

      }
      
       //指令传值
      else {
        
        //获取指令名
        name = name.replace(dirRE, '')

        // parse arg
        const argMatch = name.match(argRE)

        let arg = argMatch && argMatch[1]

        isDynamic = false

        if (arg) {
          name = name.slice(0, -(arg.length + 1))
          if (dynamicArgRE.test(arg)) {
            arg = arg.slice(1, -1)
            isDynamic = true
          }
        }

        //添加指令
        addDirective(el, name, rawName, value, arg, isDynamic, modifiers, list[i])
        
        if (process.env.NODE_ENV !== 'production' && name === 'model') {
          checkForAliasModel(el, value)
        }
      }
    } else {

      // 剩下的一些属性  可能是prop 可能是属性
      if (process.env.NODE_ENV !== 'production') {

        const res = parseText(value, delimiters)

        if (res) {
          //如果是动态传值 就不要用{{}} 双括号的写法了 使用：的方式传值
          warn(
            `${name}="${value}": ` +
            'Interpolation inside attributes has been removed. ' +
            'Use v-bind or the colon shorthand instead. For example, ' +
            'instead of <div id="{{ val }}">, use <div :id="val">.',
            list[i]
          )
        }

      }

       //向当前抽象节点加入当前属性
      addAttr(el, name, JSON.stringify(value), list[i])


      // #6887 firefox doesn't update muted state if set via attribute
      // even immediately after element creation

      //如果不是组件且 且是muted属性 就添加一个prop
      if (!el.component &&
        name === 'muted' &&
        platformMustUseProp(el.tag, el.attrsMap.type, name)) {
        addProp(el, name, 'true', list[i])
      }
    }
  }
}


//检查当前元素是否在 for修饰的节点下
function checkInFor(el: ASTElement): boolean {

  let parent = el

  while (parent) {

    if (parent.for !== undefined) {

      return true

    }

    parent = parent.parent

  }

  return false

}

//解析修饰符相关信息
function parseModifiers(name: string): Object | void {

  const match = name.match(modifierRE)

  if (match) {

    const ret = {}

    match.forEach(m => { ret[m.slice(1)] = true })

    return ret

  }
}

// 将属性列表转为 属性map 便于查找等
function makeAttrsMap(attrs: Array<Object>): Object {
  const map = {}
  for (let i = 0, l = attrs.length; i < l; i++) {
    //遍历当前的属性列表
    if (
      process.env.NODE_ENV !== 'production' &&
      map[attrs[i].name] && !isIE && !isEdge
    ) {
      //如果重复命名了同样名称的属性 就 进行报错
      warn('duplicate attribute: ' + attrs[i].name, attrs[i])
    }
    map[attrs[i].name] = attrs[i].value
  }
  return map
}

// for script (e.g. type="x/template") or style, do not decode content
//判断是不是文本标签
function isTextTag(el): boolean {
  return el.tag === 'script' || el.tag === 'style'
}

//判断当前标签是不是被禁止的
function isForbiddenTag(el): boolean {
  return (
    el.tag === 'style' ||
    (el.tag === 'script' && (
      !el.attrsMap.type ||
      el.attrsMap.type === 'text/javascript'
    ))
  )
}

const ieNSBug = /^xmlns:NS\d+/
const ieNSPrefix = /^NS\d+:/

/* istanbul ignore next */
//处理svg bug
function guardIESVGBug(attrs) {
  const res = []
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i]
    if (!ieNSBug.test(attr.name)) {
      attr.name = attr.name.replace(ieNSPrefix, '')
      res.push(attr)
    }
  }
  return res
}

//是否将v-for的迭代项直接使用在v-model里 这样会导致v-model不会触发array的更新
function checkForAliasModel(el, value) {
  let _el = el
  while (_el) {
    if (_el.for && _el.alias === value) {
      warn(
        `<${el.tag} v-model="${value}">: ` +
        `You are binding v-model directly to a v-for iteration alias. ` +
        `This will not be able to modify the v-for source array because ` +
        `writing to the alias is like modifying a function local variable. ` +
        `Consider using an array of objects and use v-model on an object property instead.`,
        el.rawAttrsMap['v-model']
      )
    }
    _el = _el.parent
  }
}
