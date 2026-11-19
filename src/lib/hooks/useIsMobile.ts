import { useEffect, useState } from 'react'

/** Phone layout breakpoint. Tablet and desktop (>= 768px) keep the original layout. */
export const MOBILE_MAX_WIDTH = 767
const QUERY = `(max-width: ${MOBILE_MAX_WIDTH}px)`

/** true on phone-width screens; updates on resize / rotation. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = () => setIsMobile(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
