/* @flow */



//Object.freeze() 方法可以冻结一个对象。一个被冻结的对象再也不能被修改；
//冻结了一个对象则不能向这个对象添加新的属性，不能删除已有属性，
//不能修改该对象已有属性的可枚举性、可配置性、可写性，以及不能修改已有属性的值。
//此外，冻结一个对象后该对象的原型也不能被修改。freeze() 返回和传入的参数相同的对象。
export const emptyObject = Object.freeze({}) 


//判断一个值 是不是null 或 undefined
export function isUndef (v: any): boolean {
  return v === undefined || v === null
}


// 判断一个值 是不是不为null 或不为 undefined
export function isDef (v: any): boolean {
  return v !== undefined && v !== null
}

//判断一个值是否为true
export function isTrue (v: any): boolean {
  return v === true
}

//判断一个值是否为false
export function isFalse (v: any): boolean {
  return v === false
}

//检查值是否为原始值
export function isPrimitive (value: any): boolean  {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    // $flow-disable-line
    typeof value === 'symbol' ||
    typeof value === 'boolean'
  )
}

//检查值是否为对象
export function isObject (obj: mixed): boolean  {
  return obj !== null && typeof obj === 'object'
}


//元素的toString 方法
const _toString = Object.prototype.toString


// 获取值的类型 字符串
export function toRawType (value: any): string {
  return _toString.call(value).slice(8, -1)
}


//判断是不是真正的object对象
export function isPlainObject (obj: any): boolean {
  return _toString.call(obj) === '[object Object]'
}


//判断是不是正则
export function isRegExp (v: any): boolean {
  return _toString.call(v) === '[object RegExp]'
}


//判断一个值是不是有效的数组索引
export function isValidArrayIndex (val: any): boolean {
  const n = parseFloat(String(val))
  return n >= 0 && Math.floor(n) === n && isFinite(val)
}


//判断是不是promise对象
export function isPromise (val: any): boolean {
  return (
    isDef(val) &&
    typeof val.then === 'function' &&
    typeof val.catch === 'function'
  )
}

//将值转换为实际呈现的字符串
export function toString (val: any): string {
  return val == null
    ? ''
    : Array.isArray(val) || (isPlainObject(val) && val.toString === _toString)
      ? JSON.stringify(val, null, 2)
      : String(val)
}


//将输入值转换为数字以保持持久性。如果转换失败，则返回原始字符串
export function toNumber (val: string): number | string {
  const n = parseFloat(val)
  return isNaN(n) ? val : n
}


//创建map并返回一个函数来检查某个键是否在该地图中，闭包
export function makeMap (
  str: string,
  expectsLowerCase?: boolean
): (key: string) => true | void 
{
  const map = Object.create(null) 
  const list: Array<string> = str.split(',')

  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true
  }
  return expectsLowerCase
    ? val => map[val.toLowerCase()]
    : val => map[val]
}


//检查标签是否为内置标签。
export const isBuiltInTag = makeMap('slot,component', true)


//检查属性是否为保留属性
export const isReservedAttribute = makeMap('key,ref,slot,slot-scope,is')

//从数组中删除一个项目
export function remove (arr: Array<any>, item: any): Array<any> | void {
  if (arr.length) {
    const index = arr.indexOf(item)
    if (index > -1) {
      return arr.splice(index, 1)
    }
  }
}


//检查对象是否具有该属性
const hasOwnProperty = Object.prototype.hasOwnProperty

//检查对象是否具有该属性
export function hasOwn (obj: Object | Array<*>, key: string): boolean {
  return hasOwnProperty.call(obj, key)
}


//利用闭包 创建纯函数的缓存版本
export function cached(fn){
  const cache = Object.create(null) //创建一个空对象
  return (function cachedFn (str) {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  })
}

//骆驼化连字符分隔的字符串
const camelizeRE = /-(\w)/g
export const camelize = cached((str) => {
  return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : '')
})


//将字符串大写
export const capitalize = cached((str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
})


// 连接驼峰式字符串
const hyphenateRE = /\B([A-Z])/g
export const hyphenate = cached((str: string): string => {
  return str.replace(hyphenateRE, '-$1').toLowerCase()
})

