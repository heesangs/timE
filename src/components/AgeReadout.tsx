import { useCallback, useEffect, useRef } from 'react'
import { ageToMinutes, computeDelta, displayAge, formatTimeShort } from '../lib/lifeClock'
import { readout, reset } from '../lib/copy'
import styles from './AgeReadout.module.css'

export interface AgeReadoutProps {
  exploreAge: number
  currentAge: number
  /** Delta 문구를 보일지 (탐색 중에만). 아니면 "현재". */
  showDelta: boolean
  /** 상단 나이 숫자를 1.5초 길게 누르면 호출 (전체 초기화) */
  onLongPress: () => void
}

const LONG_PRESS_MS = 1500

export function AgeReadout({ exploreAge, currentAge, showDelta, onLongPress }: AgeReadoutProps) {
  const delta = computeDelta(exploreAge, currentAge)
  const timer = useRef<number | null>(null)

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const start = useCallback(() => {
    cancel()
    timer.current = window.setTimeout(() => {
      timer.current = null
      onLongPress()
    }, LONG_PRESS_MS)
  }, [cancel, onLongPress])

  useEffect(() => cancel, [cancel])

  return (
    <div className={styles.readout} aria-live="polite">
      <div
        className={`${styles.age} tabular`}
        title={reset.hint}
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onPointerLeave={cancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        {readout.ageTime(displayAge(exploreAge), formatTimeShort(ageToMinutes(exploreAge)))}
      </div>
      <div className={`${styles.delta} tabular`}>{(showDelta && delta.label) || readout.now}</div>
    </div>
  )
}
