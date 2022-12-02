/* @flow */



//通用的编译配置

import { emptyObject } from 'shared/util'//一个空的freeze的不可以更改的对象

import { parseFilters } from './parser/filter-parser'//解析 template中那些过滤器的

type Range = {
  start?: number,
  end?: number
};


/**
 * @description: 错误打印函数
 * @param {*} msg
 * @param {*} range
 * @return {*}
 */
export function baseWarn(msg: string, range?: Range) {
  console.error(`[Vue compiler]: ${msg}`)
}

/* eslint-enable no-unused-vars */

/**
 * @description: 返回模块配置中同名的那些函数
 * @param {*}
 * @return {*}
 */
export function pluckModuleFunction<F: Function>(
  modules: ?Array<Object>, //模块对象
  key: string //需要提取出的函数
): Array<F> {
  return modules
    ? modules.map(m => m[key]).filter(_ => _)
    : []
}

/**
 * @description: 添加prop
 * @param {*} el 抽象元素结构
 * @param {*} name 属性名称
 * @param {*} value 属性值
 * @param {*} range
 * @param {*} dynamic
 * @return {*}
 */
export function addProp(el: ASTElement, name: string, value: string, range?: Range, dynamic?: boolean) {
  //如果存在
  (el.props || (el.props = [])).push(rangeSetItem({ name, value, dynamic }, range))

  el.plain = false

}

/**
 * @description: 添加属性
 * @param {*} el
 * @param {*} name
 * @param {*} value
 * @param {*} range
 * @param {*} dynamic
 * @return {*}
 */
export function addAttr(el: ASTElement, name: string, value: any, range?: Range, dynamic?: boolean) {
  const attrs = dynamic
    ? (el.dynamicAttrs || (el.dynamicAttrs = []))
    : (el.attrs || (el.attrs = []))
  attrs.push(rangeSetItem({ name, value, dynamic }, range))
  el.plain = false
}

// add a raw attr (use this in preTransforms)
/**
 * @description: 添加raw属性
 * @param {*} el 当前的抽象元素
 * @param {*} name 属性名称
 * @param {*} value 属性值
 * @param {*} range 范围
 * @return {*}
 */
export function addRawAttr(el: ASTElement, name: string, value: any, range?: Range) {
  el.attrsMap[name] = value
  el.attrsList.push(rangeSetItem({ name, value }, range))
}

export function addDirective(
  el: ASTElement,
  name: string,
  rawName: string,
  value: string,
  arg: ?string,
  isDynamicArg: boolean,
  modifiers: ?ASTModifiers,
  range?: Range
) {
  (el.directives || (el.directives = [])).push(rangeSetItem({
    name,
    rawName,
    value,
    arg,
    isDynamicArg,
    modifiers
  }, range))
  el.plain = false
}

 
//标记 事件特征 ！ 捕获事件 ~ 单次执行事件  & passive事件
function prependModifierMarker(
  symbol: string, //标识
   name: string,  //事件名
   dynamic?: boolean //是否是动态属性名
   ): string {

  return dynamic
    ? `_p(${name},"${symbol}")` //返回一个_p
    : symbol + name // mark the event as captured

}

