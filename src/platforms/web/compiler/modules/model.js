/* @flow */

/**
 * Expand input[v-model] with dyanmic type bindings into v-if-else chains
 * Turn this:
 *   <input v-model="data[type]" :type="type">
 * into this:
 *   <input v-if="type === 'checkbox'" type="checkbox" v-model="data[type]">
 *   <input v-else-if="type === 'radio'" type="radio" v-model="data[type]">
 *   <input v-else :type="type" v-model="data[type]">
 */

import {
  addRawAttr, //向当前抽象元素的attrmap 和attrlist 添加 属性
  getBindingAttr, //获取bind的属性
  getAndRemoveAttr //移除attrList中的置顶属性 并返回attrMap
} from 'compiler/helpers'

import {
  processFor, //解析抽象语法节点中的for信息
  processElement, //解析当前的抽象元素
  addIfCondition,
  createASTElement
} from 'compiler/parser/index'


//生成抽象节点树时 针对动态绑定的type进行处理特殊处理生成不同情况的type克隆节点表达式进行返回
function preTransformNode (
  el: ASTElement,  //抽象语法节点
  options: CompilerOptions //编译配置
  ) {

  //这里只针对input标签 中的v-model进行相关的处理 进行处理
  if (el.tag === 'input') {

    const map = el.attrsMap 
    if (!map['v-model']) {
      return
    }


    //获取动态绑定的type值
    let typeBinding

    //如果传递了：type属性 或者 v-bind：type 属性 
    if (map[':type'] || map['v-bind:type']) {
      typeBinding = getBindingAttr(el, 'type')
    }
     

     
    //获取{ id: someProp, 'other-attr': otherProp }这种形式下的动态type绑定
    if (!map.type && !typeBinding && map['v-bind']) {
      typeBinding = `(${map['v-bind']}).type`
    }
 
     //如果存在动态绑定的type值
    if (typeBinding) {

      //当前的节点的v-if值
      const ifCondition = getAndRemoveAttr(el, 'v-if', true)

       //在if条件前添加 $$
      const ifConditionExtra = ifCondition ? `&&(${ifCondition})` : ``
 
      //当前节点是否存在v-else
      const hasElse = getAndRemoveAttr(el, 'v-else', true) != null

      //当前节点是否存在v-else-if
      const elseIfCondition = getAndRemoveAttr(el, 'v-else-if', true)

      //先克隆当前的抽象语法节点，但此时的节点里已经不存在 type v-if v-else v-else-if 属性了
      const branch0 = cloneASTElement(el)

      //解析当前元素的 v-for信息并将相关信息添加到被克隆的抽象节点中
      processFor(branch0)

       //向克隆的抽象元素的attrmap 和attrlist 添加 type：checkbox 属性
      addRawAttr(branch0, 'type', 'checkbox')
      
      //处理当前节点的属性 转换成抽象节点对应的属性
      processElement(branch0, options)

      branch0.processed = true //标记当前节点已经被处理过了
       
      //将这个克隆节点的if表达式进行修改
      branch0.if = `(${typeBinding})==='checkbox'` + ifConditionExtra
      
      //给当前节点添加if条件
      addIfCondition(branch0, {
        exp: branch0.if,
        block: branch0
      })

      // 2.添加radio的分支
      const branch1 = cloneASTElement(el)
      getAndRemoveAttr(branch1, 'v-for', true)
      addRawAttr(branch1, 'type', 'radio')
      processElement(branch1, options)
      addIfCondition(branch0, {
        exp: `(${typeBinding})==='radio'` + ifConditionExtra,
        block: branch1
      })

      // 3添加其他的分支
      const branch2 = cloneASTElement(el)
      getAndRemoveAttr(branch2, 'v-for', true)
      addRawAttr(branch2, ':type', typeBinding)
      processElement(branch2, options)
      addIfCondition(branch0, {
        exp: ifCondition,
        block: branch2
      })

      if (hasElse) {
        branch0.else = true
      } else if (elseIfCondition) {
        branch0.elseif = elseIfCondition
      }

      return branch0
    }
  }
}

/**
 * @description: 复制一份当前的节点元素
 * @param {*} el
 * @return {*}
 */
function cloneASTElement (el) {
  return createASTElement(el.tag, el.attrsList.slice(), el.parent)
}

export default {
  preTransformNode
}
