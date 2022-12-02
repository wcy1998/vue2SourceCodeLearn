/* @flow */

 
//this._staticTrees  这里存储了所有静态结果调用结果

//生成静态节点的虚拟节点
export function renderStatic (
  index: number, //静态节点的位置
  isInFor: boolean
): VNode | Array<VNode> {


  const cached = this._staticTrees || (this._staticTrees = [])

  let tree = cached[index] 


  //如果已经渲染了静态树并且不在 v-for 中，
  //我们可以重用同一棵树
  if (tree && !isInFor) {
    return tree
  }

  //否则渲染一个新的树
  tree = cached[index] = this.$options.staticRenderFns[index].call(
    this._renderProxy,
    null,
    this // for render fns generated for functional component templates
  )
  
  //标记虚拟节点的静态节点
  markStatic(tree, `__static__${index}`, false)
  
  return tree
}

/**
 * Runtime helper for v-once.
 * Effectively it means marking the node as static with a unique key.
 */
export function markOnce (
  tree: VNode | Array<VNode>,
  index: number,
  key: string
) {
  markStatic(tree, `__once__${index}${key ? `_${key}` : ``}`, true)
  return tree
}

//标记静态节点
function markStatic (
  tree: VNode | Array<VNode>, //虚拟节点
  key: string, //key值
  isOnce: boolean //是不是一次渲染
) {
  if (Array.isArray(tree)) {
    for (let i = 0; i < tree.length; i++) {
      if (tree[i] && typeof tree[i] !== 'string') {
        markStaticNode(tree[i], `${key}_${i}`, isOnce)
      }
    }
  } else {
    markStaticNode(tree, key, isOnce)
  }
}

function markStaticNode (node, key, isOnce) {
  node.isStatic = true  //是一个静态节点
  node.key = key //设置节点的key值
  node.isOnce = isOnce //设置节点是否只渲染一次
}
