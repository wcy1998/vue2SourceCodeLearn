/*
其实 VNode 是对真实 DOM 的一种抽象描述，它的核心定义无非就几个关键属性，
标签名、数据、子节点、键值等，其它属性都是用来扩展 VNode 的灵活性以及实现一些特殊 feature 的。
由于 VNode 只是用来映射到真实 DOM 的渲染，不需要包含操作 DOM 的方法，因此它是非常轻量和简单的。
Virtual DOM 除了它的数据结构的定义，映射到真实的 DOM 实际上要经历 VNode 的 create、diff、patch 等过程。
那么在 Vue.js 中，VNode 的 create 是通过之前提到的 createElement 方法创建的，我们接下来分析这部分的实现。
 */
/* @flow */

export default class VNode {
  // 虚拟dom属性
  tag: string | void; //节点标签
  data: VNodeData | void; //虚拟节点vnodedata
  children: ?Array<VNode>; // 子虚拟节点
  text: string | void; //节点文本
  elm: Node | void; //节点的真实d元素
  ns: string | void; // 节点所属的命名空间
  context: Component | void; //节点所在的组件
  key: string | number | void; // 节点的唯一标识key
  componentOptions: VNodeComponentOptions | void; //组件option
  componentInstance: Component | void; // component instance vue组件实例
  parent: VNode | void; // 父虚拟节点

  // strictly internal 严格内部
  raw: boolean; // contains raw HTML? (server only) 包含原始 HTML？ （仅限服务器）
  isStatic: boolean; // 是不是static 静态节点
  isRootInsert: boolean; // necessary for enter transition check 输入转换检查所必需的
  isComment: boolean; //是不是注释节点
  isCloned: boolean; //是不是克隆节点
  isOnce: boolean; //是不是v-once的节点
  asyncFactory: Function | void; // async component factory function 异步组件工厂函数
  asyncMeta: Object | void;
  isAsyncPlaceholder: boolean;
  ssrContext: Object | void;//服务端渲染上下文
  fnContext: Component | void; // real context vm for functional nodes 功能节点的真实上下文 vm
  fnOptions: ?ComponentOptions; // for SSR caching 用于 SSR 缓存
  devtoolsMeta: ?Object; // used to store functional render context for devtools 用于存储 devtools 的功能渲染上下文
  fnScopeId: ?string; // functional scope id support 功能范围 ID 支持

 //构造器
  constructor (
    tag?: string, //标签名
    data?: VNodeData,//节点的VNodeData
    children?: ?Array<VNode>,//子虚拟节点
    text?: string,
    elm?: Node,
    context?: Component, //渲染上下文是一个vue实例
    componentOptions?: VNodeComponentOptions,
    asyncFactory?: Function
  ) {
     /*当前节点的标签名*/
    this.tag = tag

     /*当前节点对应的对象，包含了具体的一些数据信息，是一个VNodeData类型，可以参考VNodeData类型中的数据信息*/
    this.data = data

    /*当前节点的子节点，是一个数组*/
    this.children = children

        /*当前节点的文本*/
    this.text = text

    /*当前虚拟节点对应的真实dom节点*/
    this.elm = elm

      /*当前节点的名字空间*/
    this.ns = undefined

    /*编译作用域*/
    this.context = context

    /*函数化组件作用域*/
    this.fnContext = undefined
    this.fnOptions = undefined
    this.fnScopeId = undefined

    /*节点的key属性，被当作节点的标志，用以优化*/
    this.key = data && data.key

    /*组件的option选项*/
    this.componentOptions = componentOptions

    /*当前节点对应的组件的实例*/
    this.componentInstance = undefined

    /*当前节点的父节点*/
    this.parent = undefined

    /*简而言之就是是否为原生HTML或只是普通文本，innerHTML的时候为true，textContent的时候为false*/
    this.raw = false

     /*静态节点标志*/
    this.isStatic = false

    /*是否作为跟节点插入*/
    this.isRootInsert = true

    /*是否为注释节点*/
    this.isComment = false

    /*是否为克隆节点*/
    this.isCloned = false

    this.isOnce = false

    this.asyncFactory = asyncFactory

    this.asyncMeta = undefined

    this.isAsyncPlaceholder = false
    
  }

  // DEPRECATED: alias for componentInstance for backwards compat. 已弃用：用于向后兼容的 componentInstance 的别名。
  /* istanbul ignore next */
  //与 ES5 一样，在“类”的内部可以使用get和set关键字，对某个属性设置存值函数和取值函数，拦截该属性的存取行为。
  get child (): Component | void {
    return this.componentInstance
  }
}

/**
 * @description: 创建一个空的 虚拟dom 并返回
 * @param {*}
 * @return {*}
 */
export const createEmptyVNode = (text: string = '') => {
  const node = new VNode()
  node.text = text
  node.isComment = true
  return node
}
/**
 * @description: 创建一个文本 虚拟dom
 * @param {*}
 * @return {*}
 */
export function createTextVNode (val: string | number) {
  return new VNode(undefined, undefined, undefined, String(val))
}

// optimized shallow clone 用于静态节点和槽节点的优化浅层克隆，因为它们可以在多个渲染中重用，
//克隆它们可以避免 DOM 操作依赖于它们的 elm 引用时的错误。
/**
 * @description: 浅拷贝一个vnode
 * @param {*} vnode
 * @return {*}
 */
export function cloneVNode (vnode: VNode): VNode {

  const cloned = new VNode(
    vnode.tag,
    vnode.data,
    vnode.children && vnode.children.slice(),//浅拷贝
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions,
    vnode.asyncFactory
  )
  cloned.ns = vnode.ns
  cloned.isStatic = vnode.isStatic
  cloned.key = vnode.key
  cloned.isComment = vnode.isComment
  cloned.fnContext = vnode.fnContext
  cloned.fnOptions = vnode.fnOptions
  cloned.fnScopeId = vnode.fnScopeId
  cloned.asyncMeta = vnode.asyncMeta
  cloned.isCloned = true

  return cloned
}
