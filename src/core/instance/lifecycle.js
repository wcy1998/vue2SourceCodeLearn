/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import { mark, measure } from '../util/perf'
import { createEmptyVNode } from '../vdom/vnode'
import { updateComponentListeners } from './events'
import { resolveSlots } from './render-helpers/resolve-slots'
import { toggleObserving } from '../observer/index'
import { pushTarget, popTarget } from '../observer/dep'

import {
  warn,
  noop,
  remove, //从数组中删除一个项目。
  emptyObject,
  validateProp,
  invokeWithErrorHandling
} from '../util/index'

//这个 activeInstance 作用就是保持当前上下文的 Vue 实例，
//它是在 lifecycle 模块的全局变量，定义是 export let activeInstance: any = null，
//并且在之前我们调用 createComponentInstanceForVnode 方法的时候从 lifecycle 模块获取，
//并且作为参数传入的。因为实际上 JavaScript 是一个单线程，Vue 整个初始化是一个深度遍历的过程，
//在实例化子组件的过程中，它需要知道当前上下文的 Vue 实例是什么，
//并把它作为子组件的父 Vue 实例。
//在 vm._update 的过程中，把当前的 vm 赋值给 activeInstance
//，同时通过 const prevActiveInstance = activeInstance
// 用 prevActiveInstance 保留上一次的 activeInstance。实际上，
//prevActiveInstance 和当前的 vm 是一个父子关系，/
//当一个 vm 实例完成它的所有子树的 patch 或者 update 过程后，
//activeInstance 会回到它的父实例，这样就完美地保证了 createComponentInstanceForVnode 整个深度遍历过程中，
//我们在实例化子组件的时候能传入当前子组件的父 Vue 实例，
//并在 _init 的过程中，通过 vm.$parent 把这个父子关系保留。
export let activeInstance: any = null //激活的vm对象
export let isUpdatingChildComponent: boolean = false

export function setActiveInstance(vm: Component) {

  const prevActiveInstance = activeInstance

  activeInstance = vm

  return () => {
    activeInstance = prevActiveInstance
  }

}

//vue实例初始化init合并好相关的options后最先调用的
export function initLifecycle (vm: Component) {

  const options = vm.$options

  //获取当前vue实例的父实例 调过那些抽象实例 向父实例的$children中加入当前实例
  let parent = options.parent 
  if (parent && !options.abstract) {
    while (parent.$options.abstract && parent.$parent) { 
      parent = parent.$parent
    }
    parent.$children.push(vm) 
  }

  //记录当前vue实例的父实例
  vm.$parent = parent 
 
  //设置根实例
  vm.$root = parent ? parent.$root : vm 

  //初始化子实例数组
  vm.$children = []
 
  //初始化当前vue实例的ref对象
  vm.$refs = {} 

  vm._watcher = null //当前vue实例还没有watcher
  vm._inactive = null //当前vue实例不活跃
  vm._directInactive = false //当前vue实例直接不活动
  vm._isMounted = false //当前vue实例还没挂载
  vm._isDestroyed = false //当前vue实例还未销毁
  vm._isBeingDestroyed = false //当前vue实例没有正在销毁
  
}

