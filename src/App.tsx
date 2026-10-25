import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { AppData, Reaction, Trace } from './types'
import { HAND_MS, initialUiState, reducer } from './reducer'
import {
  ageFromBirthDate,
  ageToAngle,
  ageToMinutes,
  angleToAge,
  angleToMinutes,
  displayAge,
  formatAgeTimeLong,
  formatAriaValueText,
  formatTimeLong,
  layoutDots,
  nearestDot,
  polarToXY,
  roundAge,
} from './lib/lifeClock'
import { rgbToHex, themeForBackground, toneAtMinutes } from './lib/tone'
import { clearAppData, createAppData, loadAppData, saveAppData } from './lib/storage'
import { reset as resetCopy } from './lib/copy'
import { useDwell } from './hooks/useDwell'
import { useAnimatedAngle } from './hooks/useAnimatedAngle'
import { OnboardingForm } from './components/OnboardingForm'
import { CX, CY, DOT_RADIUS, LifeClock, VIEW } from './components/LifeClock'
import { AgeReadout } from './components/AgeReadout'
import { QuestionCard } from './components/QuestionCard'
import { ReflectionCard } from './components/ReflectionCard'
import { ReturnButton } from './components/ReturnButton'
import { GuideCaption } from './components/GuideCaption'
import { DotFlight, type Point } from './components/DotFlight'
import styles from './App.module.css'

const DWELL_MS = 500 // 손 뗀 뒤 질문 카드까지
const FIRST_REACTION_DELAY_MS = 2000 // 바늘이 멈춘 뒤 첫 반응 질문까지
const TOOLTIP_MS = 1500
const SUBMITTED_LINGER_MS = 1000 // "남겼어요" 표시 시간
const REFLECTION_LINGER_MS = 4000 // 비교 문구 표시 후 NOW로
const KEY_IDLE_MS = 500 // 키보드 조작이 멈춘 뒤 손 뗀 것으로 간주
const DEG_PER_YEAR = 3.6

