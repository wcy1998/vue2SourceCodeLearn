/* @flow */

import {
  warn,
  invokeWithErrorHandling
} from 'core/util/index'
import {
  cached,
  isUndef, //判断一个值 是不是null 或 undefined
  isTrue,
  isPlainObject
} from 'shared/util'

const normalizeEvent = cached((name: string): {
  name: string,
  once: boolean,
  capture: boolean,
  passive: boolean,
  handler?: Function,
  params?: Array<any>
} => {

  const passive = name.charAt(0) === '&'
  name = passive ? name.slice(1) : name
  const once = name.charAt(0) === '~' // Prefixed last, checked first
  name = once ? name.slice(1) : name
  const capture = name.charAt(0) === '!'
  name = capture ? name.slice(1) : name
  return {
    name,
    once,
    capture,
    passive
  }
})

//创建函数执行
export function createFnInvoker(
  fns: Function | Array<Function>, //执行表达式
  vm: ?Component 
): Function {
  function invoker() {
    const fns = invoker.fns
    if (Array.isArray(fns)) {
      const cloned = fns.slice()
      for (let i = 0; i < cloned.length; i++) {
        invokeWithErrorHandling(cloned[i], null, arguments, vm, `v-on handler`)
      }
    } else {
      // return handler return value for single handlers
      return invokeWithErrorHandling(fns, null, arguments, vm, `v-on handler`)
    }
  }
  invoker.fns = fns
  return invoker
}


export function updateListeners( //更新dom的事件监听
  on: Object, //新的事件
  oldOn: Object,//旧的事件
  add: Function, //添加方法
  remove: Function,//移除方法
  createOnceHandler: Function,//执行一次的方法
  vm: Component //当前实例 
) {


  let name, //事件名

    def, //当前的事件表达式
    cur, // 当前的事件表达式

    old, //旧事件中相同名称的事件表达式

    event //事件的修饰符

  //遍历新事件的事件名
  for (name in on) {

    def = cur = on[name]

    old = oldOn[name] //获取当前实例旧的监听函数中与要添加的监听函数同名的函数

    event = normalizeEvent(name) //返回事件的名称和修饰符

    if (__WEEX__ && isPlainObject(def)) {
      //weex环境中

      cur = def.handler //新事件的处理函数

      event.params = def.params //获取要加入的事件的参数 

    }

    if (isUndef(cur)) {
      //如果新事件名不存在表达式 进行提示
      process.env.NODE_ENV !== 'production' && warn(
        `Invalid handler for event "${event.name}": got ` + String(cur),
        vm
      )
    } else if (isUndef(old)) {

      //如果旧事件中不存在对应名称的事件

      if (isUndef(cur.fns)) {

        //如果新事件的fns不存在

        cur = on[name] = createFnInvoker(cur, vm)

      }

      if (isTrue(event.once)) {

        //如果只执行一次 创建只执行一次的方法
        cur = on[name] = createOnceHandler(event.name, cur, event.capture)

      }
      
      //添加方法
      add(event.name, cur, event.capture, event.passive, event.params) 
    } else if (cur !== old) {

      //当前事件 和 旧事件不同时 旧事件的表达式被新的覆盖
      old.fns = cur

      on[name] = old

    }
  }

  for (name in oldOn) {

    //遍历就的事件
    if (isUndef(on[name])) {
      //如果新加入的事件中 没有和旧事件相同的
      event = normalizeEvent(name)

      remove(event.name, oldOn[name], event.capture) //移除旧事件

    }
    
  }

}
