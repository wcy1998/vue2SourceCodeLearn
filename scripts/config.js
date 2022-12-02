/*
 * @Author: your name
 * @Date: 2021-08-01 15:58:44
 * @LastEditTime: 2021-10-11 10:01:11
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \vue\scripts\config.js
 */

const path = require('path')//获取node的路径模块
const buble = require('rollup-plugin-buble') //rollup 打包所需的模块
const alias = require('rollup-plugin-alias')//rollup 打包所需的模块
const cjs = require('rollup-plugin-commonjs') //rollup 打包所需的模块
const replace = require('rollup-plugin-replace') //rollup 打包所需的模块
const node = require('rollup-plugin-node-resolve') //rollup 打包所需的模块
const flow = require('rollup-plugin-flow-no-whitespace') //类型校验插件

//process.env属性返回一个包含用户环境信息的对象

//获取环境的版本信息 当前是2.6.1版本
const version = process.env.VERSION || require('../package.json').version 

//获取环境的weex版本信息 当前是2.6.1版本
const weexVersion = process.env.WEEX_VERSION || require('../packages/weex-vue-framework/package.json').version

const featureFlags = require('./feature-flags')

//获取设置vue的启动banner信息
const banner =
  '/*!\n' +
  ` * Vue.js v${version}\n` +
  ` * (c) 2014-${new Date().getFullYear()} Evan You\n` +
  ' * Released under the MIT License.\n' +
  ' */'

const weexFactoryPlugin = { //导入weex插件
  intro () {
    return 'module.exports = function weexFactory (exports, document) {'
  },
  outro () {
    return '}'
  }
}

const aliases = require('./alias') //获取各个模块的路径

const resolve = p => { //获取实际的路径

  const base = p.split('/')[0]

  if (aliases[base]) {

    return path.resolve(aliases[base], p.slice(base.length + 1))

  } else {

    return path.resolve(__dirname, '../', p)

  }
}

// 不同的rollup构建规则

