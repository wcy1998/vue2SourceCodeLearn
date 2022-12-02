/* @flow */

import {
  isDef, //不为null
  isUndef //为null
} from 'shared/util'

import {
  updateListeners  ////更新实例的监听事件
} from 'core/vdom/helpers/index'

import {
  isIE, //是不是ie浏览器
  supportsPassive,//是不是支持passive
  isUsingMicroTask //是不是正在使用微任务
} from 'core/util/index'

import {
  RANGE_TOKEN, // 事件在编译期间保留的一些标记
  CHECKBOX_RADIO_TOKEN //事件在编译期间保留的一些标记
} from 'web/compiler/directives/model'

import { currentFlushTimestamp } from 'core/observer/scheduler'

// normalize v-model event tokens that can only be determined at runtime.
// it's important to place the event as the first in the array because
// the whole point is ensuring the v-model callback gets called before
// user-attached handlers.


//规范化只能在运行时确定的 v-model 事件标记。
// 将事件放在数组中的第一个位置很重要，因为
// 重点是确保 v-model 回调在之前被调用
// 用户附加的处理程序。

function normalizeEvents(on) {
  /* istanbul ignore if */

  //range标志 如果事件存在range标志
  if (isDef(on[RANGE_TOKEN])) {

    // IE input[type=range] only supports `change` event
    const event = isIE ? 'change' : 'input'

    on[event] = [].concat(on[RANGE_TOKEN], on[event] || [])

    delete on[RANGE_TOKEN]

  }

  // This was originally intended to fix #4521 but no longer necessary
  // after 2.5. Keeping it for backwards compat with generated code from < 2.4
  /* istanbul ignore if */
  if (isDef(on[CHECKBOX_RADIO_TOKEN])) {
    on.change = [].concat(on[CHECKBOX_RADIO_TOKEN], on.change || [])
    delete on[CHECKBOX_RADIO_TOKEN]
  }

}


let target: any

function createOnceHandler(event, handler, capture) {
  const _target = target // save current target element in closure
  return function onceHandler() {
    const res = handler.apply(null, arguments)
    if (res !== null) {
      remove(event, onceHandler, capture, _target)
    }
  }
}

function add(
  name: string,
  handler: Function,
  capture: boolean,
  passive: boolean
) {
  // async edge case #6566: inner click event triggers patch, event handler
  // attached to outer element during patch, and triggered again. This
  // happens because browsers fire microtask ticks between event propagation.
  // the solution is simple: we save the timestamp when a handler is attached,
  // and the handler would only fire if the event passed to it was fired
  // AFTER it was attached.
  if (isUsingMicroTask) {
    const attachedTimestamp = currentFlushTimestamp
    const original = handler
    handler = original._wrapper = function (e) {
      if (e.timeStamp >= attachedTimestamp) {
        return original.apply(this, arguments)
      }
    }
  }

  target.addEventListener(
    name,
    handler,
    supportsPassive
      ? { capture, passive }
      : capture
  )

}

function remove(
  name: string,
  handler: Function,
  capture: boolean,
  _target?: HTMLElement
) {
  (_target || target).removeEventListener(
    name,
    handler._wrapper || handler,
    capture
  )
}

//path过程中更新事件的绑定
function updateDOMListeners(
  oldVnode: VNodeWithData, //旧的虚拟节点
  vnode: VNodeWithData //新的虚拟节点
) {

  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    //如果新的旧的虚拟节点都不存在
    return
  }

  const on = vnode.data.on || {}

  const oldOn = oldVnode.data.on || {}

  //当前节点的真实dom
  target = vnode.elm

  normalizeEvents(on)

  //更新
  updateListeners(
    on, //新事件
    oldOn, //旧事件
    add, //添加方法
    remove, //移除方法
    createOnceHandler, //创建一次执行函数
    vnode.context //当前的上下文
  )

  target = undefined

}

export default {
  create: updateDOMListeners,
  update: updateDOMListeners
}