export function lifecycleMixin (Vue: Class<Component>) {


  //update 是实例的一个私有方法，它被调用的时机有 2 个，一个是首次渲染，一个是数据更新的时候
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {

    const vm: Component = this //获取当前vue实例

    const prevEl = vm.$el //获取当前vue实例要挂载的真实dom

    //获取当前组件之前的VNode
    const prevVnode = vm._vnode 

    //设置当前激活的vm实例的方法 并激活当前实例
    const restoreActiveInstance = setActiveInstance(vm) 

    //设置当前组件内部元素的vnode
    vm._vnode = vnode 

    if (!prevVnode) {
      //当前vue实例没有旧的虚拟节点时
      //首次渲染
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)
    } else {
      // 当前vue实例存在旧的虚拟节点时
      //对比渲染
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
    
    //不在记录当前patch的vue实例
    restoreActiveInstance()

    // update __vue__ reference
    if (prevEl) {
      prevEl.__vue__ = null
    }

    if (vm.$el) {
      vm.$el.__vue__ = vm
    }
    
    //如果当前组件vue实例的组件vnode 和  当前vue实例父实例内部的元素vnode 一致时 说明是一个高阶组件
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
  }


  //$forceUpdate 的逻辑非常简单，就是调用渲染 watcher 的 update 方法，让渲染 watcher 对应的回调函数执行，也就是触发了组件的重新渲染。
  //之所以这么做是因为 Vue 通常是数据驱动视图重新渲染，但是在整个异步组件加载过程中是没有数据发生变化的，
  //所以通过执行 $forceUpdate 可以强制组件重新渲染一次
  Vue.prototype.$forceUpdate = function () {
    const vm: Component = this
    if (vm._watcher) {
      vm._watcher.update()
    }
  }

  /**
   * @description: 组件销毁时调用
   * @param {*}
   * @return {*}
   */
  Vue.prototype.$destroy = function () {

    const vm: Component = this //获取当前组件实例

    if (vm._isBeingDestroyed) {
      //如果是正在销毁的就不在重复销毁了
      return
    }

    callHook(vm, 'beforeDestroy') //调用用户自定义的beforeDestroy hook

    vm._isBeingDestroyed = true //标记正在销毁 

    //从parent中移除
    const parent = vm.$parent//获取当前实例的父实例

    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      //如果存在父实例 且父实例不是正在销毁中 并且当前组件不是抽象组件 进行移除
      remove(parent.$children, vm)
    }

    // 拆除 当前组件的watchers
    if (vm._watcher) {
      vm._watcher.teardown() //移除渲染watchers
    }

    let i = vm._watchers.length

    while (i--) {
      vm._watchers[i].teardown() //移除其他watchers
    }

    // remove reference from data ob
    // frozen object may not have observer.

    //如果当前实例的data已经observe过了
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--
    }

    // call the last hook...
    vm._isDestroyed = true

    // 执行当前渲染树下的destoryhook
    vm.__patch__(vm._vnode, null)

    // fire destroyed hook
    callHook(vm, 'destroyed')

    //取消所有的事件监听
    vm.$off()

    // remove __vue__ reference
    if (vm.$el) {
      vm.$el.__vue__ = null
    }

    // release circular reference (#6759)
    if (vm.$vnode) {
      vm.$vnode.parent = null
    }
  }
  
}


//vue $mouted 挂载节点时候调用
export function mountComponent (
  vm: Component, // 当前要挂载vue实例
  el: ?Element, // 当前实例要挂载到真实的dom
  hydrating?: boolean //是否是服务端渲染
): Component {

  vm.$el = el //给$el 赋值 当前vm挂载到的真实dom

  if (!vm.$options.render) {
    //如果当前实例不存在render函数 //默认render函数设置为渲染空节点
    vm.$options.render = createEmptyVNode 

    if (process.env.NODE_ENV !== 'production') {
      //开发环境下
      if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
      //如果当前vue实例存在模板 且不是#开头的 或者 存在el
        vm.$options.el || el) {
        warn(
          // 您正在使用 Vue 的仅运行时构建，其中模板编译器不可用。 要么将模板预编译为渲染函数，要么使用包含编译器的构建。
          'You are using the runtime-only build of Vue where the template ' +
          'compiler is not available. Either pre-compile the templates into ' +
          'render functions, or use the compiler-included build.',
          vm
        )
      } else {
        //'无法安装组件：模板或渲染功能未定义。',
        warn(
          'Failed to mount component: template or render function not defined.', 
          vm
        )
      }
    }
  }


  callHook(vm, 'beforeMount') 

  let updateComponent //生成当前函数的更新函数

  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    //如果是开发环境下 开启了性能检测

    updateComponent = () => {
      const name = vm._name
      const id = vm._uid
      const startTag = `vue-perf-start:${id}`
      const endTag = `vue-perf-end:${id}`

      mark(startTag)

      const vnode = vm._render() //调用render 生成 当前vue实例的虚拟dom

      mark(endTag)
      measure(`vue ${name} render`, startTag, endTag) //记录当前vue实例生成虚拟dom的时间

      mark(startTag)

      vm._update(vnode, hydrating) //根据生成的虚拟节点调用update更新方法

      mark(endTag)
      measure(`vue ${name} patch`, startTag, endTag) //记录当前vue实例patch的时间
    }

  } else {

    updateComponent = () => {
      //生成环境直接patch 当前vue实例的虚拟节点
      vm._update(
        vm._render() //当前节点的虚拟节点
        , hydrating)
    }
    
  }
 
  //新建一个RenderWatcher观察者 这个观察者用于重新渲染当前vue实例
  new Watcher(vm, updateComponent, noop, {
    before () { //钩子函数
      if (vm._isMounted && !vm._isDestroyed) {
        //当 虚拟dom已经挂载 并且没有销毁时
        callHook(vm, 'beforeUpdate')
      }
    }
  }, true /* isRenderWatcher */)

  hydrating = false
 
  if (vm.$vnode == null) {
    //这里注意 vm.$vnode 表示 Vue 实例的父虚拟 Node，所以它为 Null 则表示当前是根 Vue 的实例，
    //组件的mouted钩子不在这里调用
    vm._isMounted = true
    callHook(vm, 'mounted')
  }
  return vm  //返回当前vue实例
}

