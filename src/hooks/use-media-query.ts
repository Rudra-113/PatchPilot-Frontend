import { useEffect, useState } from 'react'

function readMatch(query: string) {
  if (typeof window === 'undefined') return false
  return window.matchMedia(query).matches
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => readMatch(query))
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return matches
}
