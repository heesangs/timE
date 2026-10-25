export type Reaction = 'rushed' | 'justRight' | 'hopeful'
// 표시 문구: rushed=조금 조급해요, justRight=딱 좋은 속도예요, hopeful=앞으로가 기대돼요

export type TraceKind = 'past' | 'future'

export interface Trace {
  id: string // crypto.randomUUID()
  age: number // 소수 1자리 (예: 34.2)
  kind: TraceKind
  text: string // 1~20자
  createdAt: string // ISO 8601
}

export interface Reflection {
  before: Reaction | null // firstReaction (건너뛰면 null)
  after: Reaction
  createdAt: string
}

export interface AppData {
  version: 1
  birthDate: string // 'YYYY-MM-DD'
  firstReaction: Reaction | null
  firstReactionAskedAt: string | null
  traces: Trace[]
  reflections: Reflection[] // 세션마다 최대 1개 추가
}

// 런타임 상태 (저장 안 함)
export type Phase = 'ONBOARDING' | 'NOW' | 'SCRUBBING' | 'PAST' | 'FUTURE' | 'REFLECTION'

export interface UiState {
  phase: Phase
  handAngle: number // 0~360
  hasExplored: boolean // 이번 세션에 과거/미래 방문 여부
  reflectionAskedThisSession: boolean
  highlightDotId: string | null
  /** 프로그램 회전(온보딩/귀환/스냅)에 쓰는 transition 길이. 드래그 중에는 무시된다. */
  handTransitionMs: number
}

/** 과거/미래/현재 판정 결과 */
export type Position = 'past' | 'future' | 'now'