export function updateChildComponent (
  vm: Component,
  propsData: ?Object,
  listeners: ?Object,
  parentVnode: MountedComponentVNode,
  renderChildren: ?Array<VNode>
) {
  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = true
  }

  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren.

  // check if there are dynamic scopedSlots (hand-written or compiled but with
  // dynamic slot names). Static scoped slots compiled from template has the
  // "$stable" marker.
  const hasDynamicScopedSlot = !!(
    (parentVnode.data.scopedSlots && !parentVnode.data.scopedSlots.$stable) ||
    (vm.$scopedSlots !== emptyObject && !vm.$scopedSlots.$stable)
  )
  // Any static slot children from the parent may have changed during parent's
  // update. Dynamic scoped slots may also have changed. In such cases, a forced
  // update is necessary to ensure correctness.
  const needsForceUpdate = !!(
    renderChildren ||               // has new static slots
    vm.$options._renderChildren ||  // has old static slots
    hasDynamicScopedSlot
  )

  vm.$options._parentVnode = parentVnode
  vm.$vnode = parentVnode // update vm's placeholder node without re-render

  if (vm._vnode) { // update child tree's parent
    vm._vnode.parent = parentVnode
  }
  vm.$options._renderChildren = renderChildren

  // update $attrs and $listeners hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  vm.$attrs = parentVnode.data.attrs || emptyObject
  vm.$listeners = listeners || emptyObject

  // update props
  if (propsData && vm.$options.props) {
    toggleObserving(false)
    const props = vm._props
    const propKeys = vm.$options._propKeys || []
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i]
      const propOptions: any = vm.$options.props // wtf flow?
      props[key] = validateProp(key, propOptions, propsData, vm)
    }
    toggleObserving(true)
    // keep a copy of raw propsData
    vm.$options.propsData = propsData
  }

  // update listeners
  listeners = listeners || emptyObject
  const oldListeners = vm.$options._parentListeners
  vm.$options._parentListeners = listeners
  updateComponentListeners(vm, listeners, oldListeners)

  // resolve slots + force update if has children
  //去获取当前组件的slot相关的内容
  if (needsForceUpdate) {
    vm.$slots = resolveSlots(renderChildren, parentVnode.context)
    vm.$forceUpdate()
  }

  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = false
  }
}

function isInInactiveTree (vm) {
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) return true
  }
  return false
}

export function activateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = false
    if (isInInactiveTree(vm)) {
      return
    }
  } else if (vm._directInactive) {
    return
  }
  if (vm._inactive || vm._inactive === null) {
    vm._inactive = false
    for (let i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i])
    }
    callHook(vm, 'activated')
  }
}

/**
 * @description: keepalive组件销毁时调用
 * @param {*} vm
 * @param {*} direct
 * @return {*}
 */
export function deactivateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = true
    if (isInInactiveTree(vm)) {
      return
    }
  }
  if (!vm._inactive) {
    vm._inactive = true
    for (let i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i])
    }
    callHook(vm, 'deactivated')
  }
}


//调用当前vue实例的生命周期钩子
export function callHook (vm: Component, hook: string) {


  //向target栈中推入一个空值
  //调用生命周期钩子时禁用 dep 收集
  pushTarget()  

  //获取用户定义的钩子函数
  const handlers = vm.$options[hook]

  const info = `${hook} hook`

  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
         //遍历当前的执行 可能是mixin这些 存在相同的钩子函数
      invokeWithErrorHandling(handlers[i], vm, null, vm, info)
    }
  }
  
  if (vm._hasHookEvent) {
    //如果  _hasHookEvent 
    vm.$emit('hook:' + hook) //调用钩子函数
  }
  popTarget() //弹出目标栈
}
