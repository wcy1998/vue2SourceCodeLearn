/* @flow */

import { genHandlers } from './events'
import baseDirectives from '../directives/index'
import { camelize, no, extend } from 'shared/util'
import { baseWarn, pluckModuleFunction } from '../helpers'

type TransformFunction = (el: ASTElement, code: string) => string;
type DataGenFunction = (el: ASTElement) => string;
type DirectiveFunction = (el: ASTElement, dir: ASTDirective, warn: Function) => boolean;

/**
 * @description: 
 * @param {*}
 * @return {*}
 */
export class CodegenState {
  options: CompilerOptions;
  warn: Function;
  transforms: Array<TransformFunction>;
  dataGenFns: Array<DataGenFunction>;
  directives: { [key: string]: DirectiveFunction };
  maybeComponent: (el: ASTElement) => boolean;
  onceId: number;
  staticRenderFns: Array<string>;
  pre: boolean;

  //编译状态
  constructor(options: CompilerOptions) {

    this.options = options //编译配置

    this.warn = options.warn || baseWarn //告警函数

    this.transforms = pluckModuleFunction(options.modules, 'transformCode') //所有的transformCode函数

    this.dataGenFns = pluckModuleFunction(options.modules, 'genData') //所有的genData 函数

    this.directives = extend(extend({}, baseDirectives), options.directives) //指令配置

    const isReservedTag = options.isReservedTag || no //是否是浏览器保留的标签

    this.maybeComponent = (el: ASTElement) => !!el.component || !isReservedTag(el.tag) //是不是 组件

    this.onceId = 0 //标记v-once节点的个数

    this.staticRenderFns = [] //这里记录所有 静态节点的渲染函数

    this.pre = false //是不是在v-pre的节点中

  }
}

//编译结果类型
export type CodegenResult = {
  render: string,
  staticRenderFns: Array<string>
};

/**
 * @description: 生成渲染函数
 * @param {*}
 * @return {*}
 */
export function generate(
  ast: ASTElement | void,  //被标记过静态 和 处理过属性的 抽象语法节点
  options: CompilerOptions //编译配置
): CodegenResult {

  const state = new CodegenState(options) //生成状态


  //如果存在ast 调用genElement 不存在调用
  const code = ast ? genElement(ast, state) : '_c("div")' //生成渲染函数

  return {

    render: `with(this){return ${code}}`, //返回渲染函数

    staticRenderFns: state.staticRenderFns //所有的静态节点的渲染函数

  }

}

//从此开始从根节点开始不断递归生成最终的渲染函数
export function genElement(
  el: ASTElement, //抽象语法节点
  state: CodegenState //状态机
): string {


  if (el.parent) {
    //如果当前节点存在父节点
    //当前节点的pre取决于他的父节点的pre
    el.pre = el.pre || el.parent.pre
  }


  if (el.staticRoot && !el.staticProcessed) {

    //生成静态根节点的渲染函数部分
    return genStatic(el, state)

  } else if (el.once && !el.onceProcessed) {

    //生成v-once的渲染函数部分 最终结果也是与静态节点渲染类似
    return genOnce(el, state)

  } else if (el.for && !el.forProcessed) {

    //如果是v-for的节点
    return genFor(el, state)

  } else if (el.if && !el.ifProcessed) {

    //如果是 v-if的节点
    return genIf(el, state)

  } else if (el.tag === 'template' && !el.slotTarget && !state.pre) {

    //如果是 template节点 且没有slotTarget 不在v-pre之中时
    return genChildren(el, state) || 'void 0'

  } else if (el.tag === 'slot') {

    //如果是slot节点
    return genSlot(el, state)

  } else {

    //组件或元素
    let code

    if (el.component) {
      //如果是组件 生成一个genComponent
      code = genComponent(el.component, el, state)
    } else {

      //如果是不是组件
      let data

      if (!el.plain || (el.pre && state.maybeComponent(el))) {
        //如果不是普通的元素 或者 时v-pre的组件时
        data = genData(el, state)
      }

      //获取当前节点的是inlineTemplate 的 就 null 否则生成子节点
      const children = el.inlineTemplate ? null : genChildren(el, state, true)

      code = `_c('${el.tag}'${data ? `,${data}` : '' // data
        }${children ? `,${children}` : '' // children
        })`
    }
    // module transforms
    for (let i = 0; i < state.transforms.length; i++) {
      code = state.transforms[i](el, code)
    }
    return code
  }
}

