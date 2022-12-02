/* @flow */

import { makeMap, isBuiltInTag, cached, no } from 'shared/util'

let isStaticKey
let isPlatformReservedTag

const genStaticKeysCached = cached(genStaticKeys)

/**
 *优化器的目标：遍历生成的模板 AST 树
  并检测纯静态的子树，即
   永远不需要改变的 DOM。
  一旦我们检测到这些子树，我们就可以：
   1. 将它们提升为常量，这样我们就不再需要
    在每次重新渲染时为它们创建新节点；
   2.在补丁过程中完全跳过它们。
 */

export function optimize (root: ?ASTElement, options: CompilerOptions) {
  
  //如果不存在抽象语法树就返回
  if (!root) return

  //判断是不是静态key type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap,staticClass，staticStyle
  isStaticKey = genStaticKeysCached(options.staticKeys || '')
 
  //判断是不是保留标签的函数
  isPlatformReservedTag = options.isReservedTag || no

  //标记所有节点是不是静态节点
  markStatic(root) 

  //标记静态根节点
  markStaticRoots(root, false) 

}

/**
 * @description: 生成静态关键key
 * @param {*} keys 生成静态key
 * @return {*}
 */
function genStaticKeys (keys: string): Function {
  return makeMap(
    'type,tag,attrsList,attrsMap,plain,parent,children,attrs,start,end,rawAttrsMap' +
    (keys ? ',' + keys : '')
  )
}

/**
 * @description: 标记所有非静态节点
 * @param {*} node 抽象语法树
 * @return {*}
 */
function markStatic (node: ASTNode) {
   
  node.static = isStatic(node) //标记当前节点是否是静态的

  if (node.type === 1) {
     //组件的slot就不进行标记了 会导致后续无法渲染
    if (
      !isPlatformReservedTag(node.tag) && //不是平台保留的一些属性 是一些组件节点
      node.tag !== 'slot' &&
      node.attrsMap['inline-template'] == null
    ) {
      //如果不是保留的节点 不是slot节点 不是inline-template节点时就返回
      return
    }

    //除了slot 组件 inline-template的元素节点
    for (let i = 0, l = node.children.length; i < l; i++) {
      //遍历当前节点的子节点
      const child = node.children[i]
 
      //标记子节点的静态属性
      markStatic(child)

      if (!child.static) {
        //如果子节点不是静态的 当前节点就不是静态的了
        node.static = false
      }
    }

    if (node.ifConditions) {
      //如果当前节点存在if条件时
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        //遍历这些条件 如果条件的block不是静态的 当前节点也不是静态的
        const block = node.ifConditions[i].block
        markStatic(block)
        if (!block.static) {
          node.static = false
        }
      }
    }
  }
  
}


//标记所有的静态根节点
function markStaticRoots (
   node: ASTNode, //当前节点
   isInFor: boolean //是不是在for循环中
   ) {

  if (node.type === 1) {
    //如果是元素节点

    if (node.static || node.once) {
      //如果当前节点时静态的 或者 v-once的
      node.staticInFor = isInFor 
    }

    
    //对于一个有资格作为静态根的节点，它应该有子节点不仅仅是静态文本。 
    //否则吊出费用将超过好处，最好总是让它新鲜

    if (
      node.static //如果当前节点时静态的
       &&
        node.children.length  //当前节点存在子节点
        && !(
      node.children.length === 1 && //子节点不是只有一个文件节点时
      node.children[0].type === 3 //不是只有一个静态文本节点
    )) {

      node.staticRoot = true //标记为静态根节点
      return

    } else {

      node.staticRoot = false //否则不是静态根节点

    }

    if (node.children) {
      //如果节点存在子节点
      for (let i = 0, l = node.children.length; i < l; i++) {
        //遍历子节点进行标记
        markStaticRoots(node.children[i], isInFor || !!node.for)
      }
    }
    if (node.ifConditions) {
       //遍历if关联区域的这些节点
      for (let i = 1, l = node.ifConditions.length; i < l; i++) {
        markStaticRoots(node.ifConditions[i].block, isInFor)
      }
    }
  }
}


//判断一个节点是否是静态的
function isStatic (node: ASTNode): boolean {

  if (node.type === 2) { 
    //如果节点类型为2 说明是存在表达式的 不是静态的
    return false
  }

  if (node.type === 3) {
     //如果节点类型为3 普通文本是静态的
    return true
  }

  return !!(node.pre || ( //如果当前节点是v-pre的 就是静态的
    !node.hasBindings && // 如果当前节点没有绑定的属性 就是静态的
    !node.if && !node.for && //如果当前节点没有v-if v-for 修饰 就是静态的
    !isBuiltInTag(node.tag) && // 如果不是内置的组件 就是静态的
    isPlatformReservedTag(node.tag) && 
    !isDirectChildOfTemplateFor(node) && //如果不是一个v-for template标签的直接子节点
    Object.keys(node).every(isStaticKey) //如果该节点的所有属性都是静态属性时就是静态节点
  ))
  
}

function isDirectChildOfTemplateFor (node: ASTElement): boolean {
  while (node.parent) {
    node = node.parent
    if (node.tag !== 'template') {
      return false
    }
    if (node.for) {
      return true
    }
  }
  return false
}