const builds = {
  // web运行时开发环境的 cjs格式配置
  'web-runtime-cjs-dev': {
    entry: resolve('web/entry-runtime.js'),
    dest: resolve('dist/vue.runtime.common.dev.js'),
    format: 'cjs',
    env: 'development',
    banner
  },

  // web运行时生产环境的 cjs格式配置
  'web-runtime-cjs-prod': {
    entry: resolve('web/entry-runtime.js'),
    dest: resolve('dist/vue.runtime.common.prod.js'),
    format: 'cjs',
    env: 'production',
    banner
  },

  // web运行时+编译时 开发环境的 cjs格式配置
  'web-full-cjs-dev': {
    entry: resolve('web/entry-runtime-with-compiler.js'),
    dest: resolve('dist/vue.common.dev.js'),
    format: 'cjs',
    env: 'development',
    alias: { he: './entity-decoder' },
    banner
  },

    // web运行时+编译时 生产环境的 cjs格式配置
  'web-full-cjs-prod': {
    entry: resolve('web/entry-runtime-with-compiler.js'),
    dest: resolve('dist/vue.common.prod.js'),
    format: 'cjs',
    env: 'production',
    alias: { he: './entity-decoder' },
    banner
  },

  // web运行时 esm格式配置
  'web-runtime-esm': {
    entry: resolve('web/entry-runtime.js'),
    dest: resolve('dist/vue.runtime.esm.js'),
    format: 'es',
    banner
  },

  // web运行时+编译时  esm格式配置
  'web-full-esm': {
    entry: resolve('web/entry-runtime-with-compiler.js'),
    dest: resolve('dist/vue.esm.js'),
    format: 'es',
    alias: { he: './entity-decoder' },
    banner
  },

  // web运行时+编译时 浏览器开发环境的 esm格式配置
  'web-full-esm-browser-dev': {
    entry: resolve('web/entry-runtime-with-compiler.js'),
    dest: resolve('dist/vue.esm.browser.js'),
    format: 'es',
    transpile: false,
    env: 'development',
    alias: { he: './entity-decoder' },
    banner
  },

   // web运行时+编译时 浏览器生产环境的 esm格式配置
  'web-full-esm-browser-prod': {
    entry: resolve('web/entry-runtime-with-compiler.js'),
    dest: resolve('dist/vue.esm.browser.min.js'),
    format: 'es',
    transpile: false,
    env: 'production',
    alias: { he: './entity-decoder' },
    banner
  },

  //浏览器web 运行时 开发环境
  'web-runtime-dev': {
    entry: resolve('web/entry-runtime.js'),
    dest: resolve('dist/vue.runtime.js'),
    format: 'umd',
    env: 'development',
    banner
  },

  //浏览器web 运行时 生产环境
  'web-runtime-prod': {
    entry: resolve('web/entry-runtime.js'),
    dest: resolve('dist/vue.runtime.min.js'),
    format: 'umd',
    env: 'production',
    banner
  },

    //浏览器web 运行时+编译时 开发环境
  'web-full-dev': {
    entry: resolve('web/entry-runtime-with-compiler.js'),
    dest: resolve('dist/vue.js'),
    format: 'umd',
    env: 'development',
    alias: { he: './entity-decoder' },
    banner
  },

    //浏览器web 运行时+编译时 生产环境
  'web-full-prod': {
    entry: resolve('web/entry-runtime-with-compiler.js'),
    dest: resolve('dist/vue.min.js'),
    format: 'umd',
    env: 'production',
    alias: { he: './entity-decoder' },
    banner
  },

  // Web compiler (CommonJS).
  'web-compiler': {
    entry: resolve('web/entry-compiler.js'),
    dest: resolve('packages/vue-template-compiler/build.js'),
    format: 'cjs',
    external: Object.keys(require('../packages/vue-template-compiler/package.json').dependencies)
  },

  // Web compiler (UMD for in-browser use).
  'web-compiler-browser': {
    entry: resolve('web/entry-compiler.js'),
    dest: resolve('packages/vue-template-compiler/browser.js'),
    format: 'umd',
    env: 'development',
    moduleName: 'VueTemplateCompiler',
    plugins: [node(), cjs()]
  },
  
  // Web server renderer (CommonJS).
  'web-server-renderer-dev': {
    entry: resolve('web/entry-server-renderer.js'),
    dest: resolve('packages/vue-server-renderer/build.dev.js'),
    format: 'cjs',
    env: 'development',
    external: Object.keys(require('../packages/vue-server-renderer/package.json').dependencies)
  },
  'web-server-renderer-prod': {
    entry: resolve('web/entry-server-renderer.js'),
    dest: resolve('packages/vue-server-renderer/build.prod.js'),
    format: 'cjs',
    env: 'production',
    external: Object.keys(require('../packages/vue-server-renderer/package.json').dependencies)
  },
  'web-server-renderer-basic': {
    entry: resolve('web/entry-server-basic-renderer.js'),
    dest: resolve('packages/vue-server-renderer/basic.js'),
    format: 'umd',
    env: 'development',
    moduleName: 'renderVueComponentToString',
    plugins: [node(), cjs()]
  },
  'web-server-renderer-webpack-server-plugin': {
    entry: resolve('server/webpack-plugin/server.js'),
    dest: resolve('packages/vue-server-renderer/server-plugin.js'),
    format: 'cjs',
    external: Object.keys(require('../packages/vue-server-renderer/package.json').dependencies)
  },
  'web-server-renderer-webpack-client-plugin': {
    entry: resolve('server/webpack-plugin/client.js'),
    dest: resolve('packages/vue-server-renderer/client-plugin.js'),
    format: 'cjs',
    external: Object.keys(require('../packages/vue-server-renderer/package.json').dependencies)
  },
  // Weex runtime factory
  'weex-factory': {
    weex: true,
    entry: resolve('weex/entry-runtime-factory.js'),
    dest: resolve('packages/weex-vue-framework/factory.js'),
    format: 'cjs',
    plugins: [weexFactoryPlugin]
  },
  // Weex runtime framework (CommonJS).
  'weex-framework': {
    weex: true,
    entry: resolve('weex/entry-framework.js'),
    dest: resolve('packages/weex-vue-framework/index.js'),
    format: 'cjs'
  },
  // Weex compiler (CommonJS). Used by Weex's Webpack loader.
  'weex-compiler': {
    weex: true,
    entry: resolve('weex/entry-compiler.js'),
    dest: resolve('packages/weex-template-compiler/build.js'),
    format: 'cjs',
    external: Object.keys(require('../packages/weex-template-compiler/package.json').dependencies)
  }
}


/**
 * @description: 生成webpack配置
 * @param {*} 
 * @return {*}
 */
function genConfig (name) {

  const opts = builds[name] //获取具体的构建方式

  const config = { //真实rollup打包配置

    input: opts.entry, //文件的打包入口

    external: opts.external, //外部引入的包

    plugins: [ //rollup所使用的一些打包插件
      flow(),
      alias(Object.assign({}, aliases, opts.alias))
    ].concat(opts.plugins || []),

    output: { 
      file: opts.dest, //文件的输出路径
      format: opts.format, //打包的文件格式
      banner: opts.banner, //文件banner
      name: opts.moduleName || 'Vue' //文件的名称
    },

    onwarn: (msg, warn) => { 
      if (!/Circular/.test(msg)) {
        warn(msg)
      }
    }

  }

  // built-in vars
  const vars = {
    __WEEX__: !!opts.weex,
    __WEEX_VERSION__: weexVersion,
    __VERSION__: version
  }

  // feature flags
  Object.keys(featureFlags).forEach(key => {
    vars[`process.env.${key}`] = featureFlags[key]
  })

  // build-specific env
  if (opts.env) {

    vars['process.env.NODE_ENV'] = JSON.stringify(opts.env)

  }

  config.plugins.push(replace(vars))

  if (opts.transpile !== false) {
    config.plugins.push(buble())
  }

  Object.defineProperty(config, '_name', { //配置枚举为false  不可迭代
    enumerable: false,
    value: name
  })

  return config

}

if (process.env.TARGET) {

  module.exports = genConfig(process.env.TARGET)

} else {

  exports.getBuild = genConfig

  exports.getAllBuilds = () => Object.keys(builds).map(genConfig)
  
}
