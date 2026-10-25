import { useEffect, useRef, useState } from 'react'

/** cubic-bezier(0.22, 1, 0.36, 1) ≈ easeOutQuint */
function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5)
}

/**
 * target 각도를 durationMs 동안 requestAnimationFrame으로 따라가는 값.
 * 바늘의 CSS transition과 같은 이징을 써서 배경 톤·상단 숫자가 바늘과 함께 움직이게 한다.
 * durationMs가 0이면(드래그 중) 즉시 target을 반환한다.
 */
export function useAnimatedAngle(target: number, durationMs: number): number {
  const [value, setValue] = useState(target)
  const valueRef = useRef(target)
  const rafRef = useRef(0)

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    const from = valueRef.current
    const to = target
    const reduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reduced ? 0 : durationMs

    if (duration <= 0 || Math.abs(to - from) < 0.01) {
      valueRef.current = to
      setValue(to)
      return
    }

    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const v = from + (to - from) * easeOutQuint(t)
      valueRef.current = v
      setValue(v)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, durationMs])

  return value
}
