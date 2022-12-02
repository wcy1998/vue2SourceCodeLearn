/* @flow */

import VNode, { cloneVNode } from './vnode'
import { createElement } from './create-element'
import { resolveInject } from '../instance/inject'
import { normalizeChildren } from '../vdom/helpers/normalize-children'
import { resolveSlots } from '../instance/render-helpers/resolve-slots'
import { normalizeScopedSlots } from '../vdom/helpers/normalize-scoped-slots'
import { installRenderHelpers } from '../instance/render-helpers/index'

import {
  isDef,
  isTrue,
  hasOwn,
  camelize,
  emptyObject,
  validateProp
} from '../util/index'

export function FunctionalRenderContext (
  data: VNodeData,
  props: Object,
  children: ?Array<VNode>,
  parent: Component,
  Ctor: Class<Component>
) {
  const options = Ctor.options
  // ensure the createElement function in functional components
  // gets a unique context - this is necessary for correct named slot check
  let contextVm
  if (hasOwn(parent, '_uid')) {
    contextVm = Object.create(parent)
    // $flow-disable-line
    contextVm._original = parent
  } else {
    // the context vm passed in is a functional context as well.
    // in this case we want to make sure we are able to get a hold to the
    // real context instance.
    contextVm = parent
    // $flow-disable-line
    parent = parent._original
  }
  const isCompiled = isTrue(options._compiled)
  const needNormalization = !isCompiled

  this.data = data
  this.props = props
  this.children = children
  this.parent = parent
  this.listeners = data.on || emptyObject
  this.injections = resolveInject(options.inject, parent)
  this.slots = () => resolveSlots(children, parent)

  Object.defineProperty(this, 'scopedSlots', ({
    enumerable: true,
    get () {
      return normalizeScopedSlots(data.scopedSlots, this.slots())
    }
  }: any))

  // support for compiled functional template
  if (isCompiled) {
    // exposing $options for renderStatic()
    this.$options = options
    // pre-resolve slots for renderSlot()
    this.$slots = this.slots()
    this.$scopedSlots = normalizeScopedSlots(data.scopedSlots, this.$slots)
  }

  if (options._scopeId) {
    this._c = (a, b, c, d) => {
      const vnode = createElement(contextVm, a, b, c, d, needNormalization)
      if (vnode && !Array.isArray(vnode)) {
        vnode.fnScopeId = options._scopeId
        vnode.fnContext = parent
      }
      return vnode
    }
  } else {
    this._c = (a, b, c, d) => createElement(contextVm, a, b, c, d, needNormalization)
  }
}

installRenderHelpers(FunctionalRenderContext.prototype)

/**
 * @description: 创建函数式组件的vnode
 * @param {*}
 * @return {*}
 */
export function createFunctionalComponent (
  Ctor: Class<Component>, //函数构造器
  propsData: ?Object, //组件的props
  data: VNodeData, //组件的节点信息
  contextVm: Component, //上下文环境
  children: ?Array<VNode> //子组件信息
): VNode | Array<VNode> | void {

  const options = Ctor.options //获取构造函数的options

  const props = {}

  const propOptions = options.props //获取props
 
  //合并props
  if (isDef(propOptions)) {
    //如果存在props
    for (const key in propOptions) {
      props[key] = validateProp(key, propOptions, propsData || emptyObject)
    }
  } else {
    if (isDef(data.attrs)) mergeProps(props, data.attrs)
    if (isDef(data.props)) mergeProps(props, data.props)
  }

  //创建函数式组件渲染上下文

  const renderContext = new FunctionalRenderContext(
    data,
    props,
    children,
    contextVm,
    Ctor
  )
   
  //创建vnode
  const vnode = options.render.call(null, renderContext._c, renderContext)

  if (vnode instanceof VNode) {
    //如果返回的结果是vnode类型
    //返回一个 标记的克隆的vnode
    return cloneAndMarkFunctionalResult(vnode, data, renderContext.parent, options, renderContext)

  } else if (Array.isArray(vnode)) {
    //如果返回的是vnode数组
    //先扁平化子组件 然后返回标记过的数组vnode
    const vnodes = normalizeChildren(vnode) || []
    const res = new Array(vnodes.length)
    for (let i = 0; i < vnodes.length; i++) {
      res[i] = cloneAndMarkFunctionalResult(vnodes[i], data, renderContext.parent, options, renderContext)
    }
    return res
  }
}

/**
 * @description: 函数式组件标记
 * @param {*} vnode 虚拟节点
 * @param {*} data 节点属性
 * @param {*} contextVm 节点上下文
 * @param {*} options 构造函数options
 * @param {*} renderContext 渲染上下文
 * @return {*}
 */
function cloneAndMarkFunctionalResult (vnode, data, contextVm, options, renderContext) {

  // #7817 clone node before setting fnContext, otherwise if the node is reused
  // (e.g. it was from a cached normal slot) the fnContext causes named slots
  // that should not be matched to match.
  const clone = cloneVNode(vnode) //克隆当前节点

  clone.fnContext = contextVm

  clone.fnOptions = options

  if (process.env.NODE_ENV !== 'production') {
    (clone.devtoolsMeta = clone.devtoolsMeta || {}).renderContext = renderContext
  }
  if (data.slot) {
    (clone.data || (clone.data = {})).slot = data.slot
  }

  return clone
  
}

function mergeProps (to, from) {
  for (const key in from) {
    to[camelize(key)] = from[key]
  }
}