//生成静态根节点
function genStatic(el: ASTElement, state: CodegenState): string {

  //标记当前节点的已经调用过 genStatic 
  el.staticProcessed = true

  // Some elements (templates) need to behave differently inside of a v-pre
  // node.  All pre nodes are static roots, so we can use this as a location to
  // wrap a state change and reset it upon exiting the pre node.
  //某些元素（模板）需要在 v-pre 节点内表现不同。 所有 pre 节点都是静态根，因此我们可以将其用作包装状态更改的位置，并在退出 pre 节点时重置它。

  //获取当前状态器中的pre值
  const originalPreState = state.pre

  if (el.pre) {
    //状态器中记录 当前 节点的pre值
    state.pre = el.pre
  }

  //状态器中记录推入当前节点的静态渲染函数
  state.staticRenderFns.push(`with(this){return ${genElement(el, state)}}`)

  //将状态记录的pre状态置为之前的状态
  state.pre = originalPreState

  //返回一个渲染函数
  return `_m(${state.staticRenderFns.length - 1
    }${el.staticInFor ? ',true' : ''
    })`

}

//生成v-on节点的渲染函数
function genOnce(
  el: ASTElement,
  state: CodegenState
): string {


  el.onceProcessed = true

  if (el.if && !el.ifProcessed) {
    //如果当前节点还存在v-if就先生成v-if的渲染函数
    return genIf(el, state)


  } else if (el.staticInFor) {
    //如果是v-for里的静态节点 

    let key = ''
    let parent = el.parent

    //获取v-for修饰的父节点的key值
    while (parent) {
      if (parent.for) {
        key = parent.key
        break
      }
      parent = parent.parent
    }
    if (!key) {
      //如果没有key值
      process.env.NODE_ENV !== 'production' && state.warn(
        `v-once can only be used inside v-for that is keyed. `,
        el.rawAttrsMap['v-once']
      )
      return genElement(el, state)
    }
    //如果存在key值 返回_once的渲染函数
    return `_o(${genElement(el, state)},${state.onceId++},${key})`
  } else {

    //否则返回静态
    return genStatic(el, state)

  }
}

//生成v-if节点的渲染函数
export function genIf(
  el: any, //当前节点
  state: CodegenState, //状态机
  altGen?: Function,
  altEmpty?: string
): string {

  el.ifProcessed = true // avoid recursion

  return genIfConditions(el.ifConditions.slice(), state, altGen, altEmpty)

}

//生成if条件的渲染函数
function genIfConditions(
  conditions: ASTIfConditions,
  state: CodegenState,
  altGen?: Function,
  altEmpty?: string
): string {

  if (!conditions.length) {
    //如果没有渲染条件时 返回一个空节点
    return altEmpty || '_e()'
  }

  //弹出第一个if条件
  const condition = conditions.shift()

  if (condition.exp) {
    //如果存在表达式
    return `(${condition.exp})?${genTernaryExp(condition.block)
      }:${genIfConditions(conditions, state, altGen, altEmpty) //直到所有的条件都结束
      }`
  } else {
    return `${genTernaryExp(condition.block)}`
  }

  // v-if with v-once should generate code like (a)?_m(0):_m(1)
  function genTernaryExp(el) {
    return altGen
      ? altGen(el, state)
      : el.once
        ? genOnce(el, state)
        : genElement(el, state)
  }
}


