import { useEffect } from 'react'

// Keeps the screen on while you train, so the phone doesn't lock between sets.
// Phones drop the lock when the app goes to the background, so it's asked for again on coming back.
// Where a phone doesn't support it, nothing happens.
export function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock = null
    let stopped = false
    const request = async () => {
      if (stopped || document.visibilityState !== 'visible') return
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        // Low battery mode or the phone said no: the screen just locks as normal
      }
    }
    request()
    document.addEventListener('visibilitychange', request)
    return () => {
      stopped = true
      document.removeEventListener('visibilitychange', request)
      lock?.release().catch(() => {})
    }
  }, [active])
}
