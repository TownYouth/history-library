import { getCallbackType } from './HistoryStack/Communication'
import HistoryStack from './HistoryStack/HistoryStack'
import {
  HistoryStackEvents,
  onFailInterface,
  PopStateByPath,
  PopStateByPathOptions
} from './HistoryStack/type'
import { isSamePath, logHistory, onWindowPopstate } from './HistoryStack/utils'

const _instance: HistoryStack = new HistoryStack()

/**
 * HistoryStack 配置项
 */
interface HistoryLibraryOptions {
  /**
   * 自定义对比路径方法
   * @param href 路由栈中存储的完整路径，来自location.href，如：http://localhost.com:8888/a/b?a=123
   * @param path 外部传入的简略路径，如：a/b
   * @returns 是否相同，相同为 true
   */
  diffURL: (href: string, path: string) => boolean
  /**
   * 是否禁用log，true 为禁用，默认为 false
   */
  logDisabled: boolean
}

/**
 * HistoryLibrary 配置项
 */
const options: HistoryLibraryOptions = {
  diffURL: isSamePath,
  logDisabled: false
}

export function init(customOptions?: Partial<HistoryLibraryOptions>) {
  Object.assign(options, customOptions || {})
}

/**
 * 获取跳转到对应路由需要的步数
 * @param path 路径，外传的简略路径
 * @param isForward // 是否前进
 * @param relativeStep // 相对步数
 */
function getStateIndex(
  path: string,
  isForward: boolean,
  relativeStep = 0,
  diffURL?: HistoryLibraryOptions['diffURL']
) {
  let filter = [..._instance.stateStack.value]
  if (isForward) {
    filter = filter.slice(_instance.stackPosition.value)
  } else {
    filter.length = _instance.stackPosition.value + 1
    filter.reverse()
  }
  let delta = filter.findIndex((item) => {
    if (item.isIframe) return false
    if (diffURL) {
      return diffURL(item.state, path)
    }
    return options.diffURL(item.state, path)
  })
  if (delta === -1) return null

  delta = isForward ? delta : -delta
  delta += relativeStep

  const targetPosition = Math.max(
    0,
    Math.min(_instance.stackPosition.value + delta, _instance.stateStack.value.length - 1)
  )

  delta = targetPosition - _instance.stackPosition.value

  return {
    delta,
    targetPosition,
    targetState: _instance.stateStack.value[targetPosition]
  }
}

/**
 * 跳转前判断是否有iframe，有则将路由栈推至最新的栈
 * 由于无法知道iframe中的返回跳转，这里手动将路由栈推至最新的栈
 * 不过这样还是会有漏洞，比如从iframe跳转到一个项目内的正常页面就可能有问题，不过目前没找到好的解决方案
 */
function recoverIframeHistoryStack() {
  return new Promise<void>((resolve) => {
    const iframes = _instance.iframes
    if (!iframes.length) return resolve()

    for (const iframe of iframes) {
      iframe.remove()
    }
    for (let i = 0; i < 50; i++) {
      history.go(1)
    }
    setTimeout(resolve)
  })
}

async function popstate(
  isForward: boolean,
  path: string,
  relativeStep = 0,
  onFail: onFailInterface | undefined = undefined,
  diffURL?: HistoryLibraryOptions['diffURL']
) {
  const iframeCount = _instance.iframes.length
  if (iframeCount) await recoverIframeHistoryStack()

  const StateIndex = getStateIndex(path, isForward, relativeStep, diffURL)

  logHistory(
    '$history popstate',
    {
      ...StateIndex,
      currentState: _instance.currentState,
      stackPosition: _instance.stackPosition.value,
      canPop: !!StateIndex,
      path,
      relativeStep
    },
    options.logDisabled
  )

  if (!StateIndex) {
    typeof onFail === 'function' && onFail(path, relativeStep)
    return false
  }
  history.go(StateIndex.delta)

  if (iframeCount) {
    const popRes = await onWindowPopstate()
    logHistory(
      'popstate-result',
      {
        isSuccess: location.href === StateIndex.targetState.state,
        isPop: popRes
      },
      options.logDisabled
    )
    let i = 0
    while (location.href !== StateIndex.targetState.state && i < 50) {
      history.go(isForward ? 1 : -1)
      const popRes = await onWindowPopstate()
      logHistory(
        'popstate-retry-result',
        {
          isSuccess: location.href === StateIndex.targetState.state,
          isPop: popRes
        },
        options.logDisabled
      )
      i++
    }
  }
  return true
}

/**
 * 返回指定路由
 * @param path 路由(匹配最后一个子路由，跳转最近可匹配的记录)
 * @param step 相当于跳转到指定页面再router.go(step)
 * @param onFail 跳转失败时回调
 * @returns {Promise<boolean>} 跳转是否成功
 */
export const backByPath: PopStateByPath = (
  path: string | PopStateByPathOptions,
  relativeStep?: number | onFailInterface,
  onFail?: onFailInterface
) => {
  if (typeof path === 'object' && path) {
    return popstate(false, path.path, path.relativeStep || 0, path.onFail, path.diffURL)
  }
  if (typeof relativeStep === 'function') {
    onFail = relativeStep
    relativeStep = 0
  }
  return popstate(false, path, relativeStep || 0, onFail)
}

/**
 * 前进指定路由
 * @param path 路由(匹配最后一个子路由，跳转最近可匹配的记录)
 * @param step 相当于跳转到指定页面再router.go(step)
 * @param onFail 跳转失败时回调
 * @returns {Promise<boolean>} 跳转是否成功
 */
export const forwardByPath: PopStateByPath = (
  path: string | PopStateByPathOptions,
  relativeStep?: number | onFailInterface,
  onFail?: onFailInterface
) => {
  if (typeof path === 'object' && path) {
    return popstate(true, path.path, path.relativeStep || 0, path.onFail, path.diffURL)
  }
  if (typeof relativeStep === 'function') {
    onFail = relativeStep
    relativeStep = 0
  }
  return popstate(true, path, relativeStep || 0, onFail)
}

/**
 * 创建路由锚点
 * @param anchorName 锚点名称，返回时会用
 */
export const createAnchor = (anchorName: string | symbol) => {
  _instance.anchorMap[anchorName] = history.state.stackKey
}

/**
 * 跳转至指定路由锚点
 * @param anchorName 返回锚点名称
 * @param step 相当于跳转到指定页面再router.go(step)
 * @returns {Promise<boolean>} 跳转是否成功
 */
export const toAnchor = (anchorName: string | symbol, relativeStep = 0) => {
  return new Promise<boolean>((resolve) => {
    const i = _instance.stateStack.value.findIndex(
      (item) => item.stackKey === _instance.anchorMap[anchorName]
    )
    if (i === -1) return resolve(false)
    const goStep = i - _instance.stackPosition.value + relativeStep
    history.go(goStep)
    resolve(true)
  })
}

/**
 * 添加路由变化监听
 */
export const addHistoryListener = (
  callback: getCallbackType<HistoryStackEvents, 'historyChange'>
) => _instance.$on('historyChange', callback)

/**
 * 移除路由变化监听
 */
export const removeHistoryListener = (
  callback: getCallbackType<HistoryStackEvents, 'historyChange'>
) => _instance.$off('historyChange', callback)

export const historyStack = _instance

declare global {
  interface Window {
    __historyStack: HistoryStack
  }
}
window.__historyStack = _instance

export const $history = {
  init,
  options,
  historyStack: _instance,
  backByPath,
  forwardByPath,
  createAnchor,
  toAnchor,
  addHistoryListener,
  removeHistoryListener
}

export default $history
