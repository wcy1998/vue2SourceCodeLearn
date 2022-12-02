/* @flow */

import config from 'core/config'
import {
  addHandler,//添加相应事件 
  addProp,//添加prop
  getBindingAttr  //获取bind的属性
} from 'compiler/helpers'

import {
  genComponentModel,
  genAssignmentCode
} from 'compiler/directives/model'

let warn

// in some cases, the event used has to be determined at runtime
// so we used some reserved tokens during compile.
//在某些情况下，使用的事件必须在运行时确定
// 所以我们在编译期间使用了一些保留的标记。
export const RANGE_TOKEN = '__r'
export const CHECKBOX_RADIO_TOKEN = '__c'

//v-model
export default function model(
  el: ASTElement, //抽象节点
  dir: ASTDirective, //指令信息
  _warn: Function //告警函数
): ?boolean {


  warn = _warn //警告方法

  const value = dir.value //指令值

  const modifiers = dir.modifiers //指令修饰符

  const tag = el.tag //节点标签

  const type = el.attrsMap.type //节点的type值


  //v-model不使用在   file类型的input
  if (process.env.NODE_ENV !== 'production') {
    // inputs with type="file" are read only and setting the input's
    // value will throw an error.
    if (tag === 'input' && type === 'file') {
      warn(
        `<${el.tag} v-model="${value}" type="file">:\n` +
        `File inputs are read only. Use a v-on:change listener instead.`,
        el.rawAttrsMap['v-model']
      )
    }
  }

  //v-model 只能使用在 select input textarea  组件  和非保留的一些标签上
  if (el.component) {

    //如果是组件
    genComponentModel(el, value, modifiers) //生成组件的model
    // component v-model doesn't need extra runtime
    return false
  } else if (tag === 'select') {
    genSelect(el, value, modifiers) //生成select的model
  } else if (tag === 'input' && type === 'checkbox') {
    genCheckboxModel(el, value, modifiers) //生成checkbox的model
  } else if (tag === 'input' && type === 'radio') {
    genRadioModel(el, value, modifiers)  //生成radio的model
  } else if (tag === 'input' || tag === 'textarea') {
    genDefaultModel(el, value, modifiers) //生成textarea的model
  } else if (!config.isReservedTag(tag)) {
    genComponentModel(el, value, modifiers)
    // component v-model doesn't need extra runtime
    return false
  } else if (process.env.NODE_ENV !== 'production') {

    warn(
      `<${el.tag} v-model="${value}">: ` +
      `v-model is not supported on this element type. ` +
      'If you are working with contenteditable, it\'s recommended to ' +
      'wrap a library dedicated for that purpose inside a custom component.',
      el.rawAttrsMap['v-model']
    )

  }

  // ensure runtime directive metadata
  return true
  
}

function genCheckboxModel(
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
) {
  const number = modifiers && modifiers.number
  const valueBinding = getBindingAttr(el, 'value') || 'null'
  const trueValueBinding = getBindingAttr(el, 'true-value') || 'true'
  const falseValueBinding = getBindingAttr(el, 'false-value') || 'false'

  addProp(el, 'checked',
    `Array.isArray(${value})` +
    `?_i(${value},${valueBinding})>-1` + (
      trueValueBinding === 'true'
        ? `:(${value})`
        : `:_q(${value},${trueValueBinding})`
    )
  )

  addHandler(el, 'change',
    `var $$a=${value},` +
    '$$el=$event.target,' +
    `$$c=$$el.checked?(${trueValueBinding}):(${falseValueBinding});` +
    'if(Array.isArray($$a)){' +
    `var $$v=${number ? '_n(' + valueBinding + ')' : valueBinding},` +
    '$$i=_i($$a,$$v);' +
    `if($$el.checked){$$i<0&&(${genAssignmentCode(value, '$$a.concat([$$v])')})}` +
    `else{$$i>-1&&(${genAssignmentCode(value, '$$a.slice(0,$$i).concat($$a.slice($$i+1))')})}` +
    `}else{${genAssignmentCode(value, '$$c')}}`,

    null, true
  )
}

function genRadioModel(
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
) {

  const number = modifiers && modifiers.number

  let valueBinding = getBindingAttr(el, 'value') || 'null'

  valueBinding = number ? `_n(${valueBinding})` : valueBinding

  addProp(el, 'checked', `_q(${value},${valueBinding})`)

  addHandler(el, 'change', genAssignmentCode(value, valueBinding), null, true)

}

function genSelect(
  el: ASTElement,
  value: string,
  modifiers: ?ASTModifiers
) {

  const number = modifiers && modifiers.number

  const selectedVal = `Array.prototype.filter` +
    `.call($event.target.options,function(o){return o.selected})` +
    `.map(function(o){var val = "_value" in o ? o._value : o.value;` +
    `return ${number ? '_n(val)' : 'val'}})`

  const assignment = '$event.target.multiple ? $$selectedVal : $$selectedVal[0]'

  let code = `var $$selectedVal = ${selectedVal};`

  code = `${code} ${genAssignmentCode(value, assignment)}`

  addHandler(el, 'change', code, null, true)

}

//input的v-model生成
function genDefaultModel(
  el: ASTElement, //抽象元素
  value: string, //v-model表达式
  modifiers: ?ASTModifiers //v-model修饰符
): ?boolean {

  const type = el.attrsMap.type

  // warn if v-bind:value conflicts with v-model
  // except for inputs with v-bind:type
  if (process.env.NODE_ENV !== 'production') {
    const value = el.attrsMap['v-bind:value'] || el.attrsMap[':value']
    const typeBinding = el.attrsMap['v-bind:type'] || el.attrsMap[':type']
    if (value && !typeBinding) {
      const binding = el.attrsMap['v-bind:value'] ? 'v-bind:value' : ':value'
      warn(
        `${binding}="${value}" conflicts with v-model on the same element ` +
        'because the latter already expands to a value binding internally',
        el.rawAttrsMap[binding]
      )
    }
  }

  const {
    lazy, //惰性求职 lazy的话就是change的时候去同步  不是lazy就是input事件去同步 
    number,
    trim 
  } = modifiers || {}


  const needCompositionGuard = !lazy && type !== 'range'

  const event = lazy
    ? 'change'
    : type === 'range'
      ? RANGE_TOKEN
      : 'input'


  let valueExpression = '$event.target.value'

  if (trim) {

    valueExpression = `$event.target.value.trim()`

  }
  if (number) {

    valueExpression = `_n(${valueExpression})`

  }

  let code = genAssignmentCode(value, valueExpression)

  if (needCompositionGuard) {
    //是否需要 对于需要输入法编辑器的语言（中文、日文、韩文等），要注意的是，在 IME 字母组合窗口输入时 v-model 并不会更新
    code = `if($event.target.composing)return;${code}`

  }

  //给元素添加value属性
  addProp(el, 'value', `(${value})`)
 
    //给元素添加事件
  addHandler(el, event, code, null, true)

  if (trim || number) {
    
    addHandler(el, 'blur', '$forceUpdate()')

  }

}
