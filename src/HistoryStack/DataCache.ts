import Ref from './Ref'

type CacheType = string | number | boolean | object

class DataCache<T extends CacheType> extends Ref<T> {
  key: string

  set session(data: T) {
    sessionStorage.setItem(this.key, JSON.stringify(data))
  }

  get session(): T | null {
    const _v = sessionStorage.getItem(this.key)
    return _v ? JSON.parse(_v) : null
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
}

export default DataCache