export function addHandler(

  el: ASTElement, // 当前抽象元素

  name: string,//当前事件的名称

  value: string,//当前事件属性名 后的 属性值

  modifiers: ?ASTModifiers,//当前事件的修饰符

  important?: boolean,//？ 处理v-on时是false

  warn?: ?Function,//警告函数

  range?: Range,//当前属性的原始信息

  dynamic?: boolean//是不是动态的属性名
) {
 
  //获取当前事件的修饰符
  modifiers = modifiers || emptyObject //修饰符

  if (
    process.env.NODE_ENV !== 'production' && warn &&
    modifiers.prevent && modifiers.passive
  ) {
    // prevent passive不能一起使用
    warn(
      'passive and prevent can\'t be used together. ' +
      'Passive handler can\'t prevent default event.',
      range
    )
  }

  // normalize click.right and click.middle since they don't actually fire
  // this is technically browser-specific, but at least for now browsers are
  // the only target envs that have right/middle clicks.
  //规范化 click.right 和 click.middle 因为它们实际上并没有触发
    //这在技术上是特定于浏览器的，但至少目前浏览器是
    //唯一具有右键/中键单击的目标环境。
  if (modifiers.right) {
    //如果当前事件存在 right修饰符

    if (dynamic) {
      //如果是动态的 如果事件名为click 就转换成contextmenu
      name = `(${name})==='click'?'contextmenu':(${name})`

    } else if (name === 'click') {
      name = 'contextmenu'
      delete modifiers.right
    }

  } else if (modifiers.middle) {
      //如果事件名为click 就转换成mouseup
    if (dynamic) {
      name = `(${name})==='click'?'mouseup':(${name})`
    } else if (name === 'click') {
      name = 'mouseup'
    }
  }


  //如果是捕获的事件
  if (modifiers.capture) {

    delete modifiers.capture

    name = prependModifierMarker('!', name, dynamic)

  }
 
    //如果是单次执行
  if (modifiers.once) {
    delete modifiers.once
    name = prependModifierMarker('~', name, dynamic)
  }

  /* istanbul ignore if */
  //如果是passive的事件
  if (modifiers.passive) {
    delete modifiers.passive
    name = prependModifierMarker('&', name, dynamic)
  }



  let events

  if (modifiers.native) {
    //如果是 native修饰的
    delete modifiers.native
    
    //初始化抽象元素的 nativeEvents 对象
    events = el.nativeEvents || (el.nativeEvents = {})

  } else {
      //初始化抽象元素的 events  对象
    events = el.events || (el.events = {})
  }

  const newHandler: any = rangeSetItem({ value: value.trim(), dynamic }, range)

  if (modifiers !== emptyObject) {
    newHandler.modifiers = modifiers
  }

  //向同一个事件名推入不同的处理
  const handlers = events[name]

  /* istanbul ignore if */
  if (Array.isArray(handlers)) {

    important ? handlers.unshift(newHandler) : handlers.push(newHandler)

  } else if (handlers) {

    events[name] = important ? [newHandler, handlers] : [handlers, newHandler]

  } else {
    events[name] = newHandler
  }

  el.plain = false
}

export function getRawBindingAttr(
  el: ASTElement,
  name: string
) {
  return el.rawAttrsMap[':' + name] ||
    el.rawAttrsMap['v-bind:' + name] ||
    el.rawAttrsMap[name]
}

/**
 * @description: 获取指定的动态的属性对应的内容
 * @param {*}
 * @return {*}
 */
export function getBindingAttr(
  el: ASTElement, //抽象元素
  name: string,//属性名称
  getStatic?: boolean
): ?string {

  //获取动态绑定的属性内容
  const dynamicValue =

    getAndRemoveAttr(el, ':' + name) ||

    getAndRemoveAttr(el, 'v-bind:' + name)

  if (dynamicValue != null) {
    //存在绑定的属性 解析过滤函数
    return parseFilters(dynamicValue)

  } else if (getStatic !== false) {
    //如果是获取getStatic
    const staticValue = getAndRemoveAttr(el, name)
    if (staticValue != null) {
      return JSON.stringify(staticValue)
    }
  }
}

//这只会从 Array (attrsList) 中删除 attr，以便它
//不会被 processAttrs 处理。 默认情况下，它不会将其从地图 (attrsMap) 中删除，因为在 codegen 期间需要地图
//该方法应该是在解析完文本后生成ast时进行调用的
export function getAndRemoveAttr(
  el: ASTElement, //抽象元素结构
  name: string,  //移除的属性名称
  removeFromMap?: boolean //是否从attrsMap中移除
): ?string {

  let val
  if ((val = el.attrsMap[name]) != null) {
    const list = el.attrsList
    for (let i = 0, l = list.length; i < l; i++) {
      if (list[i].name === name) {
        list.splice(i, 1)
        break
      }
    }
  }
  if (removeFromMap) {
    delete el.attrsMap[name]
  }
  return val
}

export function getAndRemoveAttrByRegex(
  el: ASTElement,
  name: RegExp
) {
  const list = el.attrsList
  for (let i = 0, l = list.length; i < l; i++) {
    const attr = list[i]
    if (name.test(attr.name)) {
      list.splice(i, 1)
      return attr
    }
  }
}

function rangeSetItem(
  item: any, //{ value: 表达式值, dynamic 是否是动态 }
  range?: { 
    start?: number,  //属性的开始
    end?: number //属性的结束位置
   }
) {

  if (range) {

    if (range.start != null) {

      item.start = range.start

    }

    if (range.end != null) {
      item.end = range.end
    }
  }
  return item
}