//生成v-for节点的渲染函数
export function genFor(
  el: any, //当前节点
  state: CodegenState, //状态机
  altGen?: Function,
  altHelper?: string
): string {

  //获取当前节点的 for表达式
  const exp = el.for
  //获取当前节点的 ，前的表达式
  const alias = el.alias
  //获取当前节点的 ，后的表达式
  const iterator1 = el.iterator1 ? `,${el.iterator1}` : ''
  //获取当前节点的 ，后的表达式
  const iterator2 = el.iterator2 ? `,${el.iterator2}` : ''

  if (process.env.NODE_ENV !== 'production' &&
    state.maybeComponent(el) &&
    el.tag !== 'slot' &&
    el.tag !== 'template' &&
    !el.key
  ) {
    //如果是开发模式 且当前节点可能是一个组件 且 当前节点不是 slot 不是 template 不存在key值时 没有key值进行提示
    state.warn(
      `<${el.tag} v-for="${alias} in ${exp}">: component lists rendered with ` +
      `v-for should have explicit keys. ` +
      `See https://vuejs.org/guide/list.html#key for more info.`,
      el.rawAttrsMap['v-for'],
      true /* tip */
    )
  }

  //避免无限递归
  el.forProcessed = true // avoid recursion


  return `${altHelper || '_l'}((${exp}),` +
    `function(${alias}${iterator1}${iterator2}){` +
    `return ${(altGen || genElement)(el, state)}` +
    '})'

}

//生成组件的vNodeData
export function genData(el: ASTElement, state: CodegenState): string {

  let data = '{'

  // directives first.
  // directives may mutate the el's other properties before they are generated.
  //首先是指令。 指令可能会在生成之前改变 el 的其他属性。
  const dirs = genDirectives(el, state)

  if (dirs) data += dirs + ','

  // key
  if (el.key) {
    data += `key:${el.key},` //处理 key
  }

  // ref
  if (el.ref) {  //处理ref
    data += `ref:${el.ref},`
  }

  if (el.refInFor) { //处理是否是refinfor
    data += `refInFor:true,`
  }

  // pre
  if (el.pre) { //处理pre
    data += `pre:true,`
  }

  // record original tag name for components using "is" attribute
  if (el.component) { //处理组件
    data += `tag:"${el.tag}",`
  }

  // 组件的data值
  for (let i = 0; i < state.dataGenFns.length; i++) {
    data += state.dataGenFns[i](el)
  }

  // attributes
  if (el.attrs) { //处理属性
    data += `attrs:${genProps(el.attrs)},`
  }
  // 组件的props
  if (el.props) { //处理props
    data += `domProps:${genProps(el.props)},`
  }

  // 组件的事件
  if (el.events) { //处理事件
    data += `${genHandlers(el.events, false)},`
  }

  //组件的元素事件
  if (el.nativeEvents) { //处理原生事件
    data += `${genHandlers(el.nativeEvents, true)},`
  }

  //组件的插槽信息
  if (el.slotTarget && !el.slotScope) {
    //处理插槽
    data += `slot:${el.slotTarget},`
  }

  // 组件的作用域插槽
  if (el.scopedSlots) {
    //处理作用域插槽
    data += `${genScopedSlots(el.scopedSlots, state)},`
  }


  //组件的v-model
  if (el.model) {
    data += `model:{value:${el.model.value
      },callback:${el.model.callback
      },expression:${el.model.expression
      }},`
  }

  // inline-template
  if (el.inlineTemplate) {
    //处理 inlinetemplate
    const inlineTemplate = genInlineTemplate(el, state)
    if (inlineTemplate) {
      data += `${inlineTemplate},`
    }
  }

  data = data.replace(/,$/, '') + '}'
  // v-bind dynamic argument wrap
  // v-bind with dynamic arguments must be applied using the same v-bind object
  // merge helper so that class/style/mustUseProp attrs are handled correctly.

  if (el.dynamicAttrs) {
    //处理动态属性
    data = `_b(${data},"${el.tag}",${genProps(el.dynamicAttrs)})`
  }
  // v-bind data wrap
  if (el.wrapData) {
    data = el.wrapData(data)
  }
  // v-on data wrap
  if (el.wrapListeners) {
    data = el.wrapListeners(data)
  }
  return data
}


