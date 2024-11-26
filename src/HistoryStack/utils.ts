/**
 * 生成随机key
 */
export function getHistoryKey(len = 32) {
  const t = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678'
  const a = t.length
  let n = ''
  for (let i = 0; i < len; i++) n += t.charAt(Math.floor(Math.random() * a))
  return n
}

/**
 * 一次性监听popstate事件
 */
export function onWindowPopstate(): Promise<PopStateEvent | null> {
  return new Promise((resolve) => {
    let timer: number = null!
    const fn = (e: PopStateEvent | null) => {
      clearTimeout(timer)
      resolve(e)
      window.removeEventListener('popstate', fn)
    }
    window.addEventListener('popstate', fn)
    timer = setTimeout(fn.bind(null, null), 300)
  })
}

/**
 * 打印history信息
 * @param title
 * @param content
 */
export function logHistory(title: string, content: any) {
  console.log(
    `%c${title}:\n`,
    'background:#989898;color:#fff;',
    JSON.parse(JSON.stringify(content))
  )
}

/**
 * 比较路径是否相同
 * @param href 完整路径，如：http://localhost.com:8888/a/b?a=123
 * @param path 外部传入的简略路径，如：a/b
 * @returns
 */
export function isSamePath(href: string, path: string) {
  href = /(?<=\w+:\/\/[^/]+\/(?:#\/)?)[\w/-]+(?=(?:\?.*|$))/.exec(href)?.[0] as string
  if (!href) return false

  href = href.replace(/^\/|\/$/g, '').toLocaleLowerCase()
  path = path.replace(/^\/|\/$/g, '').toLocaleLowerCase()
  return href === path
}

/**
 * 设置可枚举属性
 */
export function enumerableProperties<T extends Record<string, any>>(target: T, props: (keyof T)[]) {
  const notEnumerable: PropertyDescriptor = { enumerable: false }
  const map: PropertyDescriptorMap = {}
  Object.keys(target).forEach((key) => {
    if (props.includes(key)) return
    map[key] = notEnumerable
  })

  Object.defineProperties(target, map)
}
