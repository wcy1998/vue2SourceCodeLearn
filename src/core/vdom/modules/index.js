/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-10-13 11:24:19
 * @LastEditors: Please set LastEditors
 * @Description: vue的一些基础模块
 * @FilePath: \vue\src\core\vdom\modules\index.js
 */

import directives from './directives' //指令更新相关方法
import ref from './ref'//ref相关

export default [
  ref,
  directives
]
