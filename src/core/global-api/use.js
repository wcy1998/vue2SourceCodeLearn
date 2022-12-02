/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-01-11 17:56:20
 * @LastEditors: Please set LastEditors
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: \vue\src\core\global-api\use.js
 */


import { 
  toArray //将类数组对象转换为真正的数组
 } from '../util/index'

export function initUse (Vue: GlobalAPI) {

  //调用Vue.use进行插件的安装
  /**
   * @description: 
   * @param {*} plugin 插件 是一个对象 或者方法
   * @return {*}
   */
  Vue.use = function (plugin: Function | Object) {
    //获取已经安装的插件，当已经存在相同插件时不再进行安装
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }
    const args = toArray(arguments, 1) 
    args.unshift(this) 
    if (typeof plugin.install === 'function') {
      //如果插件对象存在 install 方法进行调用
      plugin.install.apply(plugin, args)

    } else if (typeof plugin === 'function') {
      plugin.apply(null, args)
    }
    installedPlugins.push(plugin) 
    return this 
  }

}