//根据编译生成的指令相关信息 生成渲染函数的一部分
function genDirectives(el: ASTElement, state: CodegenState): string | void {


  const dirs = el.directives

  //如果不存在指令就返回
  if (!dirs) return

  //返回的结果
  let res = 'directives:['


  let hasRuntime = false


  let
    i,
    l,
    dir,
    needRuntime


  for (i = 0, l = dirs.length; i < l; i++) {

    //某一个指令的内容
    dir = dirs[i]

    needRuntime = true

    const gen: DirectiveFunction = state.directives[dir.name]

    if (gen) {

      // compile-time directive that manipulates AST.
      // returns true if it also needs a runtime counterpart.
      
      needRuntime = !!gen(el, dir, state.warn)

    }

    if (needRuntime) {
      hasRuntime = true
      res += `{name:"${dir.name}",rawName:"${dir.rawName}"${dir.value ? `,value:(${dir.value}),expression:${JSON.stringify(dir.value)}` : ''
        }${dir.arg ? `,arg:${dir.isDynamicArg ? dir.arg : `"${dir.arg}"`}` : ''
        }${dir.modifiers ? `,modifiers:${JSON.stringify(dir.modifiers)}` : ''
        }},`
    }

  }

  if (hasRuntime) {
    return res.slice(0, -1) + ']'
  }
}

function genInlineTemplate(el: ASTElement, state: CodegenState): ?string {
  const ast = el.children[0]
  if (process.env.NODE_ENV !== 'production' && (
    el.children.length !== 1 || ast.type !== 1
  )) {
    state.warn(
      'Inline-template components must have exactly one child element.',
      { start: el.start }
    )
  }
  if (ast && ast.type === 1) {
    const inlineRenderFns = generate(ast, state.options)
    return `inlineTemplate:{render:function(){${inlineRenderFns.render
      }},staticRenderFns:[${inlineRenderFns.staticRenderFns.map(code => `function(){${code}}`).join(',')
      }]}`
  }
}

function genScopedSlots(
  slots: { [key: string]: ASTElement },
  state: CodegenState
): string {
  const hasDynamicKeys = Object.keys(slots).some(key => {
    const slot = slots[key]
    return slot.slotTargetDynamic || slot.if || slot.for
  })
  return `scopedSlots:_u([${Object.keys(slots).map(key => {
    return genScopedSlot(slots[key], state)
  }).join(',')
    }]${hasDynamicKeys ? `,true` : ``})`
}

function genScopedSlot(
  el: ASTElement,
  state: CodegenState
): string {
  if (el.if && !el.ifProcessed) {
    return genIf(el, state, genScopedSlot, `null`)
  }
  if (el.for && !el.forProcessed) {
    return genFor(el, state, genScopedSlot)
  }
  const fn = `function(${String(el.slotScope)}){` +
    `return ${el.tag === 'template'
      ? genChildren(el, state) || 'undefined'
      : genElement(el, state)
    }}`
  return `{key:${el.slotTarget || `"default"`},fn:${fn}}`
}



//生成节点为template 且没有slot的渲染函数
export function genChildren(
  el: ASTElement, //节点
  state: CodegenState, //状态机
  checkSkip?: boolean,
  altGenElement?: Function,
  altGenNode?: Function
): string | void {

  //获取template节点的子节点
  const children = el.children

  if (children.length) {

    const el: any = children[0]

    //如果template的子节点只有一个且是一个v-for的节点
    if (children.length === 1 &&
      el.for &&
      el.tag !== 'template' &&
      el.tag !== 'slot'
    ) {


      const normalizationType = checkSkip
        ? state.maybeComponent(el) ? `,1` : `,0`
        : ``
      return `${(altGenElement || genElement)(el, state)}${normalizationType}`
    }

    const normalizationType = checkSkip
      ? getNormalizationType(children, state.maybeComponent)
      : 0

    const gen = altGenNode || genNode

    return `[${children.map(c => gen(c, state)).join(',')}]${normalizationType ? `,${normalizationType}` : ''
      }`
  }
}

