/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-01-11 15:41:44
 * @LastEditors: Please set LastEditors
 * @Description: VUE 的相关配置文件
 * @FilePath: \vue\src\core\config.js
 */

import {
  no, //永远为false的函数
  noop,//不执行任何操作的 函数
  identity //浅拷贝函数
} from 'shared/util'

//所有的生命周期钩子
import { LIFECYCLE_HOOKS } from 'shared/constants'

export type Config = { 
  optionMergeStrategies: { [key: string]: Function };   //合并策略对象
  silent: boolean;//是否抑制警告
  productionTip: boolean;//在启动时显示生产模式提示消息
  performance: boolean;
  devtools: boolean; //是否启用开发工具
  errorHandler: ?(err: Error, vm: Component, info: string) => void; //错误处理函数
  warnHandler: ?(msg: string, vm: Component, trace: string) => void;//警告处理函数
  ignoredElements: Array<string | RegExp>; //忽略某些自定义元素
  keyCodes: { [key: string]: number | Array<number> };//一些关键词

  isReservedTag: (x?: string) => boolean;//是否保留标签
  isReservedAttr: (x?: string) => boolean;//是否保留属性
  parsePlatformTagName: (x: string) => string; //解析平台标签名称
  isUnknownElement: (x?: string) => boolean;//是不是未知的元素
  getTagNamespace: (x?: string) => string | void;//获取标签命名空间
  mustUseProp: (tag: string, type: ?string, name: string) => boolean;//是否必须使用props

  async: boolean; //是否异步

  _lifecycleHooks: Array<string>;//生命周期函数

};

//开发vue时的一些基础配置。这些配置是所有的平台中都存在的
//所以在此处进行统一配置 一些特定于平台的配置将在不同的平台中添加或覆盖当前的方法
export default ({ 

  //options 合并策略 默认是空的 采用默认的合并策略 可以进行改写
  optionMergeStrategies: Object.create(null),  

  /**
   * 开发时是否抑制 警告信息
   */
  silent: false,

  /**
   * 在项目启动时 提示生成模式信息
   */
  productionTip: process.env.NODE_ENV !== 'production',

  /**
   *  非生成模式下 开启 vue开发工具 但需要用户安装插件后才能使用
   */
  devtools: process.env.NODE_ENV !== 'production',

  /**
   * 是否开启 性能检测 用于检测每个组件的实例化 初始化的时间等 默认不开启
   */
  performance: false,  

  /**
   * 错误处理函数  默认不处理  //todo 可能是用户可以自定义 
   */
  errorHandler: null,

  /**
   * 警告处理函数  默认不处理 //todo 可能是用户可以自定义 
   */
  warnHandler: null,

  /**
   *  vue忽略某些自定义元素 默认空 //todo 可能是用户可以自定义
   */
  ignoredElements: [],

  /**
   *   //todo
   */
  keyCodes: Object.create(null),

  /**
   *   检查一个标签是否被保留以便它不能被注册为组件的函数。不同平台下该方法可能不同，可能会被覆盖。 默认所有tag都可以使用
   */
  isReservedTag: no, 

  /**
   *   检查一个属性是否被保留的函数，使其不能用作组件的prop。不同平台下该方法可能不同，可能会被覆盖。 默认所有属性都可以使用
   */
  isReservedAttr: no,

  /**
   *   检查标签是否是未知元素的函数。       默认所有元素都已知
   */
  isUnknownElement: no,

  /**
   *    获取元素的命名空间的函数     默认空执行
   */
  getTagNamespace: noop,

  /**
   *    解析某个平台中的真实标签名称。 默认返回浅拷贝数据
   */
  parsePlatformTagName: identity,

  /**
   *     检查一个元素是否必须使用prop的函数  默认不是必须的
   */
  mustUseProp: no,

  /**
   * 异步执行更新。 旨在供 Vue Test Utils 使用 如果设置为 false，这将显着降低性能，因为所有的更新都是同步执行完的。  默认异步更新
   */
  async: true,

  /**
   * 由于遗留原因而暴露 所有的生命周期钩子
   */
  _lifecycleHooks: LIFECYCLE_HOOKS
}: Config)
