/**
 * Virtual DOM patching algorithm based on Snabbdom by
 * Simon Friis Vindum (@paldepind)
 * Licensed under the MIT License
 * https://github.com/paldepind/snabbdom/blob/master/LICENSE
 *
 * modified by Evan You (@yyx990803)
 *
 * Not type-checking this because this file is perf-critical and the cost
 * of making flow understand it is not worth it.、
 * 不对此进行类型检查，因为此文件对性能至关重要且成本
  * 让flow明白这是不值得的。
  * 创建patch的
 */

import VNode, { cloneVNode } from './vnode'
import config from '../config'
import { SSR_ATTR } from 'shared/constants'
import { registerRef } from './modules/ref'
import { traverse } from '../observer/traverse'
import { activeInstance } from '../instance/lifecycle'
import { isTextInputType } from 'web/util/element'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  makeMap,
  isRegExp,
  isPrimitive
} from '../util/index'

export const emptyNode = new VNode('', {}, [])

const hooks = ['create', 'activate', 'update', 'remove', 'destroy'] //一些周期


//判断两个虚拟节点是不是同一个 
function sameVnode(a, b) {
  return (
    a.key === b.key && //首先key值要全等
    (
      (
        a.tag === b.tag && //tag一致
        a.isComment === b.isComment && //是否是注释一致
        isDef(a.data) === isDef(b.data) && //data都存在
        sameInputType(a, b) //当是input时 type是否一致
      )
      ||
      (
        isTrue(a.isAsyncPlaceholder) && //是不是isAsyncPlaceholder
        a.asyncFactory === b.asyncFactory && //异步工厂一直
        isUndef(b.asyncFactory.error) //不存在错误
      )
    )
  )
}


//当是input时 type是否一致
function sameInputType(a, b) {
  if (a.tag !== 'input') return true
  let i
  const typeA = isDef(i = a.data) && isDef(i = i.attrs) && i.type
  const typeB = isDef(i = b.data) && isDef(i = i.attrs) && i.type
  return typeA === typeB || isTextInputType(typeA) && isTextInputType(typeB)
}

function createKeyToOldIdx(children, beginIdx, endIdx) {
  let i, key
  const map = {}
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key
    if (isDef(key)) map[key] = i
  }
  return map
}


/**
 * @description: 创建patch
 * @param {*} backend 一些dom操作的方法和属性更新的钩子
 * @return {*}
 */
