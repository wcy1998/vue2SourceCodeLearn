/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-02-07 17:12:15
 * @LastEditors: Please set LastEditors
 * @Description: 创建一个组件
 * @FilePath: \vue\src\core\vdom\create-component.js
 */

import VNode from './vnode'
import { resolveConstructorOptions } from 'core/instance/init'
import { queueActivatedComponent } from 'core/observer/scheduler'
import { createFunctionalComponent } from './create-functional-component'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject
} from '../util/index'

import {
  resolveAsyncComponent,
  createAsyncPlaceholder,
  extractPropsFromVNodeData
} from './helpers/index'

import {
  callHook,
  activeInstance,
  updateChildComponent,
  activateChildComponent,
  deactivateChildComponent
} from '../instance/lifecycle'

import {
  isRecyclableComponent,
  renderRecyclableComponentTemplate
} from 'weex/runtime/recycle-list/render-component-template'

// 在组件vnode执行时调用
const componentVNodeHooks = {

  //patch到组件vnode时进行调用
  init (
    vnode: VNodeWithData, //当前组件的vnode
    hydrating: boolean //是否是服务端渲染
    ): ?boolean {

    if (
      vnode.componentInstance &&  //如果当前组件已经实例化过了 不是第一次初始化
      !vnode.componentInstance._isDestroyed && //并且没有被销毁
      vnode.data.keepAlive //并且是keepalive的
    ) {
      const mountedNode: any = vnode 

      componentVNodeHooks.prepatch(mountedNode, mountedNode) // keepalive组件 保持原有组件信息

    } else {
      //创建一个vue实例 还没挂载
      const child = vnode.componentInstance = createComponentInstanceForVnode( 
        vnode,
        activeInstance
      ) 

      child.$mount(hydrating ? vnode.elm : undefined, hydrating) //挂载当前组件实例这时就开始了深度递归的组件渲染了

    }
  },


  //keepalive组件 保持原有组件信息
  prepatch (oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
    const options = vnode.componentOptions
    const child = vnode.componentInstance = oldVnode.componentInstance
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    )
  },
  
  //插入时调用
  insert (vnode: MountedComponentVNode) {
    const { context, componentInstance } = vnode
    if (!componentInstance._isMounted) {
      componentInstance._isMounted = true
      callHook(componentInstance, 'mounted')
    }
    if (vnode.data.keepAlive) {
      if (context._isMounted) {
        // vue-router#1212
        // During updates, a kept-alive component's child components may
        // change, so directly walking the tree here may call activated hooks
        // on incorrect children. Instead we push them into a queue which will
        // be processed after the whole patch process ended.
        queueActivatedComponent(componentInstance)
      } else {
        activateChildComponent(componentInstance, true /* direct */)
      }
    }
  },

  //组件销毁时调用 
  destroy (vnode: MountedComponentVNode) {

    const { componentInstance } = vnode //获取组件实例

    if (!componentInstance._isDestroyed) {
       //如果组件实例没有销毁过
      if (!vnode.data.keepAlive) {
        //并且不是keepalive 的 就调用 $destroy()进行组件销毁
        componentInstance.$destroy()
      } else {
        //如果是keepalive的
        deactivateChildComponent(componentInstance, true /* direct */)
      }
    }
  }
}

const hooksToMerge = Object.keys(componentVNodeHooks)

/**
 * @description: 创建组件的vnode
 * @param {*}
 * @return {*}
 */
