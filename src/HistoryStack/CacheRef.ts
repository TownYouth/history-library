import Ref from './Ref'

type CacheType = string | number | boolean | object

class CacheRef<T extends CacheType> extends Ref<T> {
  key: string

  set session(data: T) {
    this.setCache(this.key, data)
  }

  get session(): T | null {
    return this.getCache(this.key)
  }

  constructor(key: string, initialData: T) {
    super(initialData)
    this.key = key
    if (this.session) {
      this.value = this.session
    } else {
      this.value = this.session = initialData
    }
    this.watch((value) => {
      this.session = value
    })
  }

  setCache(key: string, data: T) {
    sessionStorage.setItem(key, JSON.stringify(data))
  }

  getCache(key: string) {
    const _v = sessionStorage.getItem(key)
    return _v ? JSON.parse(_v) : null
  }
}

class LocalRef<T extends CacheType> extends CacheRef<T> {
  setCache(key: string, data: T) {
    localStorage.setItem(key, JSON.stringify(data))
  }

  getCache(key: string) {
    const _v = localStorage.getItem(key)
    return _v ? JSON.parse(_v) : null
  }
}

export function sessionRef<T extends CacheType>(key: string, data: T) {
  return new CacheRef(key, data)
}

export function localRef<T extends CacheType>(key: string, data: T) {
  return new LocalRef(key, data)
}

export default CacheRef
