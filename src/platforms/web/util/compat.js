







//一些兼容信息

import { 
  inBrowser //是否是在浏览器环境
 } from 'core/util/index'

//检查当前浏览器是否在属性值中编码了换行字符
let div

function getShouldDecode (href: boolean): boolean {
  div = div || document.createElement('div') //创建一个dic
  div.innerHTML = href ? `<a href="\n"/>` : `<div a="\n"/>`
  return div.innerHTML.indexOf('&#10;') > 0
}

// #3663: IE encodes newlines inside attribute values while other browsers don't
//IE 对属性值内的换行符进行编码，而其他浏览器则不会 
export const shouldDecodeNewlines = inBrowser ? getShouldDecode(false) : false 
// #6828: chrome encodes content in a[href]
//chrome 对 a[href] 中的内容进行编码
export const shouldDecodeNewlinesForHref = inBrowser ? getShouldDecode(true) : false
