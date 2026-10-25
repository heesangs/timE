// 모든 한국어 문구를 여기에 모은다. 컴포넌트에는 문구를 하드코딩하지 않는다.
import type { Reaction, TraceKind } from '../types'

export const APP_NAME = '인생 시계'

export const onboarding = {
  title: '인생 시계',
  lead: '인생 100년을 하루 24시간으로 보면, 지금은 몇 시일까요?',
  birthDateLabel: '생년월일',
  submit: '시작',
  errorRequired: '생년월일을 입력해 주세요.',
  errorFuture: '오늘보다 이전 날짜여야 해요.',
  errorTooOld: '100세 미만만 표시할 수 있어요.',
} as const

export const guide = {
  caption: '시곗바늘을 돌려 지나온 시간과 다가올 시간을 둘러보세요',
  firstReactionQuestion: '이 시각을 보니 어떤 생각이 드나요?',
} as const

export const reactionLabels: Record<Reaction, string> = {
  rushed: '조금 조급해요',
  justRight: '딱 좋은 속도예요',
  hopeful: '앞으로가 기대돼요',
}

export const reactionOrder: Reaction[] = ['rushed', 'justRight', 'hopeful']

export const readout = {
  /** 상단 표시: "34세 · 오전 8:09" */
  ageTime: (age: number, time: string) => `${age}세 · ${time}`,
  /** 긴 형식: "34세 (오전 8시 09분)" */
  ageTimeLong: (age: number, timeLong: string) => `${age}세 (${timeLong})`,
  /** aria-valuetext: "34세, 오전 8시 09분" */
  ariaValueText: (age: number, timeLong: string) => `${age}세, ${timeLong}`,
  ariaLabel: '인생 시계 바늘',
  now: '현재',
  deltaPast: (years: number, hm: string) => `현재보다 ${years}년 전 (-${hm})`,
  deltaFuture: (years: number, hm: string) => `현재보다 ${years}년 후 (+${hm})`,
  hoursMinutes: (h: number, m: number) => (h > 0 ? `${h}시간 ${m}분` : `${m}분`),
  am: '오전',
  pm: '오후',
  /** "오전 8시 09분" */
  timeLong: (period: string, h: number, mm: string) => `${period} ${h}시 ${mm}분`,
  /** "오전 8:09" */
  timeShort: (period: string, h: number, mm: string) => `${period} ${h}:${mm}`,
} as const

export const question: Record<
  TraceKind,
  { prompt: (ageTimeLong: string) => string; chips: readonly string[] }
> = {
  past: {
    prompt: (ageTimeLong) => `${ageTimeLong}, 그때 기억나는 순간이나 단어가 있나요?`,
    chips: ['#치열했던', '#설렜던', '#방황하던', '#평온했던'],
  },
  future: {
    prompt: (ageTimeLong) => `${ageTimeLong}, 이 시간의 나에게 바라는 모습을 한 단어로 남겨볼까요?`,
    chips: ['#여유로운', '#건강한', '#새로운도전', '#함께하는'],
  },
}

export const card = {
  placeholder: '한 단어도 괜찮아요',
  submit: '남기기',
  submitted: '남겼어요',
  maxLength: 20,
} as const

export const reflection = {
  question: (timeLong: string) => `과거와 미래를 다녀온 지금, ${timeLong}은 어떻게 느껴지나요?`,
  compare: (before: string, after: string) => `처음: ${before} → 지금: ${after}`,
  same: '처음과 같아요',
  onlyNow: (after: string) => `지금: ${after}`,
} as const

/** 첫 반응과 지금의 비교 문구. 어떤 해석 문구도 덧붙이지 않는다. */
export function compareLabel(before: Reaction | null, after: Reaction): string {
  if (before === null) return reflection.onlyNow(reactionLabels[after])
  if (before === after) return reflection.same
  return reflection.compare(reactionLabels[before], reactionLabels[after])
}

export const returnButton = {
  label: '현재로 돌아가기',
} as const

export const reset = {
  confirm: '모든 기록을 지우고 처음부터 시작할까요?',
  hint: '나이를 길게 누르면 전체 초기화',
} as const
