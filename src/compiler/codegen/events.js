/* @flow */

const fnExpRE = /^([\w$_]+|\([^)]*?\))\s*=>|^function\s*\(/  //函数表达式 function 或者 箭头函数
const fnInvokeRE = /\([^)]*?\);*$/ //函数执行
const simplePathRE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/

// KeyboardEvent.keyCode aliases
const keyCodes: { [key: string]: number | Array<number> } = {
  esc: 27,
  tab: 9,
  enter: 13,
  space: 32,
  up: 38,
  left: 37,
  right: 39,
  down: 40,
  'delete': [8, 46]
}

// KeyboardEvent.key aliases
const keyNames: { [key: string]: string | Array<string> } = {
  // #7880: IE11 and Edge use `Esc` for Escape key name.
  esc: ['Esc', 'Escape'],
  tab: 'Tab',
  enter: 'Enter',
  // #9112: IE11 uses `Spacebar` for Space key name.
  space: [' ', 'Spacebar'],
  // #7806: IE11 uses key names without `Arrow` prefix for arrow keys.
  up: ['Up', 'ArrowUp'],
  left: ['Left', 'ArrowLeft'],
  right: ['Right', 'ArrowRight'],
  down: ['Down', 'ArrowDown'],
  // #9112: IE11 uses `Del` for Delete key name.
  'delete': ['Backspace', 'Delete', 'Del']
}

// #4868: modifiers that prevent the execution of the listener
// need to explicitly return null so that we can determine whether to remove
// the listener for .once
const genGuard = condition => `if(${condition})return null;`

const modifierCode: { [key: string]: string } = {
  stop: '$event.stopPropagation();',
  prevent: '$event.preventDefault();',
  self: genGuard(`$event.target !== $event.currentTarget`),
  ctrl: genGuard(`!$event.ctrlKey`),
  shift: genGuard(`!$event.shiftKey`),
  alt: genGuard(`!$event.altKey`),
  meta: genGuard(`!$event.metaKey`),
  left: genGuard(`'button' in $event && $event.button !== 0`),
  middle: genGuard(`'button' in $event && $event.button !== 1`),
  right: genGuard(`'button' in $event && $event.button !== 2`)
}

//处理抽象节点中的events 和 nativeEvents属性值
export function genHandlers (
  events: ASTElementHandlers, //事件信息
  isNative: boolean //是否是原生
): string {


  const prefix = isNative ? 'nativeOn:' : 'on:'

  let staticHandlers = ``

  let dynamicHandlers = ``

  for (const name in events) {
    //遍历事件名

    const handlerCode = genHandler(events[name])


    if (events[name] && events[name].dynamic) {
     
      //如果是动态方法名
      dynamicHandlers += `${name},${handlerCode},`

    } else {
      
      //如果是静态方法名
      staticHandlers += `"${name}":${handlerCode},`

    }

  }


  staticHandlers = `{${staticHandlers.slice(0, -1)}}`

  if (dynamicHandlers) {

    return prefix + `_d(${staticHandlers},[${dynamicHandlers.slice(0, -1)}])`

  } else {

    return prefix + staticHandlers

  }

}

// Generate handler code with binding params on Weex
/* istanbul ignore next */
function genWeexHandler (params: Array<any>, handlerCode: string) {
  let innerHandlerCode = handlerCode
  const exps = params.filter(exp => simplePathRE.test(exp) && exp !== '$event')
  const bindings = exps.map(exp => ({ '@binding': exp }))
  const args = exps.map((exp, i) => {
    const key = `$_${i + 1}`
    innerHandlerCode = innerHandlerCode.replace(exp, key)
    return key
  })
  args.push('$event')
  return '{\n' +
    `handler:function(${args.join(',')}){${innerHandlerCode}},\n` +
    `params:${JSON.stringify(bindings)}\n` +
    '}'
}

function genHandler (handler: ASTElementHandler | Array<ASTElementHandler>): string {

  //不存在返回一个空执行函数
  if (!handler) {
    return 'function(){}'
  }

  if (Array.isArray(handler)) {
    return `[${handler.map(handler => genHandler(handler)).join(',')}]`
  }


  const isMethodPath = simplePathRE.test(handler.value) //是不是函数名
 
  const isFunctionExpression = fnExpRE.test(handler.value) // 是不是函数表达式 function 或者 箭头函数

  const isFunctionInvocation = simplePathRE.test(handler.value.replace(fnInvokeRE, '')) //是不是函数执行

  
  //当事件不存在修饰符
  if (!handler.modifiers) {
     
    //如果是函数名 或者 是自定义函数 就直接返回
    if (isMethodPath || isFunctionExpression) {

      return handler.value

    }

    /* istanbul ignore if */
    if (__WEEX__ && handler.params) {
      return genWeexHandler(handler.params, handler.value)
    }
    //其他情况就进行包裹
    return `function($event){${
      isFunctionInvocation ? `return ${handler.value}` : handler.value
    }}` // inline statement

  } 
  //当事件存在修饰符
  else {

    let code = ''

    let genModifierCode = ''

    const keys = []

    for (const key in handler.modifiers) {

      if (modifierCode[key]) {

        genModifierCode += modifierCode[key]
        // left/right
        if (keyCodes[key]) {

          keys.push(key)

        }

      } else if (key === 'exact') {

        const modifiers: ASTModifiers = (handler.modifiers: any)
        
        genModifierCode += genGuard(
          ['ctrl', 'shift', 'alt', 'meta']
            .filter(keyModifier => !modifiers[keyModifier])
            .map(keyModifier => `$event.${keyModifier}Key`)
            .join('||')
        )

      } else {
        keys.push(key)
      }

    }

    if (keys.length) {
      code += genKeyFilter(keys)
    }
    // Make sure modifiers like prevent and stop get executed after key filtering
    if (genModifierCode) {
      code += genModifierCode
    }
    const handlerCode = isMethodPath
      ? `return ${handler.value}($event)`
      : isFunctionExpression
        ? `return (${handler.value})($event)`
        : isFunctionInvocation
          ? `return ${handler.value}`
          : handler.value
    /* istanbul ignore if */
    if (__WEEX__ && handler.params) {
      return genWeexHandler(handler.params, code + handlerCode)
    }
    return `function($event){${code}${handlerCode}}`
  }

}

function genKeyFilter (keys: Array<string>): string {
  return `if(('keyCode' in $event)&&${keys.map(genFilterCode).join('&&')})return null;`
}

function genFilterCode (key: string): string {
  const keyVal = parseInt(key, 10)
  if (keyVal) {
    return `$event.keyCode!==${keyVal}`
  }
  const keyCode = keyCodes[key]
  const keyName = keyNames[key]
  return (
    `_k($event.keyCode,` +
    `${JSON.stringify(key)},` +
    `${JSON.stringify(keyCode)},` +
    `$event.key,` +
    `${JSON.stringify(keyName)}` +
    `)`
  )
}
