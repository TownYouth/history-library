import HistoryStack from './HistoryStack/HistoryStack'

declare global {
  interface Window {
    __historyStack: HistoryStack
  }
}

let _instance: HistoryStack = null!
export const $history: HistoryStack = (function () {
  if (!_instance) {
    _instance = new HistoryStack()
  }
  window.__historyStack = _instance
  return _instance
})()

export default $history
