import Communication from './Communication'
import DataCache from './DataCache'
import type { HistoryStackEvents, HistoryStackType, StateInfo } from './type'
import { enumerableProperties, getHistoryKey } from './utils'

class HistoryStack extends Communication<HistoryStackEvents> {
  /**
   * 路由栈
   */
  stateStack = new DataCache<StateInfo[]>('_historyStack_stateStack', [])
  /**
   * 路由栈的索引
   */
  stackPosition = new DataCache<number>('_historyStack_stackPosition', 0)
  /**
   * 路由栈的锚点
   */
  anchorMap: Record<string, string> = {}
  /**
   * 当前页面上的iframe元素个数
   */
  get iframes() {
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
  get currentState(): StateInfo {
    return {
      state: location.href,
      stackKey: history.state?.stackKey,
      length: history.length,
      isIframe: false
    }
  }

  // 临时变量
  timer: number = null!
  lastHistoryLength = 0

  constructor() {
    super()
    this.init()

    enumerableProperties(this, ['stackPosition', 'stateStack'])
  }

  /**
   * 改写原生方法，拦截全局跳转
   */
  init() {
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
    if (!this.stateStack.value.length) {
      this.stateStack.value = [this.currentState]
    }
    if (!this.currentState.stackKey) {
      history.replaceState(null, '')
    }
  }

  record(type: HistoryStackType) {
    const recordMap: Record<HistoryStackType, () => void> = {
      popstate: this.recordPopstate,
      push: this.recordPush,
      replace: this.recordReplace
    }
    recordMap[type].call(this)
    this.recordIframePopstate()
    this.$emit('historyChange', type)
  }

  recordPush() {
    this.stackPosition.value++
    this.stateStack.value.length = this.stackPosition.value
    this.stateStack.value.push(this.currentState)
  }

  recordReplace() {
    this.stateStack.value.length = this.stackPosition.value
    this.stateStack.value.push(this.currentState)
  }

  recordPopstate() {
    const index = this.stateStack.value.findIndex(
      (item) => item.stackKey === this.currentState.stackKey
    )

    // 前进/后退
    if (index !== -1) {
      this.stackPosition.value = index
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
  recordIframePopstate() {
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
            this.stackPosition.value += deff
            const l = new Array(deff).fill(state)
            this.stateStack.value = this.stateStack.value.concat(l)
            last = history.length
          }
        }, 1000)
      }
    }, 10)
  }
}

export default HistoryStack
