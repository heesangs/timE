import { useMemo, useState, type KeyboardEvent, type RefObject } from 'react'
import type { DotLayout } from '../lib/lifeClock'
import { arcPath, polarToXY } from '../lib/lifeClock'
import { readout } from '../lib/copy'
import { useBezelDrag } from '../hooks/useBezelDrag'
import styles from './LifeClock.module.css'

export const VIEW = 400
export const CX = 200
export const CY = 200
export const R = 150
export const DOT_RADIUS = R + 2
const HAND_LENGTH = R - 14
const TICK_COUNT = 24
const LABELS: ReadonlyArray<{ angle: number; text: string }> = [
  { angle: 0, text: '0' },
  { angle: 90, text: '6' },
  { angle: 180, text: '12' },
  { angle: 270, text: '18' },
]

export interface LifeClockProps {
  svgRef: RefObject<SVGSVGElement | null>
  currentAngle: number
  handAngle: number
  dots: readonly DotLayout[]
  isScrubbing: boolean
  /** 프로그램 회전 transition 길이(ms). 드래그 중에는 무시. */
  transitionMs: number
  /** NOW 상태에서 바늘 끝 펄스 */
  pulse: boolean
  /** 현재 ↔ 탐색 시점 사이 호를 그릴지 (탐색 중에만) */
  showArc: boolean
  highlightDotId: string | null
  /** DotFlight 중 숨겨 둘 점 */
  hiddenDotId: string | null
  /** 재방문 시 저장된 점들을 80ms 간격으로 순차 등장 */
  revealStagger: boolean
  ariaValueNow: number
  ariaValueText: string
  onScrubStart: (angle: number) => void
  onScrubMove: (angle: number) => void
  onScrubEnd: () => void
  /** 키보드 ← → : deltaYears (±1 / ±5) */
  onKeyStep: (deltaYears: number) => void
}

const GEOMETRY = { viewBoxSize: VIEW, cx: CX, cy: CY, r: R } as const

/** 툴팁 폭 추정. 한글/CJK는 넓게, 그 외는 좁게. */
function estimateTextWidth(text: string, fontSize: number): number {
  let w = 0
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    w += code > 0x2e80 ? fontSize : fontSize * 0.58
  }
  return w
}

