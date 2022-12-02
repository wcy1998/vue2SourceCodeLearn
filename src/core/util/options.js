/* @flow */

import config from '../config'
import { warn } from './debug'
import { set } from '../observer/index'
import { unicodeLetters } from './lang'
import { nativeWatch, hasSymbol } from './env'

import {
  ASSET_TYPES,
  LIFECYCLE_HOOKS
} from 'shared/constants'

import {
  extend,
  hasOwn,//检查对象是否具有该属性。
  camelize, //骆驼化连字符分隔的字符串。
  toRawType,
  capitalize, // 将字符串大写。 
  isBuiltInTag,
  isPlainObject
} from 'shared/util'

//获取用户自己定义的合并策略
const strats = config.optionMergeStrategies

/**
 * 一下这些选项被限制了 用户是无法进行配置的
 */
if (process.env.NODE_ENV !== 'production') {
 
  //el 和 propsData 的合并策略
  strats.el = strats.propsData =  function (parent, child, vm, key) {
    if (!vm) {
      warn(
        `option "${key}" can only be used during instance ` +
        'creation with the `new` keyword.'
      )
    }
    return defaultStrat(parent, child)
  }

}

/**
 * @description: 真正执行的返回合并的data 的options
 * @param {*} to 新的data
 * @param {*} from 原有的data
 * @return {*}
 */
function mergeData(to: Object, from: ?Object): Object {

  //如果不存在原有的 直接返回新的
  if (!from) return to
  

  let key, toVal, fromVal
 
  //获取旧的中的所有键值
  const keys = hasSymbol
    ? Reflect.ownKeys(from)
    : Object.keys(from)

  for (let i = 0; i < keys.length; i++) {
    //遍历旧的所有键值
    key = keys[i]

    //如果该键值 是被 观察过的 就跳过  
    if (key === '__ob__') continue
   
    //获取新值中相同属性的值
    toVal = to[key]
     
    //获取原有的相同属性的值
    fromVal = from[key]

    if (!hasOwn(to, key)) {
      //如果新的中不存在 就将旧的值合并
      set(to, key, fromVal)
    } else if (
      //如果新旧值不相等 且都是对象时进行合并
      toVal !== fromVal &&
      isPlainObject(toVal) &&
      isPlainObject(fromVal)
    ) {
      mergeData(toVal, fromVal)
    }
  }
  return to
}

export function mergeDataOrFn(
  parentVal: any, //旧data
  childVal: any,  //新data
  vm?: Component //当前vue实例
): ?Function {

  if (!vm) {
     //就是用mixin extend 合并的时候
    //如果没有传入vue实例

    if (!childVal) {
       //如果不存在用户自定义就使用旧的
      return parentVal

    }

    if (!parentVal) {
       //如果旧的不存在就使用新的
      return childVal
    }

    //当被 合并 的data 和 新的data 都存在时 我们需要返回一个返回两者结果的方法
    //这个时候我们不需要检查 被合并的data是不是一个方法 无需检查 parentVal 
     //是否是这里的函数，因为它必须是传递先前合并的函数
    return function mergedDataFn() {
      return mergeData(
        typeof childVal === 'function' ? childVal.call(this, this) : childVal,
        typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
      )
    }
  } else {
    return function mergedInstanceDataFn() {
      // 如果传入了vue实例

      const instanceData = typeof childVal === 'function'
        ? childVal.call(vm, vm)
        : childVal

      const defaultData = typeof parentVal === 'function'
        ? parentVal.call(vm, vm)
        : parentVal

      if (instanceData) {
        return mergeData(instanceData, defaultData)
      } else {
        return defaultData
      }
    }
  }
}


//data的合并策略是如果原有的存在以原有的为主，如果原有的是一个对象就进行合并 就这样递归 ,mixin的顺序会影响最后的合并结果，后面的会覆盖前面的
strats.data = function (
  parentVal: any, //原有的data
  childVal: any, //用户定义的data
  vm?: Component
): ?Function {

  if (!vm) {
    //如果不存在vue实例
    if (childVal && typeof childVal !== 'function') {
      //如果data不是一个方法进行提示
      process.env.NODE_ENV !== 'production' && warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.',
        vm
      )
     //不进行合并
      return parentVal
    }
    //如果传入的是一个方法进行合并
    return mergeDataOrFn(parentVal, childVal)
  }

  return mergeDataOrFn(parentVal, childVal, vm)
}

