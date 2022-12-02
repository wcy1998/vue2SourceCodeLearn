/* @flow */

import config from '../config'
import VNode, { createEmptyVNode } from './vnode'
import { createComponent } from './create-component'
import { traverse } from '../observer/traverse'

import {
  warn,
  isDef, // 判断一个值 是不是不为null 或不为 undefined
  isUndef, // 判断一个值 是否为null 或不为 undefined
  isTrue,
  isObject,
  isPrimitive, //检查值是否为原始值。
  resolveAsset //从当前组件中获取注册的资产
} from '../util/index'

import {
  normalizeChildren, //规范化子节点
  simpleNormalizeChildren //规范化子节点
} from './helpers/index'

const SIMPLE_NORMALIZE = 1
const ALWAYS_NORMALIZE = 2


/**
 * @description:  方法创建 VNode 
 * @param {*}
 * @return {*} 
 */
export function createElement (
  context: Component, //当前vue实例
  tag: any, //标签 表示标签，它可以是一个字符串，也可以是一个 Component,组件名
  data: any, //表示 VNode 的数据，它是一个 VNodeData 类型，编译完成后的节点的信息
  children: any,//子虚拟节点或者自虚拟节点的渲染函数
  normalizationType: any, // 当是编译的传的是1 不是编译的传2
  alwaysNormalize: boolean //
): VNode | Array<VNode> {

   /*兼容不传data的情况*/
  if (Array.isArray(data) || isPrimitive(data)) { 
    // 当传入的data 类型 为数组 或  原始值
    normalizationType = children
    children = data 
    data = undefined 
  }


  if (isTrue(alwaysNormalize)) {
    //如果alwaysNormalize为true
    normalizationType = ALWAYS_NORMALIZE 
  }
    /*创建虚拟节点*/
  return _createElement(context, tag, data, children, normalizationType) 
}

/**
 * @description:  创建虚拟节点
 * @param {*} children 
 * @return {*}
 */
export function _createElement (
  context: Component, //表示当前节点所在的组件 vue实例
  tag?: string | Class<Component> | Function | Object, //标签 表示标签，可能是一个组件 可能是一个普通的html标签 可能是一个方法 或 对象
  data?: VNodeData, //表示 VNode 的数据，它是一个 VNodeData 类型， 它是一个 VNodeData 类型，编译完成后的节点的信息
  children?: any, //当前节点的子虚拟节点 也是调用当前方法生成的虚拟节点
  normalizationType?: number // 当是编译的传的是1 不是编译的传2
): VNode | Array<VNode> {


 //当 data 已经被observe 过了 就直接返回一个空的虚拟节点 
 //避免使用 observed data的对象当做 vNodeData
  if (isDef(data) && isDef((data: any).__ob__)) {
    process.env.NODE_ENV !== 'production' && warn(
      `Avoid using observed data object as vnode data: ${JSON.stringify(data)}\n` +
      'Always create fresh vnode data objects in each render!',
      //避免将观察到的数据对象用作 vnode 数据 始终在每次渲染中创建新的 vnode 数据对象！
      context
    )
    return createEmptyVNode()
  }

  //将tag设置为 ：is 后面的组件名
  if (isDef(data) && isDef(data.is)) {
    tag = data.is
  }

   //如果tag 为空 则返回一个空的虚拟节点
  if (!tag) {
    return createEmptyVNode()
  }

  // 开发模式下  当key的类型不为原始类型时 进行提示
  if (process.env.NODE_ENV !== 'production' &&
    isDef(data) && isDef(data.key) && !isPrimitive(data.key)
  ) {
    if (!__WEEX__ || !('@binding' in data.key)) {
      warn(
        'Avoid using non-primitive value as key, ' +
        'use string/number value instead.',
        context
      )
    }
  }

  //支持单个函数子项作为默认作用域插槽 ,将内容作为组件内的渲染内容
  if (Array.isArray(children) &&
    typeof children[0] === 'function'
  ) {
    data = data || {} 
    data.scopedSlots = { default: children[0] } 
    children.length = 0 
  }

  if (normalizationType === ALWAYS_NORMALIZE) {
    //用户手写render时
    children = normalizeChildren(children) //规范化子节点 扁平化子节点
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    //编译生成render时
    children = simpleNormalizeChildren(children) //规范化子节点  扁平化子节点
  }




  let 
  vnode, //当前节点的虚拟节点
  ns //当前节点的命名空间

  if (typeof tag === 'string') {

    //当标签类型为文本时
    let Ctor
    //获取当前节点所在组件的命名空间 如果没有命名空间 就使用默认的
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag) 

    if (config.isReservedTag(tag)) {
       //创建相应的vnode 虚拟节点
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      )

    } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      //当不是 v-pre的节点 并且是注册的组件时 从当前节点所在组件的components 选项 去查找该节点
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
        //当不是组件时 时普通元素时
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      )
    }
  } else {
     //当传入的tag  而是传入一个组件时  render: h => h(App)
    vnode = createComponent(tag, data, context, children)
  }



  if (Array.isArray(vnode)) {
    //可能是异步 或 函数式组件返回
    //如果节点是数组 则直接返回
    return vnode
  } else if (isDef(vnode)) {
    //如果是单个节点 设置命名空间后
    if (isDef(ns)) applyNS(vnode, ns)
   //当前节点对应的对象，包含了具体的一些数据信息 不为空时
    if (isDef(data)) registerDeepBindings(data)
    return vnode
  } else {
     /*如果vnode没有成功创建则创建空节点*/
    return createEmptyVNode()
  }
}

//那么至此，我们大致了解了 createElement 创建 VNode 的过程，每个 VNode 有 children，children 每个元素也是一个 VNode，
//这样就形成了一个 VNode Tree，它很好的描述了我们的 DOM Tree。
//回到 mountComponent 函数的过程，我们已经知道 vm._render 是如何创建了一个 VNode，
//接下来就是要把这个 VNode 渲染成一个真实的 DOM 并渲染出来，这个过程是通过 vm._update 完成的，接下来分析一下这个过程。


/**
 * @description: 
 * @param {*} vnode vnode
 * @param {*} ns 命名空间
 * @param {*} force ？？？
 * @return {*}
 */
function applyNS (vnode, ns, force) {
  vnode.ns = ns
  if (vnode.tag === 'foreignObject') {
    // use default namespace inside foreignObject
    //在 foreignObject 中使用默认命名空间
    ns = undefined
    force = true
  }
  if (isDef(vnode.children)) {
    for (let i = 0, l = vnode.children.length; i < l; i++) {
      //循环遍历子节点
      const child = vnode.children[i]
      if (isDef(child.tag) && (
        //当子节点存在tag时
        isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))) {
          //当子节点不存在命名空间时 （或force为true 并且标签不为 svg的时候）递归给子节点命名
        applyNS(child, ns, force)
      }
    }
  }
}

// ref #5318
// necessary to ensure parent re-render when deep bindings like :style and
// :class are used on slot nodes
//在槽节点上使用像 :style 和 :class 这样的深度绑定时，必须确保父级重新渲染
function registerDeepBindings (data) {
  if (isObject(data.style)) {
    traverse(data.style)
  }
  if (isObject(data.class)) {
    traverse(data.class)
  }
}
