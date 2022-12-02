/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-01-26 09:40:52
 * @LastEditors: your name
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: \vue\src\core\instance\render-helpers\index.js
 */
/* @flow */

import { toNumber, toString, looseEqual, looseIndexOf } from 'shared/util'
import { createTextVNode, createEmptyVNode } from 'core/vdom/vnode'
import { renderList } from './render-list'
import { renderSlot } from './render-slot'
import { resolveFilter } from './resolve-filter'
import { checkKeyCodes } from './check-keycodes'
import { bindObjectProps } from './bind-object-props'
import { renderStatic, markOnce } from './render-static'
import { bindObjectListeners } from './bind-object-listeners'
import { resolveScopedSlots } from './resolve-slots'
import { bindDynamicKeys, prependModifier } from './bind-dynamic-keys'

//这些方法都用于渲染函数中执行
export function installRenderHelpers (target: any) {
  target._o = markOnce //标记v-once节点 
  target._n = toNumber //将值转为number
  target._s = toString //将值转为string
  target._l = renderList //用于渲染v-for标记的节点 返回虚拟节点
  target._t = renderSlot //用来渲染slot节点
  target._q = looseEqual //检查两个值是否大致相等
  target._i = looseIndexOf //找到数组中第一个大致相等值的索引
  target._m = renderStatic //渲染静态标记的节点 返回虚拟节点
  target._f = resolveFilter //处理filter标记的值
  target._k = checkKeyCodes 
  target._b = bindObjectProps //将v-bind相关内容加入vnode的data中
  target._v = createTextVNode //创建文本虚拟节点
  target._e = createEmptyVNode //创建一个空节点
  target._u = resolveScopedSlots //插槽作用域相关
  target._g = bindObjectListeners //将v-on相关属性加入 vnode.data
  target._d = bindDynamicKeys //将动态绑定的先关属性加入vnode中
  target._p = prependModifier // 动态添加修饰符相关兼容处理
}
