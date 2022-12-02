/* @flow */

// can we use __proto__?
export const hasProto = '__proto__' in {}

// Browser environment sniffing
export const inBrowser = typeof window !== 'undefined' //是否是浏览器环境

export const inWeex = typeof WXEnvironment !== 'undefined' && !!WXEnvironment.platform //是否是weex环境

export const weexPlatform = inWeex && WXEnvironment.platform.toLowerCase() //是否是weex环境

export const UA = inBrowser && window.navigator.userAgent.toLowerCase() //浏览器信息

export const isIE = UA && /msie|trident/.test(UA) //是不是IE浏览器
 
export const isIE9 = UA && UA.indexOf('msie 9.0') > 0 //是不是IE9以上的浏览器

export const isEdge = UA && UA.indexOf('edge/') > 0 //是不是EDGE浏览器

export const isAndroid = (UA && UA.indexOf('android') > 0) || (weexPlatform === 'android') //是不是安卓

export const isIOS = (UA && /iphone|ipad|ipod|ios/.test(UA)) || (weexPlatform === 'ios') //是不是苹果

export const isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge //是不是谷歌浏览器

export const isPhantomJS = UA && /phantomjs/.test(UA)

// Firefox has a "watch" function on Object.prototype...
export const nativeWatch = ({}).watch

export let supportsPassive = false

if (inBrowser) {
  try {
    const opts = {}
    Object.defineProperty(opts, 'passive', ({
      get () {
        /* istanbul ignore next */
        supportsPassive = true
      }
    }: Object)) // https://github.com/facebook/flow/issues/285
    window.addEventListener('test-passive', null, opts)
  } catch (e) {}
}


// 这需要延迟评估，因为在 vue-server-renderer 设置 VUE_ENV 之前可能需要 vue
let _isServer
/**
 * @description: 判断是不是服务端渲染
 * @param {*}
 * @return {*}
 */
export const isServerRendering = () => { 

  if (_isServer === undefined) {
      
    if (!inBrowser && !inWeex && typeof global !== 'undefined') {
      //当不是浏览器环境 不是 weex 不存在global对象时
      //检测 vue-server-renderer 的存在并避免 Webpack 填充进程
      _isServer = global['process'] && global['process'].env.VUE_ENV === 'server'
    } else {
      _isServer = false
    }

  }

  return _isServer

}


// detect devtools
export const devtools = inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__

/* istanbul ignore next */
export function isNative (Ctor: any): boolean {
  return typeof Ctor === 'function' && /native code/.test(Ctor.toString())
}

export const hasSymbol =
  typeof Symbol !== 'undefined' && isNative(Symbol) &&
  typeof Reflect !== 'undefined' && isNative(Reflect.ownKeys)


let _Set //set 对象

if (typeof Set !== 'undefined' && isNative(Set)) {
  // 当前环境支持set时直接使用es6的set
  _Set = Set
} else {
  // 一个非标准的 Set polyfill，只适用于原始键。
  //用于判断是不是已经存在了
  //当前环境不支持set时 就是用一个自定义的set补丁
  _Set = class Set implements SimpleSet {

    set: Object;

    constructor () {

      this.set = Object.create(null) //创建一个空对象

    }

    has (key: string | number) {

      return this.set[key] === true

    }

    add (key: string | number) {

      this.set[key] = true

    }

    clear () {

      this.set = Object.create(null)

    }

  }
}

interface SimpleSet {
  has(key: string | number): boolean;
  add(key: string | number): mixed;
  clear(): void;
}

export { _Set }
export type { SimpleSet }
