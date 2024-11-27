/**
 * 简易版Ref
 */
class Ref<T = any> {
  _value: T
  listeners: Array<(value: T) => void> = []

  get value() {
    return this._value
  }

  set value(data: T) {
    this._value = toReactive(data, this.trigger)
    this.trigger(data)
  }

  constructor(initial: T) {
    this._value = toReactive(initial, this.trigger)
  }

  trigger = (value: T) => {
    this.listeners.forEach((cb) => cb(value))
  }

  public watch(cb: (value: T) => void) {
    if (typeof cb !== 'function') throw new Error('Watch callback must be a function.')
    if (!this.listeners.includes(cb)) {
      this.listeners.push(cb)
    }

    /**
     * @description 清除监听
     */
    const clear = () => {
      this.listeners = this.listeners.filter((item) => item !== cb)
    }

    return clear
  }
}

function isObject(val: unknown): val is object {
  return val !== null && typeof val === 'object'
}

function toReactive<T>(data: T, trigger: (value: T) => void): T {
  if (!isObject(data)) return data

  const handle = {
    set(target: Record<string | symbol, unknown>, key: string | symbol, value: unknown) {
      trigger(data)
      return Reflect.set(target as object, key, value)
    },
    deleteProperty(target: Record<string | symbol, unknown>, key: string | symbol): boolean {
      const hadKey = Object.prototype.hasOwnProperty.call(target, key)
      const result = Reflect.deleteProperty(target as object, key)
      if (result && hadKey) trigger(data)

      return result
    }
  }

  return new Proxy(data, handle as ProxyHandler<T & object>)
}

export default Ref
