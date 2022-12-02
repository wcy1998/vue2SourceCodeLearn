/* @flow */

import { warn } from './debug'
import { observe, toggleObserving, shouldObserve } from '../observer/index'
import {
  hasOwn,//检查对象是否具有该属性。
  isObject,
  toRawType,
  hyphenate,
  capitalize,
  isPlainObject
} from 'shared/util'

type PropOptions = {
  type: Function | Array<Function> | null,
  default: any,
  required: ?boolean,
  validator: ?Function
};

/**
 * @description: 验证props的值
 * @param {*}
 * @return {*}
 */
export function validateProp (
  key: string, //prop的键值
  propOptions: Object,//当前vue实例用户配置的props
  propsData: Object,//组件上用户传入的props
  vm?: Component //当前vue实例
): any {
 
  //获取用户props的定义
  const prop = propOptions[key]

  //判断实际传入的值中是否有定义的key
  const absent = !hasOwn(propsData, key)

  //获取用户实际传入的props的值
  let value = propsData[key]


  //这一块是用来处理props 为Boolean时 实际传入的值的
  //prop中是否定义了Boolean 并且找到它的位置
  const booleanIndex = getTypeIndex(Boolean, prop.type)
  if (booleanIndex > -1) {
    //如果该prop定义中存在Boolean
    if (absent && !hasOwn(prop, 'default')) {
      //如果用户传入了该prop 且 当前prop 没有设置default
      //那么就将该值默认为false
      value = false
    } else if (value === '' || value === hyphenate(key)) {
      //如果用户传入的是空字符串 或者 用户传入的值 是该prop键值的 - - 形式
    
      //判断用户定义的prop type中是否存在String
      const stringIndex = getTypeIndex(String, prop.type)

      if (stringIndex < 0 || booleanIndex < stringIndex) {
        //如果不存在string 或者 布尔定义在前面 在后面
        value = true //就让布尔值为真
      }
    }
  }

  //如果用户传的是undefined
  if (value === undefined) {
    //如果用户没有传 该prop

    //就去获取默认值
    value = getPropDefaultValue(vm, prop, key)

    // 应为该值是一个拷贝所以需要进行 观察
    //对该值进行依赖收集
    const prevShouldObserve = shouldObserve
    toggleObserving(true)
    observe(value)
    toggleObserving(prevShouldObserve)
  }

  if (
    process.env.NODE_ENV !== 'production' &&
    // skip validation for weex recycle-list child component props
    !(__WEEX__ && isObject(value) && ('@binding' in value))
  ) {
    assertProp(prop, key, value, vm, absent)
  }

  return value

}

/**
 * Get the default value of a prop.
 */
function getPropDefaultValue (vm: ?Component, prop: PropOptions, key: string): any {
  // no default, return undefined
  if (!hasOwn(prop, 'default')) {
    return undefined
  }
  const def = prop.default
  // warn against non-factory defaults for Object & Array
  if (process.env.NODE_ENV !== 'production' && isObject(def)) {
    warn(
      'Invalid default value for prop "' + key + '": ' +
      'Props with type Object/Array must use a factory function ' +
      'to return the default value.',
      vm
    )
  }
  // the raw prop value was also undefined from previous render,
  // return previous default value to avoid unnecessary watcher trigger
  if (vm && vm.$options.propsData &&
    vm.$options.propsData[key] === undefined &&
    vm._props[key] !== undefined
  ) {
    return vm._props[key]
  }
  // call factory function for non-Function types
  // a value is Function if its prototype is function even across different execution context
  return typeof def === 'function' && getType(prop.type) !== 'Function'
    ? def.call(vm)
    : def
}

/**
 * Assert whether a prop is valid.
 */
