/* @flow */

import {
  tip,
  hasOwn,//检查对象是否具有该属性
  isDef,
  isUndef,
  hyphenate,//连接驼峰式字符串
  formatComponentName
} from 'core/util/index'


//将当前组件的props抽取出来
export function extractPropsFromVNodeData (
  data: VNodeData, //当前组件的vnode data
  Ctor: Class<Component>, //当前组件的构造函数
  tag?: string
): ?Object {

  // we are only extracting raw values here.
  // validation and default values are handled in the child
  // component itself.
  //这里只获取原生的值 不进行校验

  //获取当前组件opitons的props
  const propOptions = Ctor.options.props

  if (isUndef(propOptions)) {
    //如果不存在就返回
    return
  }


  const res = {}
  //获取data中的 attrs  props
  const { attrs, props } = data

  if (isDef(attrs) || isDef(props)) {
    //如果有存在的
    for (const key in propOptions) {
      //遍历构造函数中的 options
      const altKey = hyphenate(key) //转换成驼峰形式

      if (process.env.NODE_ENV !== 'production') {
        const keyInLowerCase = key.toLowerCase()
        if (
          key !== keyInLowerCase &&
          attrs && hasOwn(attrs, keyInLowerCase)
        ) {
          tip(
            `Prop "${keyInLowerCase}" is passed to component ` +
            `${formatComponentName(tag || Ctor)}, but the declared prop name is` +
            ` "${key}". ` +
            `Note that HTML attributes are case-insensitive and camelCased ` +
            `props need to use their kebab-case equivalents when using in-DOM ` +
            `templates. You should probably use "${altKey}" instead of "${key}".`
          )
        }
      }
      //先验证props 在验证 attrs
      checkProp(res, props, key, altKey, true) ||
      checkProp(res, attrs, key, altKey, false)

    }
  }
  return res
}

function checkProp (
  res: Object, 结果
  hash: ?Object, 验证的类型
  key: string, 验证的熟悉
  altKey: string, 驼峰形式的熟悉
  preserve: boolean 是否保留
): boolean {
  if (isDef(hash)) {
    //如果存在该类型的数据
    if (hasOwn(hash, key)) {
      //如果存在该属性 向res中加入该值
      res[key] = hash[key] 

      if (!preserve) {
        //删除attrs中的属性
        delete hash[key]
      }
      return true
    } else if (hasOwn(hash, altKey)) {
      res[key] = hash[altKey]
      if (!preserve) {
        delete hash[altKey]
      }
      return true
    }
  }
  return false
}