function mergeHook(
  parentVal: ?Array<Function>, //旧的
  childVal: ?Function | ?Array<Function> //新的
): ?Array<Function> {
  //父级的连接子集的
  const res = childVal
    ? parentVal
      ? parentVal.concat(childVal)
      : Array.isArray(childVal)
        ? childVal
        : [childVal]
    : parentVal

  return res
    ? dedupeHooks(res)
    : res
}

function dedupeHooks(hooks) {
  const res = []
  for (let i = 0; i < hooks.length; i++) {
    if (res.indexOf(hooks[i]) === -1) {
      res.push(hooks[i])
    }
  }
  return res
}

//钩子的合并策略  被合并的钩子最后执行 mixin中的钩子按照mixin中数组的顺序调用
LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = mergeHook
})

function mergeAssets(
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): Object {
  const res = Object.create(parentVal || null)
  if (childVal) {
    process.env.NODE_ENV !== 'production' && assertObjectType(key, childVal, vm)
    return extend(res, childVal)
  } else {
    return res
  }
}

//合并指令 组件 过滤器的策略 就是一直以合并
ASSET_TYPES.forEach(function (type) {
  strats[type + 's'] = mergeAssets
})

//watch的合并策略和钩子的类似
strats.watch = function (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {

  // work around Firefox's Object.prototype.watch...
  if (parentVal === nativeWatch) parentVal = undefined
  if (childVal === nativeWatch) childVal = undefined

  if (!childVal) return Object.create(parentVal || null)
  if (process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm)
  }
  if (!parentVal) return childVal

  const ret = {}

  extend(ret, parentVal)

  for (const key in childVal) {

    let parent = ret[key]

    const child = childVal[key]

    if (parent && !Array.isArray(parent)) {
      parent = [parent]
    }
    ret[key] = parent
      ? parent.concat(child)
      : Array.isArray(child) ? child : [child]
  }
  return ret
}

//其他的一些属性的合并策略时 如果父级存在就用父级的 mixins中的 后面的会覆盖前面的
strats.props =
  strats.methods =
  strats.inject =
  strats.computed = function (
    parentVal: ?Object,
    childVal: ?Object,
    vm?: Component,
    key: string
  ): ?Object {

    if (childVal && process.env.NODE_ENV !== 'production') {
      assertObjectType(key, childVal, vm)
    }
    
    if (!parentVal) return childVal

    const ret = Object.create(null)
    extend(ret, parentVal)
    if (childVal) extend(ret, childVal)
    return ret
  }
strats.provide = mergeDataOrFn

/**
 * 当用户没有进行自定义合并策略时 
 * 默认的选项合并策略  这个默认选项是用于用户自定新定义的options
 */
const defaultStrat = function (
  parentVal: any, //基本的配置options
  childVal: any //用户定义的options
): any {
  return childVal === undefined
    ? parentVal
    : childVal
}

/**
 * 检查使用的options的components值是否正确
 */
function checkComponents(options: Object) {
  for (const key in options.components) {
    validateComponentName(key)
  }
}

/**
 * @description: 检测组件名是否符合 html5 规范中的有效自定义元素名称
 * @param {*} name
 * @return {*}
 */
