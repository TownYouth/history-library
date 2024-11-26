/* eslint-disable no-use-before-define */
/**
 * 封装事件监听，方便使用
 */
export default abstract class Communication<EventType extends Record<string, any[]>> {
  /**
   * 设置元素快捷键
   * @param el 快捷键作用元素
   * @param shortcut 快捷键描述 +做连接符
   * @param callback 监听回调
   * @returns 清除监听的方法
   */
  static shortcutKeysListener<E extends HTMLElement>(
    el: E,
    shortcut: string,
    callback: (this: E, event: KeyboardEvent) => void
  ) {
    if (
      !/^(?:(?:ctrl|shift|alt)\+){0,3}(?:\w|enter|backspace|Escape|Tab|CapsLock|Meta|Insert|Home|PageUp|Delete|End|PageDown|ArrowLeft|ArrowUp|ArrowRight|ArrowDown)$/i.test(
        shortcut
      )
    ) {
      throw new Error('Shortcut keys is invalid')
    }

    const keys = shortcut
      .split('+')
      .map((item) => item.toLocaleLowerCase())
      .sort()
      .join('+')

    function handleKeydown(event: KeyboardEvent) {
      const { key, ctrlKey, shiftKey, altKey, metaKey } = event
      const keyList = [
        ctrlKey && 'ctrl',
        navigator.platform.includes('Mac') && metaKey && 'ctrl',
        shiftKey && 'shift',
        altKey && 'alt',
        key
      ]
        .filter(Boolean)
        .map((item) => (<string>item).toLocaleLowerCase())
        .sort()
        .join('+')

      if (keyList === keys) {
        callback.call(el, event)
      }
    }

    el.addEventListener('keydown', handleKeydown)

    return () => {
      el.removeEventListener('keydown', handleKeydown)
    }
  }

  /** 外部监听事件集合 */
  private _eventMap = {} as {
    [k in keyof EventType]: ((...args: EventType[k]) => void)[]
  }

  /** 内部监听事件集合 */
  private _listenerMap = {} as Record<string, { el: Element; callback: (...args: any[]) => void }[]>
  private _shortcutKeysMap: ReturnType<typeof Communication.shortcutKeysListener>[] = []

  /**
   * 外部监听输入框事件
   * @param event 事件名称
   * @param callback 回调函数
   */
  public $on = <Event extends keyof EventType>(
    event: Event,
    callback: (...args: EventType[Event]) => void
  ) => {
    const list = this._eventMap[event] || (this._eventMap[event] = [])
    if (!list.includes(callback)) list.push(callback)
  }

  /**
   * 外部取消监听输入框事件
   * @param event 事件名称
   * @param callback 回调函数
   */
  public $off = <Event extends keyof EventType>(
    event: Event,
    callback: (...args: EventType[Event]) => void
  ) => {
    const list = this._eventMap[event] || (this._eventMap[event] = [])
    const i = list.findIndex((item) => item === callback)
    if (i !== -1) {
      list.splice(i, 1)
    }
  }

  protected $emit<Event extends keyof EventType>(event: Event, ...args: EventType[Event]) {
    ;(this._eventMap[event] || []).forEach((callback) => callback.call(this, ...args))
  }

  /**
   * 内部事件监听，便于销毁时清除
   */
  protected addListener(el: Element, event: string, callback: (...args: any[]) => void) {
    ;(this._listenerMap[event] || (this._listenerMap[event] = [])).push({ el, callback })
    el.addEventListener(event, callback)
  }

  /**
   * 内部监听快捷键
   */
  protected onShortcutKeysTrigger(...args: Parameters<typeof Communication.shortcutKeysListener>) {
    const clear = Communication.shortcutKeysListener(...args)
    this._shortcutKeysMap.push(clear)
    return clear
  }

  /**
   * 销毁事件
   * @description 用以外部主动清除事件监听
   */
  protected onDestroy() {
    for (const event in this._listenerMap) {
      this._listenerMap[event].forEach(({ el, callback }) =>
        el.removeEventListener(event, callback)
      )
    }
    this._listenerMap = null!
    this._eventMap = null!
    for (const clearShortcut of this._shortcutKeysMap) {
      clearShortcut()
    }
    this._shortcutKeysMap = null!
  }
}

export type getCallbackType<EventType extends Record<string, any[]>, K extends keyof EventType> = (
  ...args: EventType[K]
) => void