export function LifeClock({
  svgRef,
  currentAngle,
  handAngle,
  dots,
  isScrubbing,
  transitionMs,
  pulse,
  showArc,
  highlightDotId,
  hiddenDotId,
  revealStagger,
  ariaValueNow,
  ariaValueText,
  onScrubStart,
  onScrubMove,
  onScrubEnd,
  onKeyStep,
}: LifeClockProps) {
  const handlers = useBezelDrag(svgRef, GEOMETRY, {
    onStart: onScrubStart,
    onMove: onScrubMove,
    onEnd: onScrubEnd,
  })

  // 마운트 시점에 있던 점만 순차 등장 대상이다.
  const [initialDotIds] = useState<ReadonlySet<string>>(() => new Set(dots.map((d) => d.id)))

  const ticks = useMemo(
    () =>
      Array.from({ length: TICK_COUNT }, (_, i) => {
        const angle = (i / TICK_COUNT) * 360
        const major = angle % 90 === 0
        const outer = polarToXY(CX, CY, R - 4, angle)
        const inner = polarToXY(CX, CY, R - (major ? 16 : 10), angle)
        return { key: i, major, x1: outer.x, y1: outer.y, x2: inner.x, y2: inner.y }
      }),
    [],
  )

  const arc = showArc ? arcPath(CX, CY, R - 6, currentAngle, handAngle) : ''
  const highlighted = highlightDotId ? dots.find((d) => d.id === highlightDotId) : undefined

  const handStyle = {
    transform: `rotate(${handAngle}deg)`,
    transformOrigin: `${CX}px ${CY}px`,
    transition: isScrubbing ? 'none' : `transform ${transitionMs}ms var(--ease-out)`,
  } as const

  const onKeyDown = (e: KeyboardEvent<SVGGElement>) => {
    const step = e.shiftKey ? 5 : 1
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      onKeyStep(step)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      onKeyStep(-step)
    }
  }

  return (
    <svg
      ref={svgRef}
      className={styles.svg}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      width="100%"
      height="100%"
      aria-hidden={false}
      {...handlers}
    >
      {/* 베젤 터치 링 (0.85R ~ 1.15R)의 은은한 힌트 */}
      <circle className={styles.bezelBand} cx={CX} cy={CY} r={R} strokeWidth={R * 0.3} />

      {/* 다이얼 */}
      <circle className={styles.dial} cx={CX} cy={CY} r={R} />
      {ticks.map((t) => (
        <line
          key={t.key}
          className={t.major ? styles.tickMajor : styles.tick}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
        />
      ))}
      {LABELS.map((l) => {
        const p = polarToXY(CX, CY, R - 30, l.angle)
        return (
          <text key={l.text} className={styles.label} x={p.x} y={p.y}>
            {l.text}
          </text>
        )
      })}

      {/* 현재 ↔ 탐색 시점 사이 호 */}
      {arc && <path className={styles.arc} d={arc} />}

      {/* 현재 마커: R+8 위치의 작은 삼각형 핀 */}
      <g className={styles.marker} style={{ transform: `rotate(${currentAngle}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
        <path d={`M ${CX} ${CY - R - 4} L ${CX - 5} ${CY - R - 14} L ${CX + 5} ${CY - R - 14} Z`} />
      </g>

      {/* 저장된 점들 */}
      {dots.map((d, i) => {
        const p = polarToXY(CX, CY, DOT_RADIUS + d.radiusOffset, d.angle)
        const isHighlight = d.id === highlightDotId
        const isHidden = d.id === hiddenDotId
        const staggered = revealStagger && initialDotIds.has(d.id)
        const className = [
          styles.dot,
          d.kind === 'past' ? styles.dotPast : styles.dotFuture,
          isHighlight ? styles.dotHighlight : '',
          isHidden ? styles.dotHidden : '',
          staggered ? styles.dotReveal : '',
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <g key={d.id} className={className} style={staggered ? { animationDelay: `${200 + i * 80}ms` } : undefined}>
            {isHighlight && <circle className={styles.dotGlow} cx={p.x} cy={p.y} r={9} />}
            <circle cx={p.x} cy={p.y} r={isHighlight ? 5 : 3} />
          </g>
        )
      })}

      {/* 바늘 */}
      <g
        className={styles.hand}
        style={handStyle}
        role="slider"
        tabIndex={0}
        aria-label={readout.ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={ariaValueNow}
        aria-valuetext={ariaValueText}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
      >
        <line x1={CX} y1={CY} x2={CX} y2={CY - HAND_LENGTH} />
        <circle className={styles.handTip} cx={CX} cy={CY - HAND_LENGTH} r={4} />
        {pulse && <circle className={styles.pulse} cx={CX} cy={CY - HAND_LENGTH} r={6} />}
      </g>
      <circle className={styles.hub} cx={CX} cy={CY} r={4} />

      {/* 툴팁 */}
      {highlighted && <Tooltip dot={highlighted} />}
    </svg>
  )
}

function Tooltip({ dot }: { dot: DotLayout }) {
  const fontSize = 13
  const padX = 10
  const h = 26
  const w = Math.min(VIEW - 16, estimateTextWidth(dot.text, fontSize) + padX * 2)
  const anchor = polarToXY(CX, CY, DOT_RADIUS + dot.radiusOffset + 28, dot.angle)
  const x = Math.min(VIEW - 8 - w / 2, Math.max(8 + w / 2, anchor.x))
  const y = Math.min(VIEW - 8 - h / 2, Math.max(8 + h / 2, anchor.y))
  return (
    <g className={styles.tooltip} aria-live="polite">
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} />
      <text x={x} y={y} fontSize={fontSize}>
        {dot.text}
      </text>
    </g>
  )
}
