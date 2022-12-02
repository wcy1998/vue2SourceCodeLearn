/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-01-14 09:37:01
 * @LastEditors: your name
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: \vue\src\platforms\web\compiler\options.js
 */





//解析template生成渲染函数的一些基本配置

import {
  isPreTag, //判断一个字符串是不是 pre 的函数
  mustUseProp,//在某些元素标签的情况下 某个属性是否必须使用prop
  isReservedTag,//是否是当前环境下浏览器和vue保留标签
  getTagNamespace //获取标签的命名空间 一个函数
} from '../util/index'

import modules from './modules/index' // class v-model style 属性的解析相关过程方法

import directives from './directives/index' //指令相关的解析操作

import { genStaticKeys } from 'shared/util' //从编译器模块生成一个包含静态键的字符串。

import { isUnaryTag, canBeLeftOpenTag } from './util'

export const baseOptions: CompilerOptions = { //一些基础的options
  expectHTML: true, //期望html
  isPreTag,//判断一个字符串是不是 pre 的函数
  mustUseProp,//是否必须使用prop 一个函数
  isReservedTag, //是否是保留标签 一个函数
  getTagNamespace,// 获取标签的命名空间 一个函数
  isUnaryTag,// 判断一个标签是不是一元标签的函数 'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +'link,meta,param,source,track,wbr'
  canBeLeftOpenTag,//判断一个标签是不是可以左开的标签元素的函数   'colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source'

  modules, // class v-model style 属性的解析相关过程方法
  
  directives, //指令相关解析操作

  staticKeys: genStaticKeys(modules) //静态建的字符串

}
