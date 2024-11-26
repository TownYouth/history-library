import type {
  HistoryStackType,
  ListenerCallback,
  onFailInterface,
  PopStateByPath,
  StateInfo
} from './type'
import {
  enumerableProperties,
  getHistoryKey,
  isSamePath,
  logHistory,
  onWindowPopstate
} from './utils'

class HistoryStack {
  /**
   * 路由栈
   */
  private stateStack: StateInfo[] = []
  /**
   * 路由栈的索引
   */
  private stackPosition = 0
  /**
   * 路由栈的锚点
   */
  private anchorMap: Record<string, string> = {}
  /**
   * 当前页面上的iframe元素个数
   */
  private get iframes() {
    const iframes = document.querySelectorAll(
      'iframe[history-iframe]'
    ) as unknown as HTMLIFrameElement[]
    const objects = document.querySelectorAll(
      'object[history-iframe]'
    ) as unknown as HTMLObjectElement[]
    return [...iframes, ...objects]
  }

  /**
   * 当前路由栈信息
   */
  private get currentState(): StateInfo {
    return {
      state: location.href,
      stackKey: history.state?.stackKey,
      length: history.length,
      isIframe: false
    }
  }

  /**
   * 监听器列表
   */
  private listenersList: ListenerCallback[] = []

  // 临时变量
  private timer: number = null!
  private lastHistoryLength = 0

  constructor() {
    this.init()

    enumerableProperties(this, [
      'backByPath',
      'forwardByPath',
      'createAnchor',
      'goAnchor',
      'addHistoryListener',
      'removeHistoryListener'
    ])
  }

  /**
   * 改写原生方法，拦截全局跳转
   */
  private init() {
    const that = this

    // 监听状态栏变化或back、go、forward跳转
    window.addEventListener('popstate', () => this.record('popstate'))

    const { pushState, replaceState } = history
    const original = Object.create(Object.getPrototypeOf(history))
    // 监听push跳转
    original.pushState = function newPushState(
      data: any,
      unused: string,
      url?: string | URL | null | undefined
    ) {
      ;(data || (data = {})).stackKey = getHistoryKey()
      const res = pushState.call(this, data, unused, url)
      that.record('push')
      return res
    }
    // 监听replace跳转
    original.replaceState = function newReplaceState(
      data: any,
      unused: string,
      url?: string | URL | null | undefined
    ) {
      ;(data || (data = {})).stackKey = getHistoryKey()
      const res = replaceState.call(this, data, unused, url)
      that.record('replace')
      return res
    }
    Object.setPrototypeOf(history, original)

    // 初始化路由栈
    this.stateStack = [this.currentState]
    if (!this.currentState.stackKey) {
      history.replaceState(null, '')
    }
  }

  private record(type: HistoryStackType) {
    const recordMap: Record<HistoryStackType, () => void> = {
      popstate: this.recordPopstate,
      push: this.recordPush,
      replace: this.recordReplace
    }
    recordMap[type].call(this)
    this.recordIframePopstate()
    this.triggerListeners(type)
  }

  private recordPush() {
    this.stackPosition++
    this.stateStack.length = this.stackPosition
    this.stateStack.push(this.currentState)
  }

  private recordReplace() {
    this.stateStack.length = this.stackPosition
    this.stateStack.push(this.currentState)
  }

  private recordPopstate() {
    const index = this.stateStack.findIndex((item) => item.stackKey === this.currentState.stackKey)

    // 前进/后退
    if (index !== -1) {
      this.stackPosition = index
      return
    }

    // href跳转
    if (history.length > this.lastHistoryLength) {
      this.record('push')
      history.replaceState(null, '')
    }
  }