function assertProp (
  prop: PropOptions,  //用户定义的props对象
  name: string, //prop的key
  value: any, //prop的value
  vm: ?Component, //当前vue实例
  absent: boolean //用户是否传了该prop
) {

  if (prop.required && absent) {
    //如果定义了required 且 用户没穿 进行提示 
    warn(
      'Missing required prop: "' + name + '"',
      vm
    )
    return
  }

  if (value == null && !prop.required) {
    //如果传入的值 是null 就返回
    return
  }

  //获取用户定义的类型
  let type = prop.type

  let valid = !type || type === true

  const expectedTypes = []

  if (type) {
    if (!Array.isArray(type)) {
      //如果定义的type不是一个数组
      type = [type]
    }
    for (let i = 0; i < type.length && !valid; i++) {
      //遍历当前
      const assertedType = assertType(value, type[i])
      expectedTypes.push(assertedType.expectedType || '')
      valid = assertedType.valid
    }
  }

  if (!valid) {
    //如果没有验证通过 进行提示
    warn(
      getInvalidTypeMessage(name, value, expectedTypes),
      vm
    )
    return
  }

  //获取用户定义的validator
  const validator = prop.validator

  if (validator) {
    //如果存在validator 就进行验证
    if (!validator(value)) {
      warn(
        'Invalid prop: custom validator check failed for prop "' + name + '".',
        vm
      )
    }
  }
}

const simpleCheckRE = /^(String|Number|Boolean|Function|Symbol)$/

function assertType (value: any, type: Function): {
  valid: boolean;
  expectedType: string;
} {
  let valid
  const expectedType = getType(type)
  if (simpleCheckRE.test(expectedType)) {
    const t = typeof value
    valid = t === expectedType.toLowerCase()
    // for primitive wrapper objects
    if (!valid && t === 'object') {
      valid = value instanceof type
    }
  } else if (expectedType === 'Object') {
    valid = isPlainObject(value)
  } else if (expectedType === 'Array') {
    valid = Array.isArray(value)
  } else {
    valid = value instanceof type
  }
  return {
    valid,
    expectedType
  }
}

/**
 * Use function string name to check built-in types,
 * because a simple equality check will fail when running
 * across different vms / iframes.
 */
function getType (fn) {
  const match = fn && fn.toString().match(/^\s*function (\w+)/)
  return match ? match[1] : ''
}

function isSameType (a, b) {
  return getType(a) === getType(b)
}


function getTypeIndex (
  type,  //所需要的类型值
  expectedTypes //当前prop 的 定义的type值可能是一个数组
  ): number {

  if (!Array.isArray(expectedTypes)) {
    return isSameType(expectedTypes, type) ? 0 : -1
  }

  for (let i = 0, len = expectedTypes.length; i < len; i++) {
    //如果是数组 判断是否存在改类型
    if (isSameType(expectedTypes[i], type)) {
      return i
    }
  }

  return -1

}

function getInvalidTypeMessage (name, value, expectedTypes) {
  let message = `Invalid prop: type check failed for prop "${name}".` +
    ` Expected ${expectedTypes.map(capitalize).join(', ')}`
  const expectedType = expectedTypes[0]
  const receivedType = toRawType(value)
  const expectedValue = styleValue(value, expectedType)
  const receivedValue = styleValue(value, receivedType)
  // check if we need to specify expected value
  if (expectedTypes.length === 1 &&
      isExplicable(expectedType) &&
      !isBoolean(expectedType, receivedType)) {
    message += ` with value ${expectedValue}`
  }
  message += `, got ${receivedType} `
  // check if we need to specify received value
  if (isExplicable(receivedType)) {
    message += `with value ${receivedValue}.`
  }
  return message
}

function styleValue (value, type) {
  if (type === 'String') {
    return `"${value}"`
  } else if (type === 'Number') {
    return `${Number(value)}`
  } else {
    return `${value}`
  }
}

function isExplicable (value) {
  const explicitTypes = ['string', 'number', 'boolean']
  return explicitTypes.some(elem => value.toLowerCase() === elem)
}

function isBoolean (...args) {
  return args.some(elem => elem.toLowerCase() === 'boolean')
}
