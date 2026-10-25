// UiState 전이. 섹션 4 상태 표가 유일한 기준이다.
import type { Phase, UiState } from './types'
import { angleToAge, clampAngle, classifyPosition, nextHandAngle } from './lib/lifeClock'

export const HAND_MS = {
  enter: 1200, // 온보딩/재방문: 00:00 → 현재
  return: 800, // [현재로 돌아가기]
  snap: 300, // 현재 ±0.5세 스냅
} as const

export type Action =
  /** ONBOARDING → NOW. 바늘은 angle(보통 0)에서 시작하고 이어서 SET_HAND로 현재까지 돈다. */
  | { type: 'ENTER_NOW'; angle: number; transitionMs: number }
  /** 프로그램 회전 (phase 유지). */
  | { type: 'SET_HAND'; angle: number }
  /** 베젤 터치 시작. NOW/PAST/FUTURE/REFLECTION → SCRUBBING. 바늘은 포인터 각도로. */
  | { type: 'SCRUB_START'; angle: number }
  /** 드래그 중. 360°↔0° 경계 점프는 클램프. */
  | { type: 'SCRUB_MOVE'; angle: number }
  /** 손 뗌. 위치에 따라 PAST/FUTURE/NOW(또는 REFLECTION). */
  | { type: 'SCRUB_END'; currentAngle: number }
  /** 키보드 ← →. SCRUBBING 상태로 들어가 바늘을 deltaAngle만큼 옮긴다. */
  | { type: 'KEY_STEP'; deltaAngle: number }
  /** [현재로 돌아가기]. PAST/FUTURE → REFLECTION 또는 NOW. */
  | { type: 'RETURN_TO_NOW'; currentAngle: number }
  /** 관점 질문 선택 완료 → NOW. */
  | { type: 'REFLECTION_DONE' }
  | { type: 'SET_HIGHLIGHT'; id: string | null }
  /** 전체 초기화 → ONBOARDING. */
  | { type: 'RESET' }

export function initialUiState(hasBirthDate: boolean): UiState {
  return {
    phase: hasBirthDate ? 'NOW' : 'ONBOARDING',
    handAngle: 0,
    hasExplored: false,
    reflectionAskedThisSession: false,
    highlightDotId: null,
    handTransitionMs: HAND_MS.enter,
  }
}

const SCRUBBABLE: readonly Phase[] = ['NOW', 'PAST', 'FUTURE', 'REFLECTION', 'SCRUBBING']

/** 현재로 돌아왔을 때 갈 상태. 탐색 후 첫 귀환이면 REFLECTION. */
function arriveAtNow(state: UiState, currentAngle: number, transitionMs: number): UiState {
  const askReflection = state.hasExplored && !state.reflectionAskedThisSession
  return {
    ...state,
    phase: askReflection ? 'REFLECTION' : 'NOW',
    handAngle: currentAngle,
    handTransitionMs: transitionMs,
    reflectionAskedThisSession: state.reflectionAskedThisSession || askReflection,
    highlightDotId: null,
  }
}

export function reducer(state: UiState, action: Action): UiState {
  switch (action.type) {
    case 'ENTER_NOW':
      if (state.phase !== 'ONBOARDING') return state
      return { ...state, phase: 'NOW', handAngle: clampAngle(action.angle), handTransitionMs: action.transitionMs }

    case 'SET_HAND':
      if (state.phase === 'SCRUBBING') return state
      return { ...state, handAngle: clampAngle(action.angle) }

    case 'SCRUB_START':
      if (!SCRUBBABLE.includes(state.phase)) return state
      return {
        ...state,
        phase: 'SCRUBBING',
        handAngle: clampAngle(action.angle),
        highlightDotId: null,
      }

    case 'SCRUB_MOVE':
      if (state.phase !== 'SCRUBBING') return state
      return { ...state, handAngle: nextHandAngle(state.handAngle, action.angle) }

    case 'KEY_STEP': {
      if (!SCRUBBABLE.includes(state.phase)) return state
      return { ...state, phase: 'SCRUBBING', handAngle: clampAngle(state.handAngle + action.deltaAngle) }
    }

    case 'SCRUB_END': {
      if (state.phase !== 'SCRUBBING') return state
      const position = classifyPosition(angleToAge(state.handAngle), angleToAge(action.currentAngle))
      if (position === 'now') return arriveAtNow(state, action.currentAngle, HAND_MS.snap)
      return {
        ...state,
        phase: position === 'past' ? 'PAST' : 'FUTURE',
        hasExplored: true,
      }
    }

    case 'RETURN_TO_NOW':
      if (state.phase !== 'PAST' && state.phase !== 'FUTURE') return state
      return arriveAtNow(state, action.currentAngle, HAND_MS.return)

    case 'REFLECTION_DONE':
      if (state.phase !== 'REFLECTION') return state
      return { ...state, phase: 'NOW' }

    case 'SET_HIGHLIGHT':
      if (state.highlightDotId === action.id) return state
      return { ...state, highlightDotId: action.id }

    case 'RESET':
      return initialUiState(false)

    default:
      return state
  }
}
