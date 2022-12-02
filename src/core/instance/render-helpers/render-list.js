/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-12-01 10:38:54
 * @LastEditors: your name
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: \vue\src\core\instance\render-helpers\render-list.js
 */
/* @flow */

import { isObject, isDef, hasSymbol } from 'core/util/index'


//生成v-for节点的虚拟节点
export function renderList (
  val: any, //被迭代的值
  render: ( //迭代函数
    val: any, //迭代项
    keyOrIndex: string | number, 
    index?: number
  ) => VNode
): ?Array<VNode> {

  let ret: ?Array<VNode>,
      i,
      l,
      keys,
      key

  if (Array.isArray(val) || typeof val === 'string') {

    //如果被迭代的对象是数组或者字符串

    ret = new Array(val.length) //新建一个数组

    for (i = 0, l = val.length; i < l; i++) {

      ret[i] = render(val[i], i) //按render函数渲染 一组vnode

    }

  } else if (typeof val === 'number') {
    //如果val是数组
    ret = new Array(val)

    for (i = 0; i < val; i++) {
      ret[i] = render(i + 1, i)
    }

  } else if (isObject(val)) {
      //如果当前环境支持 symbol 数值是一个对象
    if (hasSymbol && val[Symbol.iterator]) {
      //调用当前对象的遍历器

      ret = []

      const iterator: Iterator<any> = val[Symbol.iterator]()

      let result = iterator.next()

      while (!result.done) {

        ret.push(render(result.value, ret.length))

        result = iterator.next()

      }

    } else {
      //没有遍历器时 
      keys = Object.keys(val)
      ret = new Array(keys.length)
      for (i = 0, l = keys.length; i < l; i++) {
        key = keys[i]
        ret[i] = render(val[key], key, i)
      }
    }

  }

  if (!isDef(ret)) {
    //如果不存在ret 返回空数组
    ret = []
  }
  (ret: any)._isVList = true
  return ret
}
