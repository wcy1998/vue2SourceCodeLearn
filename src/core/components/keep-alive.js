/* @flow */

//keep-alive组件

import { isRegExp, remove } from 'shared/util'

import { getFirstComponentChild } from 'core/vdom/helpers/index'

type VNodeCache = { [key: string]: ?VNode };

function getComponentName (opts: ?VNodeComponentOptions): ?string {
  return opts && (opts.Ctor.options.name || opts.tag)
}

function matches (pattern: string | RegExp | Array<string>, name: string): boolean {
  if (Array.isArray(pattern)) {
    return pattern.indexOf(name) > -1
  } else if (typeof pattern === 'string') {
    return pattern.split(',').indexOf(name) > -1
  } else if (isRegExp(pattern)) {
    return pattern.test(name)
  }
  /* istanbul ignore next */
  return false
}

function pruneCache (keepAliveInstance: any, filter: Function) {
  const { cache, keys, _vnode } = keepAliveInstance
  for (const key in cache) {
    const cachedNode: ?VNode = cache[key]
    if (cachedNode) {
      const name: ?string = getComponentName(cachedNode.componentOptions)
      if (name && !filter(name)) {
        pruneCacheEntry(cache, key, keys, _vnode)
      }
    }
  }
}

function pruneCacheEntry (
  cache: VNodeCache,
  key: string,
  keys: Array<string>,
  current?: VNode
) {
  const cached = cache[key]
  if (cached && (!current || cached.tag !== current.tag)) {
    cached.componentInstance.$destroy()
  }
  cache[key] = null
  remove(keys, key)
}

const patternTypes: Array<Function> = [String, RegExp, Array]


export default {
  name: 'keep-alive',
  abstract: true, //是一个抽象组件不存在父子关系

  props: {
    include: patternTypes, //匹配的组件才会缓存
    exclude: patternTypes, //匹配到的不缓存
    max: [String, Number] //缓存的大小 因为v node会持有真实的dom信息 所以需要考虑内存因素 最多缓存几个组件
  },

  created () {
    this.cache = Object.create(null) //缓存了具体的vnode
    this.keys = [] //缓存了哪些组件
  },

  destroyed () {
    for (const key in this.cache) {
      pruneCacheEntry(this.cache, key, this.keys)
    }
  },

  mounted () {
    this.$watch('include', val => {
      pruneCache(this, name => matches(val, name))
    })
    this.$watch('exclude', val => {
      pruneCache(this, name => !matches(val, name))
    })
  },

  render () {

    //获取keep-alive组件的第一个插槽
    const slot = this.$slots.default

    //<keep-alive> 只处理第一个子元素，所以一般和它搭配使用的有 component 动态组件或者是 router-view，这点要牢记
    const vnode: VNode = getFirstComponentChild(slot) 

    const componentOptions: ?VNodeComponentOptions = vnode && vnode.componentOptions
    
    if (componentOptions) {


      // 获取组件名 用于匹配规则
      const name: ?string = getComponentName(componentOptions)


      const { include, exclude } = this

      if (
        // not included
        (include && (!name || !matches(include, name))) ||
        // excluded
        (exclude && name && matches(exclude, name))
      ) {
        return vnode
      }


      const { 
        cache,
         keys
         } = this

      //当前组件的唯一标识
      const key: ?string = vnode.key == null
        
        //相同的构造函数可能被注册成不同的组件 所以知道构造函数是不能区分唯一性的
        // same constructor may get registered as different local components
        // so cid alone is not enough (#3269)
        ? componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '')
        : vnode.key


      //如果缓存中存在当前直接复用组件实例
      if (cache[key]) {
        vnode.componentInstance = cache[key].componentInstance

        // make current key freshest
        //并且重新调整了 key 的顺序放在了最后一个；否则把 vnode 设置进缓存，最后还有一个逻辑，如果配置了 max 并且缓存的长度超过了 this.max，还要从缓存中删除第一个
        remove(keys, key)

        keys.push(key)

      } else {
        //缓存vnode
        cache[key] = vnode

        keys.push(key)

        // prune oldest entry
        if (this.max && keys.length > parseInt(this.max)) {
          pruneCacheEntry(cache, keys[0], keys, this._vnode)
        }

      }

      vnode.data.keepAlive = true
    }
    return vnode || (slot && slot[0])
  }
}