export function createPatchFunction(backend) {


  let i, j

  const cbs = {} //一个按照更新周期 调用相关钩子的map

  const {
    modules, //属性更新的钩子
    nodeOps //操作dom方法
  } = backend

  for (i = 0; i < hooks.length; ++i) {

    //循环遍历生命周期 'create', 'activate', 'update', 'remove', 'destroy'

    cbs[hooks[i]] = [] //初始化cbs对象

    for (j = 0; j < modules.length; ++j) {

      //遍历每一个更新的模块

      if (isDef(modules[j][hooks[i]])) {

        //顺序调用每个模块的相应生命周期方法按 'create', 'activate', 'update', 'remove', 'destroy'的顺序

        cbs[hooks[i]].push(modules[j][hooks[i]]) //往相应的cbs中推入 hook

      }

    }

  }




  //将真实dom转为虚拟的空节点
  function emptyNodeAt(elm) {
    return new VNode(nodeOps.tagName(elm).toLowerCase(), {}, [], undefined, elm)
  }

  /**
   * @description: 
   * @param {*} childElm
   * @param {*} listeners
   * @return {*}
   */
  function createRmCb(childElm, listeners) {
    function remove() {
      if (--remove.listeners === 0) {
        removeNode(childElm)
      }
    }
    remove.listeners = listeners
    return remove
  }

  //移除真实dom
  function removeNode(el) {
    const parent = nodeOps.parentNode(el)
    // element may have already been removed due to v-html / v-text
    if (isDef(parent)) {
      nodeOps.removeChild(parent, el)
    }
  }


  //是不是未知的元素
  function isUnknownElement(vnode, inVPre) {
    return (
      !inVPre &&
      !vnode.ns &&
      !(
        config.ignoredElements.length &&
        config.ignoredElements.some(ignore => {
          return isRegExp(ignore)
            ? ignore.test(vnode.tag)
            : ignore === vnode.tag
        })
      ) &&
      config.isUnknownElement(vnode.tag)
    )
  }

  let creatingElmInVPre = 0 //创建的v-pre的节点数


  //通过虚拟节点创建真实的 DOM 并插入到它的父节点中 children[i], insertedVnodeQueue, vnode.elm, null, true, children, i
  function createElm(
    vnode, //当前的虚拟节点
    insertedVnodeQueue,//插入的队列
    parentElm, //第一次渲染时 是当前容器dom父真实dom
    refElm, //第一次渲染时 是当前容器dom兄弟真实dom

    nested, //是否是子节点
    ownerArray,//所有的子节点
    index //当前节点在子节点数组中的位置
  ) {

    if (isDef(vnode.elm) && isDef(ownerArray)) {
      //如果当前节已经进行过渲染了 且存在ownerArray
      //向ownerArray指定位置克隆当前的虚拟节点信息
      vnode = ownerArray[index] = cloneVNode(vnode)
    }

    //当前虚拟节点是不是根插入的  用于transition的  enter check
    vnode.isRootInsert = !nested

    //如果是组件节点 如果不是组件节点
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      return
    }


    //不是组件的话走这段逻辑

    const data = vnode.data //获取当前vnode的数据

    const children = vnode.children //获取当前虚拟节点的子节虚拟点

    const tag = vnode.tag //获取当前虚拟节点的标签

    if (isDef(tag)) {


      if (process.env.NODE_ENV !== 'production') {
        if (data && data.pre) {
          creatingElmInVPre++ //存在tag就进行占位
        }
        if (isUnknownElement(vnode, creatingElmInVPre)) {
          warn(
            'Unknown custom element: <' + tag + '> - did you ' +
            'register the component correctly? For recursive components, ' +
            'make sure to provide the "name" option.',
            vnode.context
          )
        }
      }

      //创建一个真实dom赋值给vnode.elm
      vnode.elm = vnode.ns
        ? nodeOps.createElementNS(vnode.ns, tag) //存在命名空间
        : nodeOps.createElement(tag, vnode) //不存在命名空间

      //设置css作用域id 用来保证节点的样式隔离
      setScope(vnode)

      /* istanbul ignore if */
      if (__WEEX__) {
        // in Weex, the default insertion order is parent-first.
        // List items can be optimized to use children-first insertion
        // with append="tree".
        const appendAsTree = isDef(data) && isTrue(data.appendAsTree)
        if (!appendAsTree) {
          if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue)
          }
          insert(parentElm, vnode.elm, refElm)
        }
        createChildren(vnode, children, insertedVnodeQueue)
        if (appendAsTree) {
          if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue)
          }
          insert(parentElm, vnode.elm, refElm)
        }
      } else {

        //web环境下 创建子节点
        createChildren(vnode, children, insertedVnodeQueue)

        if (isDef(data)) {
          //这里是从最深层的子节点开始的
          invokeCreateHooks(vnode, insertedVnodeQueue)
        }
        //最后调用 insert 方法把 DOM 插入到父节点中，因为是递归调用，子元素会优先调用 insert，
        //所以整个 vnode 树节点的插入顺序是先子后父。来看一下 insert 方法，它的定义在 src/core/vdom/patch.js 上。
        insert(parentElm, vnode.elm, refElm)
      }

      if (process.env.NODE_ENV !== 'production' && data && data.pre) {
        creatingElmInVPre--
      }
    } else if (isTrue(vnode.isComment)) {
      vnode.elm = nodeOps.createComment(vnode.text)
      insert(parentElm, vnode.elm, refElm)
    } else {
      vnode.elm = nodeOps.createTextNode(vnode.text)
      insert(parentElm, vnode.elm, refElm)
    }
  }


  //在创建真实dom时遇到组件情况时
  function createComponent(
    vnode,
    insertedVnodeQueue,
    parentElm,
    refElm
  ) {

    //获取当前虚拟节点的所有信息 
    let i = vnode.data

    if (isDef(i)) {

      //当前节点 已经创建组件实例 且是 keepalive 的组件
      const isReactivated = isDef(vnode.componentInstance) && i.keepAlive


      if (isDef(i = i.hook) && isDef(i = i.init)) {
        //如果是一个组件vnode 就调用该组件的init hook 去实例化当前组件 并进行挂载
        i(vnode, false /* hydrating */) //执行组件的init 钩子函数
      }

      //在调用 init 钩子之后，如果 vnode 是一个子组件，它应该创建一个子实例并挂载它。 
      //子组件还设置了占位符 vnode 的 elm。 在这种情况下，我们可以只返回元素并完成。
      if (isDef(vnode.componentInstance)) {

        //此时子组件实例已生成

        //初始化组件
        initComponent(vnode, insertedVnodeQueue)

        //将组件插入dom
        insert(parentElm, vnode.elm, refElm) //插入dom

        //如果是keep-alive的的组件
        if (isTrue(isReactivated)) {

          //唤醒当前组件
          reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm)

        }

        return true
      }
    }
  }

  /**
   * @description: 初始化组件
   * @param {*} vnode  当前虚拟节点
   * @param {*} insertedVnodeQueue 
   * @return {*}
   */
  function initComponent(vnode, insertedVnodeQueue) {

    if (isDef(vnode.data.pendingInsert)) {
      //如果是异步插入  

      //向插入队列中推入
      insertedVnodeQueue.push.apply(insertedVnodeQueue, vnode.data.pendingInsert)

      //取消组件的异步插入
      vnode.data.pendingInsert = null

    }

    //如果已经存在组件实例了当前组件的真实dom
    vnode.elm = vnode.componentInstance.$el

    if (isPatchable(vnode)) {
      //一直找到没有渲染过的组件

      invokeCreateHooks(vnode, insertedVnodeQueue)

      setScope(vnode)

    } else {
      //是一个空的根组件
      //跳过所有与元素相关的模块，除了 ref
      // empty component root.

      registerRef(vnode)

      //确保调用插入钩子
      insertedVnodeQueue.push(vnode)

    }
  }


  /**
   * @description: 
   * @param {*} vnode 当前节点
   * @param {*} insertedVnodeQueue 插入队列
   * @param {*} parentElm 父节点
   * @param {*} refElm ref节点
   * @return {*}
   */

  function reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm) {

    let i

    // hack for #4339: a reactivated component with inner transition
    // does not trigger because the inner node's created hooks are not called
    // again. It's not ideal to involve module-specific logic in here but
    // there doesn't seem to be a better way to do it.

    let innerNode = vnode

    while (innerNode.componentInstance) {

      innerNode = innerNode.componentInstance._vnode

      if (isDef(i = innerNode.data) && isDef(i = i.transition)) {
        for (i = 0; i < cbs.activate.length; ++i) {
          cbs.activate[i](emptyNode, innerNode)
        }
        insertedVnodeQueue.push(innerNode)
        break
      }

    }
    // unlike a newly created component,
    // a reactivated keep-alive component doesn't insert itself
    insert(parentElm, vnode.elm, refElm)

  }


  //插入真实dom
  function insert(
    parent, //父dom
    elm, //当前dom
    ref //ref 插入的参考dom
  ) {

    if (isDef(parent)) {
      //如果存在父组件
      if (isDef(ref)) {

        if (nodeOps.parentNode(ref) === parent) {

          nodeOps.insertBefore(parent, elm, ref)

        }

      } else {

        nodeOps.appendChild(parent, elm)

      }
    }

  }


  // 创建子节点 createChildren 的逻辑很简单，实际上是遍历子虚拟节点，递归调用 createElm
  //这里要注意的一点是在遍历过程中会把 vnode.elm 作为父容器的 DOM 节点占位符传入。
  // 接着再调用 invokeCreateHooks 方法执行所有的 create 的钩子并把 vnode push 到 insertedVnodeQueue 中
  function createChildren(vnode, children, insertedVnodeQueue) {

    if (Array.isArray(children)) {
      //当子节点为数组时
      if (process.env.NODE_ENV !== 'production') {
        //检查是否存在重复的key
        checkDuplicateKeys(children)
      }

      for (let i = 0; i < children.length; ++i) {
        //遍历子节点进行节点创建
        createElm(children[i], insertedVnodeQueue, vnode.elm, null, true, children, i)
      }

    } else if (isPrimitive(vnode.text)) {

      //如果只是单个文本节点直接插入
      nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(String(vnode.text)))

    }
  }


  function isPatchable(vnode) {

    //获取当前组件实例内部dom的虚拟节点树
    while (vnode.componentInstance) {
      //不断的嵌套
      vnode = vnode.componentInstance._vnode

    }

    return isDef(vnode.tag)
  }

  /**
   * @description: 执行组件的create钩子函数
   * @param {*} vnode 
   * @param {*} insertedVnodeQueue 
   * @return {*}
   */
  function invokeCreateHooks(
    vnode, //当前虚拟节点
    insertedVnodeQueue //插入队列
  ) {

    //调用所有属性的create钩子
    for (let i = 0; i < cbs.create.length; ++i) {

      //向vnode的 elm属性中去 加入这些属性
      cbs.create[i](emptyNode, vnode)

    }

    //如果存在钩子就继续调用钩子  应该是组件才有hook
    i = vnode.data.hook // Reuse variable

    if (isDef(i)) {

      if (isDef(i.create)) i.create(emptyNode, vnode)

      //向插入虚拟dom的队列里加入当前的虚拟dom
      if (isDef(i.insert)) insertedVnodeQueue.push(vnode)

    }
  }


  //为作用域 CSS 设置作用域 id 属性。
  //这个应该是给vue-loader使用的特性
  function setScope(vnode) {

    let i

    if (isDef(i = vnode.fnScopeId)) {
      //如果当前vnode存在fnScopeId

      nodeOps.setStyleScope(vnode.elm, i)

    } else {

      //如果当前vnode不存在
      let ancestor = vnode

      while (ancestor) {
        //获取上下文中的_scopeId 进行设置

        if (isDef(i = ancestor.context) && isDef(i = i.$options._scopeId)) {
          nodeOps.setStyleScope(vnode.elm, i)
        }

        ancestor = ancestor.parent

      }
    }

    //slot的元素也要有scoped id
    // for slot content they should also get the scopeId from the host instance.
    if (isDef(i = activeInstance) &&
      i !== vnode.context &&
      i !== vnode.fnContext &&
      isDef(i = i.$options._scopeId)
    ) {
      nodeOps.setStyleScope(vnode.elm, i)
    }
  }

  function addVnodes(parentElm, refElm, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      createElm(vnodes[startIdx], insertedVnodeQueue, parentElm, refElm, false, vnodes, startIdx)
    }
  }

  /**
   * @description: 执行destroy钩子
   * @param {*} vnode 当前组件的旧vnode
   * @return {*}
   */
  function invokeDestroyHook(vnode) {

    let i, j

    //获取旧组件的Vnode data
    const data = vnode.data

    if (isDef(data)) {
      //当组件的data存在数据时

      //先去调用当前用户自定义的周期方法
      if (isDef(i = data.hook) && isDef(i = i.destroy)) i(vnode)

      //再去调用每个模块的destroy方法 
      for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode)

    }

    if (isDef(i = vnode.children)) {

      //当前虚拟节点存在子节点时
      for (j = 0; j < vnode.children.length; ++j) {

        //循环遍历vnode的子节点 并相应执行子节点的destroy方法
        invokeDestroyHook(vnode.children[j])

      }
    }

  }

  function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx]
      if (isDef(ch)) {
        if (isDef(ch.tag)) {
          removeAndInvokeRemoveHook(ch)
          invokeDestroyHook(ch)
        } else { // Text node
          removeNode(ch.elm)
        }
      }
    }
  }

  function removeAndInvokeRemoveHook(vnode, rm) {
    if (isDef(rm) || isDef(vnode.data)) {
      let i
      const listeners = cbs.remove.length + 1
      if (isDef(rm)) {
        // we have a recursively passed down rm callback
        // increase the listeners count
        rm.listeners += listeners
      } else {
        // directly removing
        rm = createRmCb(vnode.elm, listeners)
      }
      // recursively invoke hooks on child component root node
      if (isDef(i = vnode.componentInstance) && isDef(i = i._vnode) && isDef(i.data)) {
        removeAndInvokeRemoveHook(i, rm)
      }
      for (i = 0; i < cbs.remove.length; ++i) {
        cbs.remove[i](vnode, rm)
      }
      if (isDef(i = vnode.data.hook) && isDef(i = i.remove)) {
        i(vnode, rm)
      } else {
        rm()
      }
    } else {
      removeNode(vnode.elm)
    }
  }

  //相同key节点 更新子节点
  function updateChildren(
    parentElm, //dom容器
    oldCh,//旧的子节点
    newCh,//新的子节点
    insertedVnodeQueue,
    removeOnly
  ) {

    let oldStartIdx = 0
    let newStartIdx = 0

    let oldEndIdx = oldCh.length - 1 //旧节点的尾索引
    let oldStartVnode = oldCh[0] //旧节点的开始节点
    let oldEndVnode = oldCh[oldEndIdx] //旧节点的尾部节点

    let newEndIdx = newCh.length - 1//新节点的尾索引
    let newStartVnode = newCh[0]//新节点的尾索引
    let newEndVnode = newCh[newEndIdx]//新节点的尾索引

    let oldKeyToIdx, idxInOld, vnodeToMove, refElm

    // removeOnly is a special flag used only by <transition-group>
    // to ensure removed elements stay in correct relative positions
    // during leaving transitions
    const canMove = !removeOnly

    if (process.env.NODE_ENV !== 'production') {
      //检查是否存在重复key
      checkDuplicateKeys(newCh)
    }
   
    //当旧节点的开始索引不超过旧节点的结束索引 并且 当新节点的开始索引不超过新节点的结束索引
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {

      if (isUndef(oldStartVnode)) {
        //如果旧开始节点不存在 就向右移开始索引
        oldStartVnode = oldCh[++oldStartIdx] // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {
        //如果旧结束节点不存在 就向左移结束索引
        oldEndVnode = oldCh[--oldEndIdx]
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
         //如果新和旧开始节点的是相同key的节点 就 对比这两个节点
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
        
        //此时同时右移两个开始索引
        oldStartVnode = oldCh[++oldStartIdx]
        newStartVnode = newCh[++newStartIdx]

      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        //如果新和旧结束节点的是相同key的节点 就 对比这两个节点
 
        //此时同时左移两个结束索引
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
        oldEndVnode = oldCh[--oldEndIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        //如果 头头 尾尾匹配失败 就让旧的头 匹配 新的尾
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
        canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
        oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
         //如果 头头 尾尾匹配失败 就让旧的头 匹配 新的尾
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
        canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
        oldEndVnode = oldCh[--oldEndIdx]
        newStartVnode = newCh[++newStartIdx]
      } else {

        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
        idxInOld = isDef(newStartVnode.key)
          ? oldKeyToIdx[newStartVnode.key]
          : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx)
        if (isUndef(idxInOld)) { // New element
          createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
        } else {
          vnodeToMove = oldCh[idxInOld]
          if (sameVnode(vnodeToMove, newStartVnode)) {
            patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
            oldCh[idxInOld] = undefined
            canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm)
          } else {
            // same key but different element. treat as new element
            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
          }
        }
        newStartVnode = newCh[++newStartIdx]
      }
    }
    if (oldStartIdx > oldEndIdx) {
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
      addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
    }
  }

  //检测同一层级的子节点是否存在相同key值
  function checkDuplicateKeys(children) {

    const seenKeys = {}

    for (let i = 0; i < children.length; i++) {
      const vnode = children[i]
      const key = vnode.key
      if (isDef(key)) {
        if (seenKeys[key]) {
          warn(
            `Duplicate keys detected: '${key}'. This may cause an update error.`,
            vnode.context
          )
        } else {
          seenKeys[key] = true
        }
      }
    }
  }

  function findIdxInOld(node, oldCh, start, end) {
    for (let i = start; i < end; i++) {
      const c = oldCh[i]
      if (isDef(c) && sameVnode(node, c)) return i
    }
  }


  //当前新旧节点是相同的 insertedVnodeQueue, null, null, removeOnly
  function patchVnode(
    oldVnode,
    vnode,
    insertedVnodeQueue, //插入队列
    ownerArray,
    index,
    removeOnly
  ) {

    if (oldVnode === vnode) {
      //如果新旧节点完全一致就不进行更新了
      return
    }

    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // clone reused vnode
      vnode = ownerArray[index] = cloneVNode(vnode)
    }

    //复用dom
    const elm = vnode.elm = oldVnode.elm

    if (isTrue(oldVnode.isAsyncPlaceholder)) {
      //如果旧节点是一个异步组件的占位
      if (isDef(vnode.asyncFactory.resolved)) {
        hydrate(oldVnode.elm, vnode, insertedVnodeQueue)
      } else {
        vnode.isAsyncPlaceholder = true
      }
      return
    }

    // reuse element for static trees.
    // note we only do this if the vnode is cloned -
    // if the new node is not cloned it means the render functions have been
    // reset by the hot-reload-api and we need to do a proper re-render.
    if (isTrue(vnode.isStatic) &&
      isTrue(oldVnode.isStatic) &&
      vnode.key === oldVnode.key &&
      (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
    ) {
      vnode.componentInstance = oldVnode.componentInstance
      return
    }

    let i
    const data = vnode.data
    if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
      i(oldVnode, vnode)
    }

    const oldCh = oldVnode.children
    const ch = vnode.children
    if (isDef(data) && isPatchable(vnode)) {
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode)
      if (isDef(i = data.hook) && isDef(i = i.update)) i(oldVnode, vnode)
    }
    if (isUndef(vnode.text)) {
      if (isDef(oldCh) && isDef(ch)) {
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)
      } else if (isDef(ch)) {
        if (process.env.NODE_ENV !== 'production') {
          checkDuplicateKeys(ch)
        }
        if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, '')
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
      } else if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)
      } else if (isDef(oldVnode.text)) {
        nodeOps.setTextContent(elm, '')
      }
    } else if (oldVnode.text !== vnode.text) {
      nodeOps.setTextContent(elm, vnode.text)
    }
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.postpatch)) i(oldVnode, vnode)
    }
  }

  function invokeInsertHook(vnode, queue, initial) {
    // delay insert hooks for component root nodes, invoke them after the
    // element is really inserted
    if (isTrue(initial) && isDef(vnode.parent)) {
      vnode.parent.data.pendingInsert = queue
    } else {
      for (let i = 0; i < queue.length; ++i) {
        queue[i].data.hook.insert(queue[i])
      }
    }
  }

  let hydrationBailed = false

  // list of modules that can skip create hook during hydration because they
  // are already rendered on the client or has no need for initialization
  // Note: style is excluded because it relies on initial clone for future
  // deep updates (#7063).
  const isRenderedModule = makeMap('attrs,class,staticClass,staticStyle,key')

  // Note: this is a browser-only function so we can assume elms are DOM nodes.
  function hydrate(elm, vnode, insertedVnodeQueue, inVPre) {
    let i
    const { tag, data, children } = vnode
    inVPre = inVPre || (data && data.pre)
    vnode.elm = elm

    if (isTrue(vnode.isComment) && isDef(vnode.asyncFactory)) {
      vnode.isAsyncPlaceholder = true
      return true
    }
    // assert node match
    if (process.env.NODE_ENV !== 'production') {
      if (!assertNodeMatch(elm, vnode, inVPre)) {
        return false
      }
    }
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.init)) i(vnode, true /* hydrating */)
      if (isDef(i = vnode.componentInstance)) {
        // child component. it should have hydrated its own tree.
        initComponent(vnode, insertedVnodeQueue)
        return true
      }
    }
    if (isDef(tag)) {
      if (isDef(children)) {
        // empty element, allow client to pick up and populate children
        if (!elm.hasChildNodes()) {
          createChildren(vnode, children, insertedVnodeQueue)
        } else {
          // v-html and domProps: innerHTML
          if (isDef(i = data) && isDef(i = i.domProps) && isDef(i = i.innerHTML)) {
            if (i !== elm.innerHTML) {
              /* istanbul ignore if */
              if (process.env.NODE_ENV !== 'production' &&
                typeof console !== 'undefined' &&
                !hydrationBailed
              ) {
                hydrationBailed = true
                console.warn('Parent: ', elm)
                console.warn('server innerHTML: ', i)
                console.warn('client innerHTML: ', elm.innerHTML)
              }
              return false
            }
          } else {
            // iterate and compare children lists
            let childrenMatch = true
            let childNode = elm.firstChild
            for (let i = 0; i < children.length; i++) {
              if (!childNode || !hydrate(childNode, children[i], insertedVnodeQueue, inVPre)) {
                childrenMatch = false
                break
              }
              childNode = childNode.nextSibling
            }
            // if childNode is not null, it means the actual childNodes list is
            // longer than the virtual children list.
            if (!childrenMatch || childNode) {
              /* istanbul ignore if */
              if (process.env.NODE_ENV !== 'production' &&
                typeof console !== 'undefined' &&
                !hydrationBailed
              ) {
                hydrationBailed = true
                console.warn('Parent: ', elm)
                console.warn('Mismatching childNodes vs. VNodes: ', elm.childNodes, children)
              }
              return false
            }
          }
        }
      }
      if (isDef(data)) {
        let fullInvoke = false
        for (const key in data) {
          if (!isRenderedModule(key)) {
            fullInvoke = true
            invokeCreateHooks(vnode, insertedVnodeQueue)
            break
          }
        }
        if (!fullInvoke && data['class']) {
          // ensure collecting deps for deep class bindings for future updates
          traverse(data['class'])
        }
      }
    } else if (elm.data !== vnode.text) {
      elm.data = vnode.text
    }
    return true
  }

  function assertNodeMatch(node, vnode, inVPre) {
    if (isDef(vnode.tag)) {
      return vnode.tag.indexOf('vue-component') === 0 || (
        !isUnknownElement(vnode, inVPre) &&
        vnode.tag.toLowerCase() === (node.tagName && node.tagName.toLowerCase())
      )
    } else {
      return node.nodeType === (vnode.isComment ? 8 : 3)
    }
  }

  /**
   * @description: 返回的patch方法
   * @param {*} oldVnode oldVnode 表示旧的 VNode 节点，它也可以不存在或者是一个 DOM 对象；第一次渲染时为null
   * @param {*} vnode vnode 表示执行 _render 后返回的 VNode 的节点；
   * @param {*} hydrating hydrating 表示是否是服务端渲染；
   * @param {*} removeOnly removeOnly 是给 transition-group 用的，之后会介绍。
   * @return {*}
   */

  return function patch(
    oldVnode, //旧的虚拟节点 可能是一个真实dom
    vnode, //新的虚拟节点
    hydrating, //服务端渲染相关
    removeOnly) { //返回一个patch方法

    //当新的vnode 不存在 说明组件已被销毁这时候调用 destroy hook 
    if (isUndef(vnode)) {
      if (isDef(oldVnode)) invokeDestroyHook(oldVnode)  //相对于组件来说
      //结束更新
      return
    }

    let isInitialPatch = false

    const insertedVnodeQueue = [] //出入队列

    if (isUndef(oldVnode)) {
      //如果不存在就节点说明是初次渲染
      isInitialPatch = true
      createElm(vnode, insertedVnodeQueue)
    } else {

      //旧节点是否是一个真实dom 根节点patch时会传入真实dom
      const isRealElement = isDef(oldVnode.nodeType)

      if (!isRealElement && sameVnode(oldVnode, vnode)) {
        //当旧节点不是真实节点时 新vnode和旧vnode 不相等时
        patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly)
      } else {
        //新旧节点不同


        if (isRealElement) {
          //如果旧节点是真实dom
          //服务端渲染相关
          if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
            //如果节点类型为1 且是ssr渲染时
            oldVnode.removeAttribute(SSR_ATTR)
            hydrating = true

          }

          if (isTrue(hydrating)) {
            //当时服务端渲染
            if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
              invokeInsertHook(vnode, insertedVnodeQueue, true)
              return oldVnode
            } else if (process.env.NODE_ENV !== 'production') {
              warn(
                'The client-side rendered virtual DOM tree is not matching ' +
                'server-rendered content. This is likely caused by incorrect ' +
                'HTML markup, for example nesting block-level elements inside ' +
                '<p>, or missing <tbody>. Bailing hydration and performing ' +
                'full client-side render.'
              )
            }
          }

          //要么不是服务器渲染，要么hydration失败。 创建一个空节点并替换它
          oldVnode = emptyNodeAt(oldVnode)
        }


        const oldElm = oldVnode.elm //旧节点的真实dom

        const parentElm = nodeOps.parentNode(oldElm)//旧节点dom的父dom

        // 创建一个新的节点并插入
        createElm(
          vnode,//当前虚拟节点
          insertedVnodeQueue, //插入队列
          // extremely rare edge case: do not insert if old element is in a
          // leaving transition. Only happens when combining transition +
          // keep-alive + HOCs. (#4590)
          //extremely rare edge case: do not insert if old element is in a leaving transition. Only happens when combining transition + keep-alive + HOCs. (#4590)
          oldElm._leaveCb ? null : parentElm,
          nodeOps.nextSibling(oldElm) //旧真实dom的下一个兄弟dom
        )

        // 更新父的占位符节点
        if (isDef(vnode.parent)) {

          //当前虚拟节点的父节点
          let ancestor = vnode.parent

          const patchable = isPatchable(vnode)

          while (ancestor) {

            for (let i = 0; i < cbs.destroy.length; ++i) {
              //父节点的相关属性进行销毁操作
              cbs.destroy[i](ancestor)
            }

            //将父节点的真实dom替换成当前的
            ancestor.elm = vnode.elm

            if (patchable) {
              for (let i = 0; i < cbs.create.length; ++i) {
                cbs.create[i](emptyNode, ancestor)
              }
              // #6513
              // invoke insert hooks that may have been merged by create hooks.
              // e.g. for directives that uses the "inserted" hook.
              const insert = ancestor.data.hook.insert
              if (insert.merged) {
                // start at index 1 to avoid re-invoking component mounted hook
                for (let i = 1; i < insert.fns.length; i++) {
                  insert.fns[i]()
                }
              }
            } else {

              registerRef(ancestor)

            }

            ancestor = ancestor.parent

          }

        }

        // destroy old node
        if (isDef(parentElm)) {
          //移除旧节点
          removeVnodes(parentElm, [oldVnode], 0, 0)
        } else if (isDef(oldVnode.tag)) {
          invokeDestroyHook(oldVnode)
        }
      }
    }

    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)

    return vnode.elm

  }
}
