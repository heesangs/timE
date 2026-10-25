import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import styles from './DotFlight.module.css'

export interface Point {
  x: number
  y: number
}

export interface DotFlightProps {
  text: string
  /** 출발: 인풋의 화면 좌표 */
  fromRect: DOMRect
  /** 도착: 테두리 점의 화면 좌표 */
  to: Point
  onDone: () => void
}

const FLIGHT_MS = 600

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 제출한 텍스트가 축소되며 해당 각도의 시계 테두리로 날아가 점으로 박히는 모션.
 * CSS transform transition만 사용한다.
 */
export function DotFlight({ text, fromRect, to, onDone }: DotFlightProps) {
  const [flying, setFlying] = useState(false)
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  const from: Point = { x: fromRect.left + fromRect.width / 2, y: fromRect.top + fromRect.height / 2 }
  const dx = to.x - from.x
  const dy = to.y - from.y

  // 첫 프레임에 출발 위치를 그린 뒤 다음 프레임에 도착 transform을 건다.
  useLayoutEffect(() => {
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setFlying(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [])

  useEffect(() => {
    const ms = prefersReducedMotion() ? 0 : FLIGHT_MS
    const id = window.setTimeout(() => onDoneRef.current(), ms + 40)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <div
      className={`${styles.flight} ${flying ? styles.flying : ''}`}
      style={{
        left: from.x,
        top: from.y,
        transform: flying ? `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.15)` : 'translate(-50%, -50%)',
      }}
      aria-hidden="true"
    >
      {text}
    </div>
  )
}
