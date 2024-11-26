import { getCallbackType } from './HistoryStack/Communication'
import HistoryStack from './HistoryStack/HistoryStack'
import {
  HistoryStackEvents,
  HistoryStackOptions,
  onFailInterface,
  PopStateByPath
} from './HistoryStack/type'
import { isSamePath, logHistory, onWindowPopstate } from './HistoryStack/utils'

declare global {
  interface Window {
    __historyStack: HistoryStack
  }
}

export const _instance: HistoryStack = new HistoryStack()
window.__historyStack = _instance

const _options = {
  diffURL: isSamePath,
  logDisabled: false
} as HistoryStackOptions

/**
 * 创建一个HistoryStack实例
 * 这是初始化必须做的事情
 */
export function createHistoryStack(options?: Partial<HistoryStackOptions>) {
  Object.assign(_options, options || {})
  return _instance
}

/**
 * 获取跳转到对应路由需要的步数
 * @param path 路径，外传的简略路径
 * @param isForward // 是否前进
 * @param relativeStep // 相对步数
 */
function getStateIndex(path: string, isForward: boolean, relativeStep = 0) {
  let filter = [..._instance.stateStack]
  if (isForward) {
    filter = filter.slice(_instance.stackPosition)
  } else {
    filter.length = _instance.stackPosition + 1
    filter.reverse()
  }
  let delta = filter.findIndex((item) => {
    if (item.isIframe) return false
    return _options.diffURL(item.state, path)
  })
  if (delta === -1) return null

  delta = isForward ? delta : -delta
  delta += relativeStep

  const targetPosition = Math.max(
    0,
    Math.min(_instance.stackPosition + delta, _instance.stateStack.length - 1)
  )

  delta = targetPosition - _instance.stackPosition

  return {
    delta,
    targetPosition,
    targetState: _instance.stateStack[targetPosition]
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
  onFail?: onFailInterface
) {
  const iframeCount = _instance.iframes.length
  if (iframeCount) await recoverIframeHistoryStack()

  const StateIndex = getStateIndex(path, isForward, relativeStep)

  logHistory(
    '$history popstate',
    {
      ...StateIndex,
      currentState: _instance.currentState,
      stackPosition: _instance.stackPosition,
      canPop: !!StateIndex,
      path,
      relativeStep
    },
    _options.logDisabled
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
      _options.logDisabled
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
        _options.logDisabled
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
  path: string,
  relativeStep?: number | onFailInterface,
  onFail?: onFailInterface
) => {
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
  path: string,
  relativeStep?: number | onFailInterface,
  onFail?: onFailInterface
) => {
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
export const createAnchor = (anchorName: string) => {
  _instance.anchorMap[anchorName] = history.state.stackKey
}

/**
 * 跳转至指定路由锚点
 * @param anchorName 返回锚点名称
 * @param step 相当于跳转到指定页面再router.go(step)
 * @returns {Promise<boolean>} 跳转是否成功
 */
export const goAnchor = (anchorName: string, relativeStep = 0) => {
  return new Promise<boolean>((resolve) => {
    const i = _instance.stateStack.findIndex(
      (item) => item.stackKey === _instance.anchorMap[anchorName]
    )
    if (i === -1) return resolve(false)
    const goStep = i - _instance.stackPosition + relativeStep
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

export default {
  historyStack: _instance,
  createHistoryStack,
  backByPath,
  forwardByPath,
  createAnchor,
  goAnchor,
  addHistoryListener,
  removeHistoryListener
}