// determine the normalization needed for the children array.
// 0: no normalization needed
// 1: simple normalization needed (possible 1-level deep nested array)
// 2: full normalization needed
function getNormalizationType(
  children: Array<ASTNode>,
  maybeComponent: (el: ASTElement) => boolean
): number {
  let res = 0
  for (let i = 0; i < children.length; i++) {
    const el: ASTNode = children[i]
    if (el.type !== 1) {
      continue
    }
    if (needsNormalization(el) ||
      (el.ifConditions && el.ifConditions.some(c => needsNormalization(c.block)))) {
      res = 2
      break
    }
    if (maybeComponent(el) ||
      (el.ifConditions && el.ifConditions.some(c => maybeComponent(c.block)))) {
      res = 1
    }
  }
  return res
}

function needsNormalization(el: ASTElement): boolean {
  return el.for !== undefined || el.tag === 'template' || el.tag === 'slot'
}

//用于template下的节点返回渲染函数的
function genNode(node: ASTNode, state: CodegenState): string {
  if (node.type === 1) {
    return genElement(node, state)
  } else if (node.type === 3 && node.isComment) {
    return genComment(node)
  } else {
    return genText(node)
  }
}

export function genText(text: ASTText | ASTExpression): string {
  return `_v(${text.type === 2
    ? text.expression // no need for () because already wrapped in _s()
    : transformSpecialNewlines(JSON.stringify(text.text))
    })`
}

export function genComment(comment: ASTText): string {
  return `_e(${JSON.stringify(comment.text)})`
}


//生成slot节点的渲染函数
function genSlot(
  el: ASTElement, //当前节点
  state: CodegenState //状态机
): string {

  //获取当前slot节点的 slot名
  const slotName = el.slotName || '"default"'

  //生成一个当前slot节点的子节点的渲染函数
  const children = genChildren(el, state)


  //结果等于
  let res = `_t(${slotName}${children ? `,${children}` : ''}`

  //获取当前节点的属性 v-pre才能获取到
  const attrs = el.attrs && `{${el.attrs.map(a => `${camelize(a.name)}:${a.value}`).join(',')}}`

  //获取当前节点的v-bind的属性
  const bind = el.attrsMap['v-bind']

  if ((attrs || bind) && !children) {
    //如果存在属性 没有子节点时 
    res += `,null`
  }

  if (attrs) {
    res += `,${attrs}`
  }

  if (bind) {
    res += `${attrs ? '' : ',null'},${bind}`
  }

  return res + ')'

}

// componentName is el.component, take it as argument to shun flow's pessimistic refinement
function genComponent(
  componentName: string, //组件名
  el: ASTElement, //抽象节点
  state: CodegenState //状态机
): string {

  //如果组件有子节点
  const children = el.inlineTemplate ? null : genChildren(el, state, true)

  return `_c(${componentName},${genData(el, state)}${children ? `,${children}` : ''
    })`

}

function genProps(props: Array<ASTAttr>): string {
  let staticProps = ``
  let dynamicProps = ``
  for (let i = 0; i < props.length; i++) {
    const prop = props[i]
    const value = __WEEX__
      ? generateValue(prop.value)
      : transformSpecialNewlines(prop.value)
    if (prop.dynamic) {
      dynamicProps += `${prop.name},${value},`
    } else {
      staticProps += `"${prop.name}":${value},`
    }
  }
  staticProps = `{${staticProps.slice(0, -1)}}`
  if (dynamicProps) {
    return `_d(${staticProps},[${dynamicProps.slice(0, -1)}])`
  } else {
    return staticProps
  }
}

/* istanbul ignore next */
function generateValue(value) {
  if (typeof value === 'string') {
    return transformSpecialNewlines(value)
  }
  return JSON.stringify(value)
}

// #3895, #4268
function transformSpecialNewlines(text: string): string {
  return text
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