/**
 * 不支持它的环境的简单绑定 polyfill，例如，PhantomJS 1.x。 从技术上讲，我们不再需要这个，
 * 因为原生绑定现在在大多数浏览器中已经足够了。 但是删除它意味着破坏能够在 PhantomJS 1.x 中运行的代码，
 * 因此必须保留它以实现向后兼容性。
 * Simple bind polyfill for environments that do not support it,
 * e.g., PhantomJS 1.x. Technically, we don't need this anymore
 * since native bind is now performant enough in most browsers.
 * But removing it would mean breaking code that was able to run in
 * PhantomJS 1.x, so this must be kept for backward compatibility.
 * 兼容bind函数 如果环境不支持
 */

/* istanbul ignore next */
function polyfillBind (fn: Function, ctx: Object): Function {
  function boundFn (a) {
    const l = arguments.length
    return l
      ? l > 1
        ? fn.apply(ctx, arguments)
        : fn.call(ctx, a)
      : fn.call(ctx)
  }

  boundFn._length = fn.length
  return boundFn
}


/**
 * @description: 原生的bind函数
 * @param {*} fn
 * @param {*} ctx
 * @return {*}
 */
function nativeBind (fn: Function, ctx: Object): Function {
  return fn.bind(ctx)
}


//当环境支持bind函数 是用原生 不支持用兼容的
export const bind = Function.prototype.bind
  ? nativeBind
  : polyfillBind


//将类数组对象转换为真正的数组
export function toArray (list: any, start?: number): Array<any> {
  start = start || 0
  let i = list.length - start
  const ret: Array<any> = new Array(i)
  while (i--) {
    ret[i] = list[i + start]
  }
  return ret
}


// 将属性混合到目标对象中
export function extend (to: Object, _from: ?Object): Object {
  for (const key in _from) {
    to[key] = _from[key]
  }
  return to
}


// 将一组对象合并为一个对象
export function toObject (arr: Array<any>): Object {
  const res = {}
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) {
      extend(res, arr[i])
    }
  }
  return res
}


//空执行
export function noop (a?: any, b?: any, c?: any) {

}

//永远返回false的函数
export const no = (a?: any, b?: any, c?: any) => false

/* eslint-enable no-unused-vars */


//返回传入的对象
export const identity = (_: any) => _


//从编译器模块生成一个包含静态键的字符串
function genStaticKeys (modules) {
  return modules.reduce((keys, m) => {
    return keys.concat(m.staticKeys || [])
  }, []).join(',')
}

//检查两个值是否大致相等 - 也就是说，如果它们是普通对象，它们是否具有相同的形状
export function looseEqual (a: any, b: any): boolean {
  if (a === b) return true
  const isObjectA = isObject(a)
  const isObjectB = isObject(b)
  if (isObjectA && isObjectB) {
    try {
      const isArrayA = Array.isArray(a)
      const isArrayB = Array.isArray(b)
      if (isArrayA && isArrayB) {
        return a.length === b.length && a.every((e, i) => {
          return looseEqual(e, b[i])
        })
      } else if (a instanceof Date && b instanceof Date) {
        return a.getTime() === b.getTime()
      } else if (!isArrayA && !isArrayB) {
        const keysA = Object.keys(a)
        const keysB = Object.keys(b)
        return keysA.length === keysB.length && keysA.every(key => {
          return looseEqual(a[key], b[key])
        })
      } else {
        /* istanbul ignore next */
        return false
      }
    } catch (e) {
      /* istanbul ignore next */
      return false
    }
  } else if (!isObjectA && !isObjectB) {
    return String(a) === String(b)
  } else {
    return false
  }
}


//返回可以在数组中找到大致相等值的第一个索引（如果 value 是普通对象，则数组必须包含相同形状的对象），如果不存在，则返回 -1
export function looseIndexOf (arr: Array<mixed>, val: mixed): number {
  for (let i = 0; i < arr.length; i++) {
    if (looseEqual(arr[i], val)) return i
  }
  return -1
}


//利用闭包 确保一个函数只被调用一次
export function once (fn: Function): Function {
  let called = false
  return function () {
    if (!called) {
      called = true
      fn.apply(this, arguments)
    }
  }
}
