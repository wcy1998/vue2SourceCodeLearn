/* @flow */
/* globals MutationObserver */


import { noop } from 'shared/util' //空执行
import { handleError } from './error' //错误处理
import { isIE, //是否是 ie
   isIOS, //是否是苹果系统
   isNative //是否是原生支持的
  } from './env'

export let isUsingMicroTask = false //是使用 promise  还是MutationObserver

const callbacks = []//调用栈

let pending = false  //是不是等待状态

/**
 * @description:刷新调用栈 
 * @param {*}
 * @return {*}
 */
function flushCallbacks () {

  pending = false //正在执行

  const copies = callbacks.slice(0) //复制当前调用栈

  callbacks.length = 0 //清空调用栈

  for (let i = 0; i < copies.length; i++) {
    copies[i]() //执行调用栈中的任务
  }

}

// Here we have async deferring wrappers using microtasks.
// In 2.5 we used (macro) tasks (in combination with microtasks).
// However, it has subtle problems when state is changed right before repaint
// (e.g. #6813, out-in transitions).
// Also, using (macro) tasks in event handler would cause some weird behaviors
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
// So we now use microtasks everywhere, again.
// A major drawback of this tradeoff is that there are some scenarios
// where microtasks have too high a priority and fire in between supposedly
// sequential events (e.g. #4521, #6690, which have workarounds)
// or even between bubbling of the same event (#6566).
let timerFunc //生成一个微任务

// The nextTick behavior leverages the microtask queue, which can be accessed
// via either native Promise.then or MutationObserver.
// MutationObserver has wider support, however it is seriously bugged in
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
// completely stops working after triggering a few times... so, if native
// Promise is available, we will use it:
/* istanbul ignore next, $flow-disable-line */

if (typeof Promise !== 'undefined' && isNative(Promise)) {
  //如果支持promise
  const p = Promise.resolve() //新建一个成功的promise任务

  timerFunc = () => {

    p.then(flushCallbacks) //在微任务中刷新当前任务队列
    
    // In problematic UIWebViews, Promise.then doesn't completely break, but
    // it can get stuck in a weird state where callbacks are pushed into the
    // microtask queue but the queue isn't being flushed, until the browser
    // needs to do some other work, e.g. handle a timer. Therefore we can
    // "force" the microtask queue to be flushed by adding an empty timer.
    //在有问题的 UIWebViews 中，Promise.then 并没有完全中断，
    //但它可能会陷入一种奇怪的状态，即回调被推入微任务队列但队列没有被刷新，
    //直到浏览器需要做一些其他工作，例如 处理计时器。
    // 因此，我们可以通过添加一个空计时器来“强制”刷新微任务队列
    if (isIOS) setTimeout(noop) //如果是苹果系统就 空即时 刷新微任务队列

  }

  isUsingMicroTask = true //正在使用微任务

} else if (!isIE && typeof MutationObserver !== 'undefined' && (
   //当不是ie 且存在MutationObserver
  isNative(MutationObserver) ||
  // PhantomJS and iOS 7.x
  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
  //在原生promise不支持的情况下使用 MutationObserver
  // Use MutationObserver where native Promise is not available,
  // e.g. PhantomJS, iOS7, Android 4.4
  // (#6466 MutationObserver is unreliable in IE11)
  let counter = 1

  const observer = new MutationObserver(flushCallbacks)

  const textNode = document.createTextNode(String(counter))

  observer.observe(textNode, {
    characterData: true
  })

  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }

  isUsingMicroTask = true

} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  //比settimeout 更好地宏任务
  // Fallback to setImmediate.
  // Techinically it leverages the (macro) task queue,
  // but it is still a better choice than setTimeout.
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  // Fallback to setTimeout.
  timerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}

/**
 * @description: 下一次更新
 * @param {*} cb 执行函数 不是必传
 * @param {*} ctx 上下文 不是必传
 * @return {*}
 */
export function nextTick (cb?: Function, ctx?: Object) {

  let _resolve //promise resolve方法

  //向callbacks调用栈推入nextTick执行的方法
  callbacks.push(() => {
    if (cb) {
      //如果存在方法
      try {
        cb.call(ctx) //调用该方法
      } catch (e) {
         //报错处理
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
         //promise 的
      _resolve(ctx)
    }

  })

 
  //如果在等待中
  if (!pending) {
    pending = true
    timerFunc()
  }

  if (!cb && typeof Promise !== 'undefined') {
       //如果不存在执行函数 且支持promise
    return new Promise(resolve => { //就返回一个 promise对象
      _resolve = resolve
    })
  }
}