export function createComponent (
  Ctor: Class<Component> | Function | Object | void, //传入的 可能是一个组件 一个标签名  一个方法
  data: ?VNodeData, //data
  context: Component,//上下文
  children: ?Array<VNode>,//子组件
  tag?: string //标签
): VNode | Array<VNode> | void {

  if (isUndef(Ctor)) {
  //当不存在构造器时 返回
    return
  }

  //获取基础的构造器  就是最初始定义的VUE对象
  const baseCtor = context.$options._base 

  //如果构造函数是一个对象 说明不是异步组件
  if (isObject(Ctor)) {
    Ctor = baseCtor.extend(Ctor) 
  }

  //当组件的构造函数 不是 函数类型时
  if (typeof Ctor !== 'function') {
    if (process.env.NODE_ENV !== 'production') {
      warn(`Invalid Component definition: ${String(Ctor)}`, context)
    }
    return
  }

  //异步组件
  let asyncFactory
  
  if (isUndef(Ctor.cid)) {
    //当构造函数中不存在cid 说明是一个异步构造函数
    asyncFactory = Ctor

    Ctor = resolveAsyncComponent(asyncFactory, baseCtor, context) //异步构造组件生产

    if (Ctor === undefined) {
      return createAsyncPlaceholder(
        asyncFactory,
        data,
        context,
        children,
        tag
      )
    }
  }

  data = data || {} //获取当前节点的编译后的节点信息


  //递归往前合并父类的options
  resolveConstructorOptions(Ctor) 

  if (isDef(data.model)) {
    //将组建上的v-model信息 转换成 props 和 event 在 data.props data.on上
    transformModel(Ctor.options, data)
  }

  // 校验props 并提取出props 用于函数式组件
  const propsData = extractPropsFromVNodeData(data, Ctor, tag)

  if (isTrue(Ctor.options.functional)) {
    //如果是函数式组件
    return createFunctionalComponent(Ctor, propsData, data, context, children) //创建一个函数式组件
  }


  //提取出监听器
  const listeners = data.on
  // replace with listeners with .native modifier
  // so it gets processed during parent component patch.
  //将nativeOn 的 事件替换 on的事件
  //使其在父组件patch时可以得到处理
  data.on = data.nativeOn

  //判断是不是抽象组件  transition  keepalive 抽象组件不保留任何东西
  //除了 props & listeners & slot
  if (isTrue(Ctor.options.abstract)) {
    const slot = data.slot
    data = {}
    if (slot) {
      data.slot = slot
    }
  }

  //初始化组件的钩子函数 这些钩子在patch的时候是有用的
  installComponentHooks(data)

  // 创建一个组件vnode
  const name = Ctor.options.name || tag
  
  //组件的vnode 是没有children
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data, undefined, undefined, undefined, context,
    { Ctor, propsData, listeners, tag, children },
    asyncFactory
  )


  // Weex specific: invoke recycle-list optimized @render function for
  // extracting cell-slot template.
  // https://github.com/Hanks10100/weex-native-directive/tree/master/component
  /* istanbul ignore if */
  if (__WEEX__ && isRecyclableComponent(vnode)) {
    return renderRecyclableComponentTemplate(vnode)
  }

  return vnode
}

/**
 * @description: 创建一个组件实例
 * @param {*}
 * @return {*}
 */
export function createComponentInstanceForVnode (
  vnode: any, //当前组件vnode
  parent: any, //当前组件所在的父vue实例
): Component {


  /**
   * @description: 创建组件的配置
   * @param {*}
   * @return {*}
   */
  const options: InternalComponentOptions = {
    _isComponent: true, //标明是一个组件
    _parentVnode: vnode, //当前组件内的元素 所在的环境 就是当前组件的vnode
    parent //当前组件所在的 父vue实例
  }


  // 检查一下当前组件是不是行内模板渲染的组件
  const inlineTemplate = vnode.data.inlineTemplate

  if (isDef(inlineTemplate)) {
    //如果是行内模板 忽略组件内部定义的容易 使用模板渲染
    options.render = inlineTemplate.render //调用inline 模板的渲染函数
    options.staticRenderFns = inlineTemplate.staticRenderFns//调用inline 模板的渲染函数
  }

  return new vnode.componentOptions.Ctor(options) //返回一个新的vue实例

}


//初始化组件的钩子函数   把 componentVNodeHooks 的钩子函数合并到 data.hook 在 VNode 执行 patch 的过程中执行相关的钩子函数这里要注意的是合并策略，
//在合并过程中，如果某个时机的钩子已经存在 data.hook 中，那么通过执行 mergeHook 函数做合并，这个逻辑很简单，就是在最终执行的时候，依次执行这两个钩子函数即可

function installComponentHooks (data: VNodeData) {

  //先获取原有的hook
  const hooks = data.hook || (data.hook = {}) 

  //hooksToMerge  init  prepatch  insert  destroy
  for (let i = 0; i < hooksToMerge.length; i++) {

    const key = hooksToMerge[i]

    const existing = hooks[key]  //获取 已经存在的hook

    const toMerge = componentVNodeHooks[key] 

    //如果存在的和默认的不一致时 并且存在的还没有被合并过
    if (existing !== toMerge && !(existing && existing._merged)) {
      hooks[key] = existing ? mergeHook(toMerge, existing) : toMerge
    }
  }

}

function mergeHook (f1: any, f2: any): Function {
  const merged = (a, b) => {
    // flow complains about extra args which is why we use any
    f1(a, b)
    f2(a, b)
  }
  merged._merged = true
  return merged
}

//将组建上的v-model 转换成 props 和 event  实际效果 <child :value="message" @input="message=arguments[0]"></child>' +
function transformModel (options, data: any) {
   

  //获取组件内部中的 设置的model的prop 默认是value
  const prop = (options.model && options.model.prop) || 'value' 

  //获取组件中内部中的 设置的model的event 默认是input事件
  const event = (options.model && options.model.event) || 'input'

  //获取v-model的
  const addTo = (options.props && prop in options.props) ? 'props' : 'attrs'
  
  //设置用户定义的 v-model的表达式
  ;(data[addTo] || (data[addTo] = {}))[prop] = data.model.value
 

  const on = data.on || (data.on = {})

  const existing = on[event]

  const callback = data.model.callback

  if (isDef(existing)) {
    if (
      Array.isArray(existing)
        ? existing.indexOf(callback) === -1
        : existing !== callback
    ) {
      on[event] = [callback].concat(existing)
    }
  } else {
    on[event] = callback
  }
}
