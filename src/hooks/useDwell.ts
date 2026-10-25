import { useEffect, useState } from 'react'

/**
 * `active`가 `ms` 동안 계속 true였는지. active가 false가 되면 즉시 false.
 * 손을 뗀 뒤 N ms 머물렀을 때 카드를 띄우는 데 쓴다.
 */
export function useDwell(active: boolean, ms: number): boolean {
  const [dwelled, setDwelled] = useState(ms <= 0)
  const [prevActive, setPrevActive] = useState(active)

  // active가 바뀌면 타이머를 처음부터 다시 센다 (렌더 중 상태 보정 패턴).
  if (prevActive !== active) {
    setPrevActive(active)
    setDwelled(ms <= 0)
  }

  useEffect(() => {
    if (!active || ms <= 0) return
    const id = window.setTimeout(() => setDwelled(true), ms)
    return () => window.clearTimeout(id)
  }, [active, ms])

  return active && dwelled
}
