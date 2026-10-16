import { useEffect, useState } from 'react'

// True on laptop-sized screens and bigger, where the app switches to its desk layout
const QUERY = '(min-width: 1024px)'
const matches = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(QUERY).matches)

export function useWide() {
  const [wide, setWide] = useState(matches)
  useEffect(() => {
    const list = window.matchMedia(QUERY)
    const onChange = () => setWide(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [])
  return wide
}
