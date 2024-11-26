export interface StateInfo {
  /**
   * 路由地址
   */
  state: string
  /**
   * 路由栈的key
   */
  stackKey: string
  /**
   * 当时的history.length
   */
  length: number
  /**
   * 是否iframe跳转
   */
  isIframe: boolean
}

/**
 * 跳转失败回调
 * 参数会原样传回供调用者延续使用参数
 */
export interface onFailInterface {
  (path: string, relativeStep: number): void
}

/**
 * 跳转至指定路径
 * @param path 路径
 * @param [relativeStep] 相对步数，同history.go()，默认为0。参数可选，亦可直接传 onFail
 * @param [onFail] 失败回调
 */
export interface PopStateByPath {
  (path: string, relativeStep?: number, onFail?: onFailInterface): Promise<boolean>
  (path: string, onFail?: onFailInterface): Promise<boolean>
}

/**
 * 路由跳转类型
 */
export type HistoryStackType = 'popstate' | 'push' | 'replace'

/**
 * 路由跳转监听器
 */
export type ListenerCallback = (type: HistoryStackType) => void
