/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-12-01 10:53:31
 * @LastEditors: Please set LastEditors
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: \vue\src\core\instance\render-helpers\bind-dynamic-keys.js
 */
/* @flow */

// helper to process dynamic keys for dynamic arguments in v-bind and v-on.
// For example, the following template:
//
// <div id="foo" :[key]="value">
//
// compiles to the following:
//
// _c('div', { attrs: bindDynamicKeys({ "id": "app" }, [key, value]) })

import { warn } from 'core/util/debug'

export function bindDynamicKeys (baseObj: Object, values: Array<any>): Object {
  for (let i = 0; i < values.length; i += 2) {
    const key = values[i]
    if (typeof key === 'string' && key) {
      baseObj[values[i]] = values[i + 1]
    } else if (process.env.NODE_ENV !== 'production' && key !== '' && key !== null) {
      // null is a speical value for explicitly removing a binding
      warn(
        `Invalid value for dynamic directive argument (expected string or null): ${key}`,
        this
      )
    }
  }
  return baseObj
}

// helper to dynamically append modifier runtime markers to event names.
// ensure only append when value is already string, otherwise it will be cast
// to string and cause the type check to miss.
export function prependModifier (value: any, symbol: string): any {
  return typeof value === 'string' ? symbol + value : value
}
