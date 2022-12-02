/* @flow */

import { 
  ASSET_TYPES  // 'component','directive', 'filter'
} from 'shared/constants'
import { 
  defineComputed,
   proxy //进行属性的访问代理 这样我们就可以通过属性 去访问 this.props.属性
   } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'

export function initExtend (Vue: GlobalAPI) {
  /**
   * 每个实例构造函数，包括 Vue，都有一个唯一的 cid。
   *  这使我们能够为原型继承创建包装的“子构造函数”并缓存它们。
   */
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   */
  /**
   * @description: Vue.extend 的作用就是构造一个 Vue 的子类，
   * 它使用一种非常经典的原型继承的方式把一个纯对象转换一个继承于 Vue 的构造器 Sub 并返回，
   * 然后对 Sub 这个对象本身扩展了一些属性，如扩展 options、添加全局 API 等；
   * 并且对配置中的 props 和 computed 做了初始化工作；最后对于这个 Sub 构造函数做了缓存
   * ，避免多次执行 Vue.extend 的时候对同一个子组件重复构造。
   * @param {*}
   * @return {*}
   */
  Vue.extend = function (
    extendOptions: Object //被基础构造函数继承的组件构造函数
    ): Function {

  
    extendOptions = extendOptions || {}  //组件的构造函数

    const Super = this //基础构造函数
 
    const SuperId = Super.cid //基础构造函数构造函数id

    //缓存一下所有组件的构造函数构造函数
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {}) 

    if (cachedCtors[SuperId]) { 
      //如果缓存的构造函数中 存在构造函数 直接复用该构造函数 构造函数做了缓存，避免多次执行 Vue.extend 的时候对同一个子组件重复构造
      return cachedCtors[SuperId]
    }

    //获取组件的name 如果组件不存在name 就使用父级构造的name
    const name = extendOptions.name || Super.options.name 
 
    //验证组件名
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name) 
    }

      //创建一个Sub函数 当做组件的构造函数
    const Sub = function VueComponent (options) {
      //复用基础构造函数的init
      this._init(options)  
    }

    //让当前sub的模板市场需求更改 bug修复继承原有父类中的prototype
    Sub.prototype = Object.create(Super.prototype) 

    Sub.prototype.constructor = Sub //将构造函数指回自己

    Sub.cid = cid++ //自增构造函数id

    //合并父类的options和用户自定义的options
    Sub.options = mergeOptions( 

      Super.options,

      extendOptions

    )

    Sub['super'] = Super  //在当前的构造函数中记录当前构造函数的父类构造函数

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    if (Sub.options.props) {
      //如果当前的构造函数中存在props代理下props
      initProps(Sub) 
    }
    if (Sub.options.computed) {
      //如果当前的构造函数中存在computed代理下computed
      initComputed(Sub) 
    }
 
    //保留当前构造函数的extend能力
    //保留当前构造函数的mixin能力
    //保留当前构造函数的use能力
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin 
    Sub.use = Super.use 


    //保留父构造函数的component  directive  filter
    ASSET_TYPES.forEach(function (type) { 
      Sub[type] = Super[type]
    })

    ////组件可以自己复用自己
    if (name) {
      Sub.options.components[name] = Sub //组件可以自己调用自己
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    Sub.superOptions = Super.options //记录当前组件构造函数的父类options
    Sub.extendOptions = extendOptions //记录当前组件构造函数的自定义options
    Sub.sealedOptions = extend({}, Sub.options) //记录复制一份当前的构造函数的options

    // cache constructor
    cachedCtors[SuperId] = Sub //缓存当前的构造函数

    return Sub //返回当前的构造函数
  }
}


function initProps (Comp) {
  const props = Comp.options.props//获取定义好的props
  for (const key in props) { 
    //将这些props定义到原型上
    proxy(Comp.prototype, `_props`, key)
  }
}

function initComputed (Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}