  /**
   * 处理ifream监听逻辑
   * 监听ifreamDOM元素的onload方法确实可以监听一些正常的跳转
   * 但还是有一些奇葩跳转不知道怎么做到的，这里改用定时器监听
   */
  private recordIframePopstate() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null!
    }
    setTimeout(() => {
      if (this.iframes.length) {
        let last = this.lastHistoryLength
        this.timer = setInterval(() => {
          if (history.length > last) {
            const state = this.currentState
            state.isIframe = true
            state.length = history.length
            const deff = history.length - last
            this.stackPosition += deff
            const l = new Array(deff).fill(state)
            this.stateStack = this.stateStack.concat(l)
            last = history.length
          }
        }, 1000)
      }
    }, 10)
  }

  get stack() {
    return console.table(this.stateStack)
  }

  /**
   * 获取跳转到对应路由需要的步数
   * @param path 路径，外传的简略路径
   * @param isForward // 是否前进
   * @param relativeStep // 相对步数
   */
  private getStateIndex(path: string, isForward: boolean, relativeStep = 0) {
    let filter = [...this.stateStack]
    if (isForward) {
      filter = filter.slice(this.stackPosition)
    } else {
      filter.length = this.stackPosition + 1
      filter.reverse()
    }
    let delta = filter.findIndex((item) => {
      if (item.isIframe) return false
      return isSamePath(item.state, path)
    })
    if (delta === -1) return null

    delta = isForward ? delta : -delta
    delta += relativeStep

    const targetPosition = Math.max(
      0,
      Math.min(this.stackPosition + delta, this.stateStack.length - 1)
    )

    delta = targetPosition - this.stackPosition

    return {
      delta,
      targetPosition,
      targetState: this.stateStack[targetPosition]
    }
  }

  /**
   * 跳转前判断是否有iframe，有则将路由栈推至最新的栈
   * 由于无法知道iframe中的返回跳转，这里手动将路由栈推至最新的栈
   * 不过这样还是会有漏洞，比如从iframe跳转到一个项目内的正常页面就可能有问题，不过目前没找到好的解决方案
   */
  private recoverIframeHistoryStack() {
    return new Promise<void>((resolve) => {
      const iframes = this.iframes
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

  private async popstate(
    isForward: boolean,
    path: string,
    relativeStep = 0,
    onFail?: onFailInterface
  ) {
    const iframeCount = this.iframes.length
    if (iframeCount) await this.recoverIframeHistoryStack()

    const StateIndex = this.getStateIndex(path, isForward, relativeStep)

    logHistory('$history popstate', {
      ...StateIndex,
      currentState: this.currentState,
      stackPosition: this.stackPosition,
      canPop: !!StateIndex,
      path,
      relativeStep
    })

    if (!StateIndex) {
      typeof onFail === 'function' && onFail(path, relativeStep)
      return false
    }
    history.go(StateIndex.delta)

    if (iframeCount) {
      const popRes = await onWindowPopstate()
      logHistory('popstate-result', {
        isSuccess: location.href === StateIndex.targetState.state,
        isPop: popRes
      })
      let i = 0
      while (location.href !== StateIndex.targetState.state && i < 50) {
        history.go(isForward ? 1 : -1)
        const popRes = await onWindowPopstate()
        logHistory('popstate-retry-result', {
          isSuccess: location.href === StateIndex.targetState.state,
          isPop: popRes
        })
        i++
      }
    }
    return true
  }

  public backByPath: PopStateByPath = (
    path: string,
    relativeStep?: number | onFailInterface,
    onFail?: onFailInterface
  ) => {
    if (typeof relativeStep === 'function') {
      onFail = relativeStep
      relativeStep = 0
    }
    return this.popstate(false, path, relativeStep || 0, onFail)
  }

  public forwardByPath: PopStateByPath = (
    path: string,
    relativeStep?: number | onFailInterface,
    onFail?: onFailInterface
  ) => {
    if (typeof relativeStep === 'function') {
      onFail = relativeStep
      relativeStep = 0
    }
    return this.popstate(true, path, relativeStep || 0, onFail)
  }

  public createAnchor = (anchorName: string) => {
    this.anchorMap[anchorName] = history.state.stackKey
  }

  public goAnchor = (anchorName: string, relativeStep = 0) => {
    return new Promise<boolean>((resolve) => {
      const i = this.stateStack.findIndex((item) => item.stackKey === this.anchorMap[anchorName])
      if (i === -1) return resolve(false)
      const goStep = i - this.stackPosition + relativeStep
      history.go(goStep)
      resolve(true)
    })
  }

  private triggerListeners(type: HistoryStackType) {
    for (const callback of this.listenersList) {
      callback(type)
    }
  }

  public addHistoryListener = (callback: ListenerCallback) => {
    if (!this.listenersList.includes(callback) && typeof callback === 'function') {
      this.listenersList.push(callback)
    }
  }

  public removeHistoryListener = (callback: ListenerCallback) => {
    const i = this.listenersList.findIndex((item) => item === callback)
    if (i !== -1) {
      this.listenersList.splice(i, 1)
    }
  }
}

export default HistoryStack