export function validateComponentName(name: string) {
  if (!new RegExp(`^[a-zA-Z][\\-\\.0-9_${unicodeLetters}]*$`).test(name)) {
    warn(
      'Invalid component name: "' + name + '". Component names ' +
      'should conform to valid custom element name in html5 specification.'
    )
  }
  if (isBuiltInTag(name) || config.isReservedTag(name)) {
    warn(
      'Do not use built-in or reserved HTML elements as component ' +
      'id: ' + name
    )
  }
}
//保证props转换成数组或者对象 且将-形式的props转成驼峰形式
function normalizeProps(options: Object, vm: ?Component) {

  const props = options.props
  if (!props) return

  const res = {}

  let i, val, name

  if (Array.isArray(props)) {
    i = props.length
    while (i--) {
      val = props[i]
      if (typeof val === 'string') {
        name = camelize(val)
        res[name] = { type: null }
      } else if (process.env.NODE_ENV !== 'production') {
        warn('props must be strings when using array syntax.')
      }
    }
  } else if (isPlainObject(props)) {
    for (const key in props) {
      val = props[key]
      name = camelize(key)
      res[name] = isPlainObject(val)
        ? val
        : { type: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "props": expected an Array or an Object, ` +
      `but got ${toRawType(props)}.`, //获取值的类型
      vm
    )
  }
  options.props = res
}

//规范化组件的inject的格式 添加上from
function normalizeInject(options: Object, vm: ?Component) {

  const inject = options.inject
  if (!inject) return 
  const normalized = options.inject = {}

  //将inject添加上from
  if (Array.isArray(inject)) {
    for (let i = 0; i < inject.length; i++) {
      normalized[inject[i]] = { from: inject[i] }
    }

  } else if (isPlainObject(inject)) {
    for (const key in inject) {
      const val = inject[key]
      normalized[key] = isPlainObject(val)
        ? extend({ from: key }, val)
        : { from: val }
    }

  } else if (process.env.NODE_ENV !== 'production') {
    //当传入不为数组或对象时报错提示
    warn(
      `Invalid value for option "inject": expected an Array or an Object, ` +
      `but got ${toRawType(inject)}.`,
      vm
    )
  }
}

// 将原始函数指令规范化为对象格式。
function normalizeDirectives(options: Object) {

  const dirs = options.directives

  if (dirs) {
    for (const key in dirs) {
      const def = dirs[key]
      if (typeof def === 'function') {
        dirs[key] = { bind: def, update: def }
      }
    }
  }

}

function assertObjectType(name: string, value: any, vm: ?Component) {
  if (!isPlainObject(value)) {
    warn(
      `Invalid value for option "${name}": expected an Object, ` +
      `but got ${toRawType(value)}.`,
      vm
    )
  }
}

//合并选项
export function mergeOptions(
  parent: Object, //父级选项
  child: Object,  //当前的选项
  vm?: Component //当前的vue实例
): Object {


  //如果是开发环境 检查当前用户自定义的组件名是否有错误
  if (process.env.NODE_ENV !== 'production') {
    checkComponents(child)
  }

  if (typeof child === 'function') {

    child = child.options

  }

  normalizeProps(child, vm) //保证props转换成数组或者对象 且将-形式的props转成驼峰形式

  normalizeInject(child, vm) //规范化组件的inject的格式 添加上from

  normalizeDirectives(child) // 将原始函数指令规范化为对象格式。


  //如果当前不是构造器
  if (!child._base) {
   
    if (child.extends) {
      //如果用户设置了extends
      parent = mergeOptions(parent, child.extends, vm)
    }

    if (child.mixins) {
      //如果用户设置了mixins
      for (let i = 0, l = child.mixins.length; i < l; i++) {
        //遍历子选择中的mixin
        parent = mergeOptions(parent, child.mixins[i], vm)
        //将mixin 的内容合并到父
      }
    }

  }

  const options = {} //要返回的 合并好的options

  let key

  for (key in parent) {

    //遍历父级的options 将父子的options根据策略进行合并操作
    mergeField(key)

  }

  for (key in child) {
    //遍历当前的options
    if (!hasOwn(parent, key)) {
      //如果当前options 有父级不存在的options 再次进行合并
      mergeField(key)
    }
  }
  /**
   * @description: 根据策略合并属性
   * @param {*} key 用户定义的那些键值
   * @return {*}
   */
  function mergeField(key) {

    //查看用户自定义策略中是否对某个选择的合并策略做出调整 否则使用 默认策略
    const strat = strats[key] || defaultStrat
    //调用响应的策略 去合并指定的option配置
    options[key] = strat(parent[key], child[key], vm, key)

  }
  return options
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 * 从上下文环境中 获取指定的组件
 * 这段逻辑很简单，先通过 const assets = options[type] 拿到 assets，
 * 然后再尝试拿 assets[id]，这里有个顺序，先直接使用 id 拿，
 * 如果不存在，则把 id 变成驼峰的形式再拿，如果仍然不存在则在驼峰的基础上把首字母再变成大写的形式再拿，
 * 如果仍然拿不到则报错。这样说明了我们在使用 Vue.component(id, definition) 全局注册组件的时候，
 * id 可以是连字符、驼峰或首字母大写的形式。
 * 
 */
export function resolveAsset(
  options: Object, //当前节点所在 组件的options
  type: string, //搜索的资产类型  components 指令等
  id: string, //所查找的key值
  warnMissing?: boolean
): any {

  if (typeof id !== 'string') { //当不是字符串时
    return
  }

  const assets = options[type] //找到当前实例的 相应资产 组件 指令等

  if (hasOwn(assets, id)) return assets[id] //检测当前options中是否存在指定的指令 或 组件等 找到就返回

  //如果没有找到对应的组件 骆驼化连字符分隔的字符串后继续寻找
  const camelizedId = camelize(id)
  if (hasOwn(assets, camelizedId)) return assets[camelizedId]

  //如果骆驼化连字符分隔的字符串后找不到 将字符串都大写之后再去寻找
  const PascalCaseId = capitalize(camelizedId)
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId]

  //当前面都找不到时 进行提示
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId]
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    )
  }
  return res
}
