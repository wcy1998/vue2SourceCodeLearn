//vue 文件的构建入口文件 vue使用rollup进行 项目的构建 

const fs = require('fs') // node 文件读写模块
const path = require('path') // node 文件路径模块
const zlib = require('zlib') // js 资源压缩工具
const rollup = require('rollup')  // rollup打包工具
const terser = require('terser') // js代码压缩工具


if (!fs.existsSync('dist')) {
   // 未打包时 创建目标文件
  fs.mkdirSync('dist')
}

//获取所有的环境的打包配置对象的数组
let builds = require('./config').getAllBuilds() 

// process 对象是一个全局变量，它提供当前 Node.js 进程的有关信息，以及控制当前 Node.js 进程。
// 因为是全局变量，所以无需使用 require()。 process.argv 属性返回一个数组，这个数组包含了启动Node.js进程时的命令行参数，
//数组的第一个元素process.argv[0]——返回启动Node.js进程的可执行文件所在的绝对路径
//第二个元素process.argv[1]——为当前执行的JavaScript文件路径
//剩余的元素为其他命令行参数

 // 用户通过不同的命令行参数 去判断打包的方式 构建不同版本的vue
if (process.argv[2]) {

//获取命令行的其他参数
  const filters = process.argv[2].split(',')

  builds = builds.filter(b => {
     //过滤出当前需要的打包配置对象
    return filters.some(f => b.output.file.indexOf(f) > -1 || b._name.indexOf(f) > -1)

  })

} else {

  // 默认过滤掉weex构建
  builds = builds.filter(b => {

    return b.output.file.indexOf('weex') === -1

  })

}

build(builds) //按照当前配置 打包文件

/**
 * @description: 打包的方法
 * @param {*} builds 配置对象
 * @return {*}
 */
function build (builds) {

  let built = 0

  const total = builds.length //配置对象的长度

  const next = () => {

    buildEntry(builds[built]).then(() => {
      //循环遍历打包配置对象
      built++

      if (built < total) {

        next()

      }

    }).catch(logError)
  }

  next()

}

/**
 * @description: 具体打包操作
 * @param {*} config 当前的配置对象信息
 * @return {*}
 */
function buildEntry (config) {

  const output = config.output

  const { file, banner } = output

  const isProd = /(min|prod)\.js$/.test(file)

  return rollup.rollup(config) //进行文件打包
    .then(bundle => bundle.generate(output))
    .then(({ output: [{ code }] }) => {
      if (isProd) {
        //如果是生产环境
        const minified = (banner ? banner + '\n' : '') + terser.minify(code, {
          toplevel: true,
          output: {
            ascii_only: true
          },
          compress: {
            pure_funcs: ['makeMap']
          }
        }).code  
        return write(file, minified, true)
      } else {
        return write(file, code)
      }
    })
}

/**
 * @description: 输出文件
 * @param {*} dest
 * @param {*} code
 * @param {*} zip
 * @return {*}
 */
function write (dest, code, zip) {

  return new Promise((resolve, reject) => {

    function report (extra) {

      console.log(blue(path.relative(process.cwd(), dest)) + ' ' + getSize(code) + (extra || ''))

      resolve()

    }

    fs.writeFile(dest, code, err => {
       //输出文件
      if (err) return reject(err)
      if (zip) {
        zlib.gzip(code, (err, zipped) => {
          if (err) return reject(err)
          report(' (gzipped: ' + getSize(zipped) + ')')
        })
      } else {
        report()
      }
    })
  })
}

/**
 * @description: 获取打包后的文件大小
 * @param {*} code
 * @return {*}
 */
function getSize (code) {
  return (code.length / 1024).toFixed(2) + 'kb'
}

/**
 * @description: 错误处理
 * @param {*} e
 * @return {*}
 */
function logError (e) {
  console.log(e)
}

function blue (str) {
  return '\x1b[1m\x1b[34m' + str + '\x1b[39m\x1b[22m'
}
