/* @flow */

import { extend, warn, isObject } from 'core/util/index'


//生成slot节点的虚拟节点
export function renderSlot (
  name: string, //插槽名
  fallback: ?Array<VNode>, //插槽没传值时的默认显示
  props: ?Object,
  bindObject: ?Object
): ?Array<VNode> {

  //查找当前vue实例的插槽作用域中指定的插槽
  const scopedSlotFn = this.$scopedSlots[name] 


  let nodes
  if (scopedSlotFn) { 
    //如果响应的插槽使用了插槽作用域

    props = props || {}

    if (bindObject) {

      if (process.env.NODE_ENV !== 'production' && !isObject(bindObject)) {
        warn(
          'slot v-bind without argument expects an Object',
          this
        )
      }

      props = extend(extend({}, bindObject), props)

    }

    nodes = scopedSlotFn(props) || fallback

  } else {

    //如果存在对应的slot值就返回 否则返回默认的
    nodes = this.$slots[name] || fallback

  }

  const target = props && props.slot

  if (target) {

    return this.$createElement('template', { slot: target }, nodes)

  } else {

    return nodes
    
  }
}