interface Flight {
  traceId: string
  text: string
  fromRect: DOMRect
  to: Point
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // 비보안 컨텍스트(LAN 테스트 등) 대비
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export default function App() {
  const [data, setData] = useState<AppData | null>(() => loadAppData())
  const [ui, dispatch] = useReducer(reducer, data !== null, initialUiState)
  const svgRef = useRef<SVGSVGElement>(null)

  // 현재 나이는 저장하지 않고 매번 계산한다. 1분마다 갱신.
  const [today, setToday] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setToday(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const currentAge = data ? ageFromBirthDate(data.birthDate, today) : 0
  const currentAngle = ageToAngle(currentAge)
  const dots = useMemo(() => layoutDots(data?.traces ?? []), [data?.traces])

  const isScrubbing = ui.phase === 'SCRUBBING'
  const isExploring = ui.phase === 'PAST' || ui.phase === 'FUTURE'

  // 프로그램 회전 중에는 배경 톤과 상단 숫자가 바늘을 따라간다.
  const animatedAngle = useAnimatedAngle(ui.handAngle, isScrubbing ? 0 : ui.handTransitionMs)
  const displayAngle = isScrubbing ? ui.handAngle : animatedAngle
  const exploreAge = angleToAge(ui.handAngle)
  const displayedAge = angleToAge(displayAngle)

  const update = useCallback((fn: (d: AppData) => AppData) => {
    setData((prev) => {
      if (!prev) return prev
      const next = fn(prev)
      saveAppData(next)
      return next
    })
  }, [])

  // ---- 배경 톤 ----------------------------------------------------------
  useEffect(() => {
    const minutes = ui.phase === 'ONBOARDING' ? 0 : angleToMinutes(displayAngle)
    const rgb = toneAtMinutes(minutes)
    const root = document.documentElement
    root.style.setProperty('--color-bg', rgbToHex(rgb))
    root.dataset.theme = themeForBackground(rgb)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', rgbToHex(rgb))
  }, [displayAngle, ui.phase])

  // ---- 진입 연출: 바늘이 00:00에서 현재까지 회전 -------------------------
  const [sweepKey, setSweepKey] = useState(() => (data ? 1 : 0))
  const [revealStagger] = useState(() => data !== null)
  useEffect(() => {
    if (sweepKey === 0) return
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => dispatch({ type: 'SET_HAND', angle: currentAngle }))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
    // sweepKey가 바뀔 때만 실행한다. currentAngle은 그 시점의 값을 쓴다.
  }, [sweepKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const onBirthDateSubmit = (birthDate: string) => {
    const next = createAppData(birthDate)
    saveAppData(next)
    setData(next)
    dispatch({ type: 'ENTER_NOW', angle: 0, transitionMs: HAND_MS.enter })
    setSweepKey((k) => k + 1)
  }

  // ---- 베젤 드래그 / 키보드 --------------------------------------------
  const [cardStatus, setCardStatus] = useState<'open' | 'submitted' | 'hidden'>('open')
  const keyIdleTimer = useRef<number | null>(null)

  const onScrubStart = (angle: number) => {
    setCardStatus('open')
    dispatch({ type: 'SCRUB_START', angle })
  }
  const onScrubMove = (angle: number) => dispatch({ type: 'SCRUB_MOVE', angle })
  const onScrubEnd = () => dispatch({ type: 'SCRUB_END', currentAngle })

  const onKeyStep = (deltaYears: number) => {
    setCardStatus('open')
    dispatch({ type: 'KEY_STEP', deltaAngle: deltaYears * DEG_PER_YEAR })
    if (keyIdleTimer.current !== null) window.clearTimeout(keyIdleTimer.current)
    keyIdleTimer.current = window.setTimeout(() => {
      keyIdleTimer.current = null
      dispatch({ type: 'SCRUB_END', currentAngle })
    }, KEY_IDLE_MS)
  }
  useEffect(
    () => () => {
      if (keyIdleTimer.current !== null) window.clearTimeout(keyIdleTimer.current)
    },
    [],
  )

  // ---- 질문 카드 제출 → 점으로 날아가는 모션 ------------------------------
  const [flight, setFlight] = useState<Flight | null>(null)
  const flyingId = flight?.traceId ?? null

  // ---- 툴팁: 점을 ±3° 이내로 지나면 1.5초 -------------------------------
  const lastNearId = useRef<string | null>(null)
  const tooltipTimer = useRef<number | null>(null)
  useEffect(() => {
    const clearTimer = () => {
      if (tooltipTimer.current !== null) {
        window.clearTimeout(tooltipTimer.current)
        tooltipTimer.current = null
      }
    }
    if (!isScrubbing && !isExploring) {
      lastNearId.current = null
      clearTimer()
      return
    }
    // 날아가는 중인 점은 아직 툴팁 대상이 아니다.
    const near = nearestDot(
      ui.handAngle,
      flyingId ? dots.filter((d) => d.id !== flyingId) : dots,
    )
    if (!near) {
      lastNearId.current = null
      clearTimer()
      dispatch({ type: 'SET_HIGHLIGHT', id: null })
      return
    }
    if (near.id === lastNearId.current) return
    lastNearId.current = near.id
    clearTimer()
    dispatch({ type: 'SET_HIGHLIGHT', id: near.id })
    tooltipTimer.current = window.setTimeout(() => {
      tooltipTimer.current = null
      dispatch({ type: 'SET_HIGHLIGHT', id: null })
    }, TOOLTIP_MS)
  }, [ui.handAngle, isScrubbing, isExploring, dots, flyingId])

  // ---- 첫 반응 질문 (첫 방문, NOW에서 바늘이 멈춘 뒤 2초) -----------------
  const [firstReactionOpen, setFirstReactionOpen] = useState(false)
  const firstReactionPending = ui.phase === 'NOW' && data !== null && data.firstReactionAskedAt === null
  const firstReactionDelay = ui.handTransitionMs + FIRST_REACTION_DELAY_MS
  useEffect(() => {
    if (!firstReactionPending) return
    const id = window.setTimeout(() => {
      setFirstReactionOpen(true)
      update((d) => ({ ...d, firstReactionAskedAt: new Date().toISOString() }))
    }, firstReactionDelay)
    return () => window.clearTimeout(id)
  }, [firstReactionPending, firstReactionDelay, update])
  // 바늘을 잡으면(NOW를 벗어나면) 선택하지 않아도 사라진다.
  const showFirstReaction = firstReactionOpen && ui.phase === 'NOW'
  const onSelectFirstReaction = (r: Reaction) => {
    update((d) => ({ ...d, firstReaction: r }))
    setFirstReactionOpen(false)
  }

  // ---- 질문 카드 (PAST/FUTURE에서 0.5초 머문 뒤) --------------------------
  const questionReady = useDwell(isExploring, DWELL_MS)
  const submittedTimer = useRef<number | null>(null)

  const onSubmitTrace = (text: string, fromRect: DOMRect) => {
    if (!data || !isExploring) return
    const trace: Trace = {
      id: newId(),
      age: roundAge(exploreAge),
      kind: ui.phase === 'PAST' ? 'past' : 'future',
      text,
      createdAt: new Date().toISOString(),
    }
    const nextTraces = [...data.traces, trace]
    update((d) => ({ ...d, traces: [...d.traces, trace] }))

    // 점이 박힐 화면 좌표
    const layout = layoutDots(nextTraces).find((d) => d.id === trace.id)
    const svg = svgRef.current
    if (layout && svg) {
      const rect = svg.getBoundingClientRect()
      const scale = rect.width / VIEW
      const p = polarToXY(CX, CY, DOT_RADIUS + layout.radiusOffset, layout.angle)
      setFlight({ traceId: trace.id, text, fromRect, to: { x: rect.left + p.x * scale, y: rect.top + p.y * scale } })
    }

    setCardStatus('submitted')
    if (submittedTimer.current !== null) window.clearTimeout(submittedTimer.current)
    submittedTimer.current = window.setTimeout(() => {
      submittedTimer.current = null
      setCardStatus('hidden')
    }, SUBMITTED_LINGER_MS)
  }
  useEffect(
    () => () => {
      if (submittedTimer.current !== null) window.clearTimeout(submittedTimer.current)
    },
    [],
  )

  // ---- 귀환과 관점 질문 ---------------------------------------------------
  const onReturn = () => dispatch({ type: 'RETURN_TO_NOW', currentAngle })
  const reflectionReady = useDwell(ui.phase === 'REFLECTION', ui.handTransitionMs + 100)
  const reflectionTimer = useRef<number | null>(null)
  useEffect(() => {
    if (ui.phase !== 'REFLECTION' && reflectionTimer.current !== null) {
      window.clearTimeout(reflectionTimer.current)
      reflectionTimer.current = null
    }
  }, [ui.phase])
  const onSelectReflection = (after: Reaction) => {
    update((d) => ({
      ...d,
      reflections: [...d.reflections, { before: d.firstReaction, after, createdAt: new Date().toISOString() }],
    }))
    reflectionTimer.current = window.setTimeout(() => {
      reflectionTimer.current = null
      dispatch({ type: 'REFLECTION_DONE' })
    }, REFLECTION_LINGER_MS)
  }

  // ---- 전체 초기화 (상단 나이 길게 누르기) --------------------------------
  const onReset = () => {
    if (!window.confirm(resetCopy.confirm)) return
    clearAppData()
    setData(null)
    setFlight(null)
    setCardStatus('open')
    dispatch({ type: 'RESET' })
  }

  // ---- 렌더 ---------------------------------------------------------------
  if (ui.phase === 'ONBOARDING' || !data) {
    return (
      <main className={styles.app}>
        <div className={styles.top} />
        <div className={styles.onboardingCenter}>
          <OnboardingForm onSubmit={onBirthDateSubmit} />
        </div>
        <div className={styles.bottom} />
      </main>
    )
  }

  const timeLongNow = formatTimeLong(ageToMinutes(currentAge))

  let bottom: React.ReactNode = null
  switch (ui.phase) {
    case 'NOW':
      bottom = showFirstReaction ? (
        <GuideCaption variant="firstReaction" onSelectReaction={onSelectFirstReaction} />
      ) : (
        <GuideCaption variant="guide" />
      )
      break
    case 'PAST':
    case 'FUTURE':
      bottom = (
        <>
          <ReturnButton visible={ui.hasExplored} onClick={onReturn} />
          {questionReady && cardStatus !== 'hidden' && (
            <QuestionCard
              key={`${ui.phase}-${ui.handAngle}`}
              mode={ui.phase === 'PAST' ? 'past' : 'future'}
              ageTimeLong={formatAgeTimeLong(exploreAge)}
              submitted={cardStatus === 'submitted'}
              onSubmit={onSubmitTrace}
            />
          )}
        </>
      )
      break
    case 'REFLECTION':
      bottom = reflectionReady ? (
        <ReflectionCard firstReaction={data.firstReaction} timeLong={timeLongNow} onSelect={onSelectReflection} />
      ) : null
      break
    default:
      bottom = null
  }

  return (
    <main className={styles.app}>
      <div className={styles.top}>
        <AgeReadout
          exploreAge={displayedAge}
          currentAge={currentAge}
          showDelta={isScrubbing || isExploring}
          onLongPress={onReset}
        />
      </div>
      <div className={styles.center}>
        <div className={styles.clock}>
          <LifeClock
            svgRef={svgRef}
            currentAngle={currentAngle}
            handAngle={ui.handAngle}
            dots={dots}
            isScrubbing={isScrubbing}
            transitionMs={ui.handTransitionMs}
            pulse={ui.phase === 'NOW'}
            showArc={isScrubbing || isExploring}
            highlightDotId={ui.highlightDotId}
            hiddenDotId={flyingId}
            revealStagger={revealStagger}
            ariaValueNow={displayAge(exploreAge)}
            ariaValueText={formatAriaValueText(exploreAge)}
            onScrubStart={onScrubStart}
            onScrubMove={onScrubMove}
            onScrubEnd={onScrubEnd}
            onKeyStep={onKeyStep}
          />
        </div>
      </div>
      <div className={styles.bottom}>{bottom}</div>
      {flight && (
        <DotFlight
          key={flight.traceId}
          text={flight.text}
          fromRect={flight.fromRect}
          to={flight.to}
          onDone={() => setFlight(null)}
        />
      )}
    </main>
  )
}
