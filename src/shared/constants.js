







export const SSR_ATTR = 'data-server-rendered' //服务端渲染的相关标记

export const ASSET_TYPES = [ //vue的一些基本概念component  directive  filter
  'component', 
  'directive',
  'fliter'
]

//所有的生命周期钩子
export const LIFECYCLE_HOOKS = [
  // beforeCreate 的钩子函数中就不能获取到 props、data 中定义的值，
  // 也不能调用 methods 中定义的函数，并没有渲染 DOM，所以我们也不能够访问 DOM
  'beforeCreate', 

   //并没有渲染 DOM，不能够访问 DOM,如果组件在加载的时候需要和后端有交互，
   //放在这俩个钩子函数执行都可以，如果是需要访问 props、data 等数据的话，就需要使用 created 钩子函数
   //vue-router 和 vuex 的时候会发现它们都混合了 beforeCreate 钩子函数。
  'created',  

  //beforeMount 钩子函数发生在 mount，也就是 DOM 挂载之前，它的调用时机是在 mountComponent 函数中，
  //在执行 vm._render() 函数渲染 VNode 之前，执行了 beforeMount 钩子函数
  'beforeMount',

  //在执行完 vm._update() 把 VNode patch 到真实 DOM 后，执行 mounted 钩子。注意，这里对 mounted 钩子函数执行有一个判断逻辑
  //vm.$vnode 如果为 null，则表明这不是一次组件的初始化过程,组件的 VNode patch 到 DOM 后，会执行 invokeInsertHook 函数,
  //把 insertedVnodeQueue 里保存的钩子函数依次执行一遍,我们可以看到，每个子组件都是在这个钩子函数中执行 mounted 钩子函数,
  //insertedVnodeQueue 的添加顺序是先子后父，所以对于同步渲染的子组件而言,mounted 钩子函数的执行顺序也是先子后父。
  'mounted', 


  //beforeUpdate 的执行时机是在渲染 Watcher 的 before 函数中,注意这里有个判断，也就是在组件已经 mounted 之后，
  //才会去调用这个钩子函数,beforeUpdate 和 updated 的钩子函数执行时机都应该是在数据更新的时候，
  'beforeUpdate',

  //update 的执行时机是在flushSchedulerQueue 函数调用的时候,updatedQueue 是更新了的 wathcer 数组，那么在 callUpdatedHooks 函数中
  //它对这些数组做遍历，只有满足当前 watcher 为 vm._watcher 以及组件已经 mounted 这两个条件，才会执行 updated 钩子函数,同时，
  //还把当前 wathcer 实例 push 到 vm._watchers 中,我们之前提过，在组件 mount 的过程中,会实例化一个渲染的 Watcher 
  // 去监听 vm 上的数据变化重新渲染，这段逻辑发生在 mountComponent 函数执行的时候,那么在实例化 Watcher 的过程中，在它的构造函数里会判断 isRenderWatcher
  //，接着把当前 watcher 的实例赋值给 vm._watcher,vm._watcher 是专门用来监听 vm 上数据变化然后重新渲染的，
  //所以它是一个渲染相关的 watcher，因此在 callUpdatedHooks 函数中，只有 vm._watcher 的回调执行完毕后，才会执行 updated 钩子函数。
  'updated',

   //beforeDestroy 钩子函数的执行时机是在 $destroy 函数执行最开始的地方，接着执行了一系列的销毁动作，包括从 parent 的 $children 中删掉自身，
  //删除 watcher，当前渲染的 VNode 执行销毁钩子函数等，执行完毕后再调用 destroy 钩子函数。
  'beforeDestroy',

  //在 $destroy 的执行过程中，它又会执行 vm.__patch__(vm._vnode, null) 触发它子组件的销毁钩子函数
  //这样一层层的递归调用，所以 destroy 钩子函数执行顺序是先子后父，和 mounted 过程一样。
  'destroyed',

  //activated 和 deactivated 钩子函数是专门为 keep-alive 组件定制的钩子
  'activated',
  'deactivated',

  'errorCaptured',
  'serverPrefetch'

]
