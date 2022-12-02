/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-10-13 13:38:37
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vue\src\platforms\web\runtime\modules\index.js
 */
import attrs from './attrs'
import klass from './class'
import events from './events'
import domProps from './dom-props'
import style from './style'
import transition from './transition'

export default [
  attrs, //属性更新相关操作
  klass, //class更新相关操作
  events, //事件更新相关操作
  domProps, //props更新操作
  style,//style更新操作
  transition //transition 更新操作
]
