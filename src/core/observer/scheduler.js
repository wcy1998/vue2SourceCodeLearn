/* @flow */

import type Watcher from './watcher'
import config from '../config' //默认配置
import { callHook, activateChildComponent } from '../instance/lifecycle'

import {
  warn,
  nextTick,
  devtools,
  inBrowser
} from '../util/index'

export const MAX_UPDATE_COUNT = 100

const queue: Array<Watcher> = []
const activatedChildren: Array<Component> = []
let has: { [key: number]: ?true } = {} //用于判断是否已存在
let circular: { [key: number]: number } = {}
let waiting = false //是否在等待
let flushing = false //是否正在刷新队列
let index = 0 //当前索引

/**
 * Reset the scheduler's state.
 */
function resetSchedulerState () {
  index = queue.length = activatedChildren.length = 0
  has = {}
  if (process.env.NODE_ENV !== 'production') {
    circular = {}
  }
  waiting = flushing = false
}

// Async edge case #6566 requires saving the timestamp when event listeners are
// attached. However, calling performance.now() has a perf overhead especially
// if the page has thousands of event listeners. Instead, we take a timestamp
// every time the scheduler flushes and use that for all event listeners
// attached during that flush.
export let currentFlushTimestamp = 0

// Async edge case fix requires storing an event listener's attach timestamp.
let getNow: () => number = Date.now

// Determine what event timestamp the browser is using. Annoyingly, the
// timestamp can either be hi-res ( relative to poge load) or low-res
// (relative to UNIX epoch), so in order to compare time we have to use the
// same timestamp type when saving the flush timestamp.
if (inBrowser && getNow() > document.createEvent('Event').timeStamp) {
  // if the low-res timestamp which is bigger than the event timestamp
  // (which is evaluated AFTER) it means the event is using a hi-res timestamp,
  // and we need to use the hi-res version for event listeners as well.
  getNow = () => performance.now()
}

/**
 * Flush both queues and run the watchers.
 * 刷新队列运行观察者
 */
function flushSchedulerQueue () {

  currentFlushTimestamp = getNow() //获取当前的时间戳

  flushing = true

  let watcher, id

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.
  //在刷新之前对队列进行排序
  //组件从父组件更新到子组件。 （因为父母总是在孩子之前创建）
  //组件的用户观察者在其渲染观察者之前运行（因为用户观察者是在渲染观察者之前创建的）
  //如果在父组件的观察者运行期间组件被破坏，则可以跳过其观察者
  queue.sort((a, b) => a.id - b.id)

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  //不要缓存长度，因为可能会推送更多的观察者
   // 当我们运行现有的观察者时

  for (index = 0; index < queue.length; index++) {

     //循环遍历当前队列

    watcher = queue[index] //取出第一个观察者

    if (watcher.before) {

      watcher.before() //执行观察者的before

    }

    id = watcher.id //观察者id

    has[id] = null //清空当前观察者的id 在set中
    
    watcher.run() //执行当前观察者

    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      //不是生产环境 且 已有该观察者 你可能存在无限循环
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

  // keep copies of post queues before resetting state
  //保留发布队列的副本
  const activatedQueue = activatedChildren.slice()
  
  const updatedQueue = queue.slice()

  resetSchedulerState()

  // call component updated and activated hooks
  callActivatedHooks(activatedQueue)
  callUpdatedHooks(updatedQueue)

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}

function callUpdatedHooks (queue) {
  let i = queue.length
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    if (vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
export function queueActivatedComponent (vm: Component) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false
  activatedChildren.push(vm)
}

function callActivatedHooks (queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true /* true */)
  }
}

/**
将观察者推入观察者队列。
具有重复 ID 的作业将被跳过，除非它是
  当队列被刷新时推送。
 */
/**
 * @description: 
 * @param {*} watcher 观察者对象
 * @return {*}
 */
export function queueWatcher (watcher: Watcher) {

  const id = watcher.id //获取当前观察者的id

  if (has[id] == null) {

    //当不存在这个观察者时

    has[id] = true //记录当前观察者

    if (!flushing) { 
      //当没有刷新队列时 项队列中推入观察者对象
      queue.push(watcher)

    } else {
      //如果刷新了 如果已经刷新，则根据其 id 拼接观察者
       // 如果已经超过它的 id，它将立即运行。
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.

      let i = queue.length - 1 //获取队列中最后一个的索引

      //获取到当前id 
      while (i > index && queue[i].id > watcher.id) {
        //当不是最后一个时 并且最后一个id  大于当前watcher的id
        i--
      }

      queue.splice(i + 1, 0, watcher) //向队列中添加该watcher

    }

    // queue the flush

    if (!waiting) {
       //如果现在不是等待状态
      waiting = true

      if (process.env.NODE_ENV !== 'production' && !config.async) {
         //当不是生产环境时 且不是异步执行时
        flushSchedulerQueue()
        return
      }
      //在微任务中执行flushSchedulerQueue
      nextTick(flushSchedulerQueue)
      
    }

  }
}
