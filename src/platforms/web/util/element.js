/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2022-01-11 17:11:01
 * @LastEditors: your name
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: \vue\src\platforms\web\util\element.js
 */
/* @flow */

import { inBrowser } from 'core/util/env'
import { makeMap } from 'shared/util'

export const namespaceMap = {
  svg: 'http://www.w3.org/2000/svg',
  math: 'http://www.w3.org/1998/Math/MathML'
}

export const isHTMLTag = makeMap(  //web环境中保留的标签名
  'html,body,base,head,link,meta,style,title,' +
  'address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,' +
  'div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,' +
  'a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,' +
  's,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,' +
  'embed,object,param,source,canvas,script,noscript,del,ins,' +
  'caption,col,colgroup,table,thead,tbody,td,th,tr,' +
  'button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,' +
  'output,progress,select,textarea,' +
  'details,dialog,menu,menuitem,summary,' +
  'content,element,shadow,template,blockquote,iframe,tfoot'
)

// this map is intentionally selective, only covering SVG elements that may
// contain child elements.
export const isSVG = makeMap( //web环境中保留的svg标签名
  'svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,' +
  'foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,' +
  'polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view',
  true
)

//是否是pre标签
export const isPreTag = (tag: ?string): boolean => tag === 'pre' 

/**
 * @description: 是否是web环境中保留的tag
 * @param {*}
 * @return {*}
 */
export const isReservedTag = (tag: string): ?boolean => {
  return isHTMLTag(tag) || isSVG(tag)
}

export function getTagNamespace (tag: string): ?string {
  if (isSVG(tag)) {
    return 'svg'
  }
  // basic support for MathML
  // note it doesn't support other MathML elements being component roots
  if (tag === 'math') {
    return 'math'
  }
}

const unknownElementCache = Object.create(null)

/**
 * @description: 判断一个函数是否是未知元素
 * @param {*} tag
 * @return {*}
 */
export function isUnknownElement (tag: string): boolean {
  if (!inBrowser) {
    //如果不在浏览器环境肯定是true
    return true
  }

  if (isReservedTag(tag)) {
    //如果是保留的不返回true
    return false
  }

  tag = tag.toLowerCase()

  if (unknownElementCache[tag] != null) {
    //当unknownElementCache 中存在 返回该tag
    return unknownElementCache[tag]
  }

  const el = document.createElement(tag) //创建一个该元素

  if (tag.indexOf('-') > -1) {
    //如果tag存在 - 
    // http://stackoverflow.com/a/28210364/1070244
    return (unknownElementCache[tag] = (
      el.constructor === window.HTMLUnknownElement ||
      el.constructor === window.HTMLElement
    ))
  } else {
    return (unknownElementCache[tag] = /HTMLUnknownElement/.test(el.toString()))
  }
}

export const isTextInputType = makeMap('text,number,password,search,email,tel,url')
