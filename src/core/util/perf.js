
//提供性能检测的相关方法
import { inBrowser } from './env' //是否是浏览器环境

export let mark
export let measure

if (process.env.NODE_ENV !== 'production') {
  //当不是生成模式下

  //window.performance API允许网页访问某些函数来测量网页和Web应用程序的性能
  const perf = inBrowser && window.performance

  if (
    perf &&
    perf.mark && //mark方法用于为相应的视点做标记
    perf.measure && //方法在浏览器性能记录缓存中创建了一个名为时间戳的记录来记录两个特殊标志位（通常称为开始标志和结束标志）。 被命名的时间戳称为一次测量（measure）。
    perf.clearMarks &&
    perf.clearMeasures
  ) {
    mark = tag => perf.mark(tag)

    measure = (name, startTag, endTag) => {

      perf.measure(name, startTag, endTag)

      perf.clearMarks(startTag)

      perf.clearMarks(endTag)

      // perf.clearMeasures(name)
    }
  }
}
