// 나이 ↔ 시각 ↔ 각도 변환과 판정 규칙. 전부 순수 함수.
import type { Position, Trace } from '../types'
import { readout } from './copy'

export const LIFE_SPAN_YEARS = 100
export const MINUTES_PER_DAY = 1440
export const DAY_MS = 86_400_000
export const YEAR_DAYS = 365.25
/** 현재 마커 ±0.5세는 '현재'로 본다. */
export const NOW_SNAP_YEARS = 0.5
/** 바늘과 점의 각도 차이가 이 값 이내면 툴팁을 띄운다. */
export const DOT_TOOLTIP_DEG = 3
/** 같은 나이(±0.5세)의 점은 이 만큼 바깥으로 밀어 표시한다. */
export const DOT_OVERLAP_OFFSET = 4

// ---- 나이 ----------------------------------------------------------------

/** 'YYYY-MM-DD' → 로컬 자정 Date. 잘못된 형식이면 null. */
export function parseBirthDate(birthDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const date = new Date(y, mo - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return date
}

/** 소수 나이. (today - birthDate) / 365.25일. 0 미만은 0으로. */
export function ageFromBirthDate(birthDate: string, today: Date = new Date()): number {
  const birth = parseBirthDate(birthDate)
  if (!birth) return 0
  const days = (today.getTime() - birth.getTime()) / DAY_MS
  return Math.max(0, days / YEAR_DAYS)
}

export function clampAge(age: number): number {
  return Math.min(LIFE_SPAN_YEARS, Math.max(0, age))
}

// ---- 변환 ----------------------------------------------------------------

export function ageToMinutes(age: number): number {
  return (clampAge(age) / LIFE_SPAN_YEARS) * MINUTES_PER_DAY
}

export function minutesToAge(minutes: number): number {
  return (minutes / MINUTES_PER_DAY) * LIFE_SPAN_YEARS
}

/** 12시 방향 = 0°, 시계방향. 0~360. */
export function ageToAngle(age: number): number {
  return (clampAge(age) / LIFE_SPAN_YEARS) * 360
}

export function angleToAge(angle: number): number {
  return (clampAngle(angle) / 360) * LIFE_SPAN_YEARS
}

export function angleToMinutes(angle: number): number {
  return ageToMinutes(angleToAge(angle))
}

/** 0°~360° 범위로 클램프 (100세 이후로는 돌릴 수 없다). */
export function clampAngle(angle: number): number {
  if (Number.isNaN(angle)) return 0
  return Math.min(360, Math.max(0, angle))
}

/** 임의 각도를 [0, 360) 로 정규화. */
export function normalizeAngle(angle: number): number {
  const a = angle % 360
  return a < 0 ? a + 360 : a
}

/** 포인터 좌표 → 12시 기준 시계방향 각도 [0, 360). */
export function pointerAngle(cx: number, cy: number, x: number, y: number): number {
  const rad = Math.atan2(y - cy, x - cx)
  return normalizeAngle((rad * 180) / Math.PI + 90)
}

/**
 * 드래그 중 다음 바늘 각도. 직전 각도와 180° 이상 차이 나는 점프는
 * 360°↔0° 경계를 넘은 것이므로 가까운 쪽 끝(0 또는 360)으로 클램프한다.
 */
export function nextHandAngle(prev: number, raw: number): number {
  const next = normalizeAngle(raw)
  const diff = next - prev
  if (Math.abs(diff) >= 180) {
    return diff < 0 ? 360 : 0
  }
  return clampAngle(next)
}

/** 포인터가 베젤 링(0.85R ~ 1.15R) 안에 있는지. */
export function isInBezel(
  cx: number,
  cy: number,
  r: number,
  x: number,
  y: number,
  inner = 0.85,
  outer = 1.15,
): boolean {
  const d = Math.hypot(x - cx, y - cy)
  return d >= r * inner && d <= r * outer
}

// ---- 표시 ----------------------------------------------------------------

export interface TimeParts {
  hour24: number // 0~24
  minute: number // 0~59
  period: string // 오전/오후
  hour12: number // 1~12
  mm: string // '09'
}

/** 하루 중 분 → 시:분. 분은 floor (34세 = 489.6분 → 8:09). */
export function minutesToTimeParts(minutes: number): TimeParts {
  const total = Math.min(MINUTES_PER_DAY, Math.max(0, minutes))
  const hour24 = Math.floor(total / 60)
  const minute = Math.floor(total - hour24 * 60)
  // 24:00은 자정으로 표기한다.
  const h = hour24 % 24
  const period = h < 12 ? readout.am : readout.pm
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return { hour24, minute, period, hour12, mm: String(minute).padStart(2, '0') }
}

/** "오전 8:09" */
export function formatTimeShort(minutes: number): string {
  const t = minutesToTimeParts(minutes)
  return readout.timeShort(t.period, t.hour12, t.mm)
}

/** "오전 8시 09분" */
export function formatTimeLong(minutes: number): string {
  const t = minutesToTimeParts(minutes)
  return readout.timeLong(t.period, t.hour12, t.mm)
}

/** 표시용 정수 나이. */
export function displayAge(age: number): number {
  return Math.floor(clampAge(age))
}

/** "34세 · 오전 8:09" */
export function formatAgeTime(age: number): string {
  return readout.ageTime(displayAge(age), formatTimeShort(ageToMinutes(age)))
}

/** "34세 (오전 8시 09분)" */
export function formatAgeTimeLong(age: number): string {
  return readout.ageTimeLong(displayAge(age), formatTimeLong(ageToMinutes(age)))
}

/** aria-valuetext: "34세, 오전 8시 09분" */
export function formatAriaValueText(age: number): string {
  return readout.ariaValueText(displayAge(age), formatTimeLong(ageToMinutes(age)))
}

// ---- 판정 ----------------------------------------------------------------

export function classifyPosition(exploreAge: number, currentAge: number): Position {
  if (exploreAge < currentAge - NOW_SNAP_YEARS) return 'past'
  if (exploreAge > currentAge + NOW_SNAP_YEARS) return 'future'
  return 'now'
}

export interface Delta {
  position: Position
  years: number // 반올림한 정수 (절대값)
  minutes: number // 절대값, 소수
  label: string // '' (현재) 또는 "현재보다 20년 전 (-4시간 48분)"
}

export function computeDelta(exploreAge: number, currentAge: number): Delta {
  const position = classifyPosition(exploreAge, currentAge)
  const diffYears = exploreAge - currentAge
  const absMin = (Math.abs(diffYears) / LIFE_SPAN_YEARS) * MINUTES_PER_DAY
  const years = Math.round(Math.abs(diffYears))
  let h = Math.floor(absMin / 60)
  let m = Math.round(absMin - h * 60)
  if (m === 60) {
    h += 1
    m = 0
  }
  const hm = readout.hoursMinutes(h, m)
  let label = ''
  if (position === 'past') label = readout.deltaPast(years, hm)
  else if (position === 'future') label = readout.deltaFuture(years, hm)
  return { position, years, minutes: absMin, label }
}

// ---- 점(Trace) -----------------------------------------------------------

export interface DotLayout {
  id: string
  angle: number
  /** 겹침으로 바깥으로 밀린 px (viewBox 단위) */
  radiusOffset: number
  kind: Trace['kind']
  text: string
}

/** 저장 순서대로 배치하고, 같은 나이(±0.5세)의 이전 점 개수만큼 바깥으로 민다. */
export function layoutDots(traces: readonly Trace[]): DotLayout[] {
  const sorted = [...traces].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return sorted.map((t, i) => {
    let overlaps = 0
    for (let j = 0; j < i; j++) {
      const prev = sorted[j]
      if (prev && Math.abs(prev.age - t.age) <= NOW_SNAP_YEARS) overlaps += 1
    }
    return {
      id: t.id,
      angle: ageToAngle(t.age),
      radiusOffset: overlaps * DOT_OVERLAP_OFFSET,
      kind: t.kind,
      text: t.text,
    }
  })
}

/** 바늘 각도와 ±DOT_TOOLTIP_DEG 이내인 점 중 가장 가까운 하나. 없으면 null. */
export function nearestDot<T extends { angle: number }>(
  handAngle: number,
  dots: readonly T[],
  withinDeg: number = DOT_TOOLTIP_DEG,
): T | null {
  let best: T | null = null
  let bestDiff = Infinity
  for (const dot of dots) {
    const diff = Math.abs(dot.angle - handAngle)
    if (diff <= withinDeg && diff < bestDiff) {
      best = dot
      bestDiff = diff
    }
  }
  return best
}

/** 소수 1자리로 반올림한 나이 (Trace.age 저장용). */
export function roundAge(age: number): number {
  return Math.round(clampAge(age) * 10) / 10
}

/** 각도 위의 점 좌표 (12시 = 0°, 시계방향). */
export function polarToXY(cx: number, cy: number, r: number, angle: number): { x: number; y: number } {
  const rad = ((angle - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

/** 현재 각도 → 바늘 각도 호(Arc)의 SVG path d. 같은 각도면 ''. */
export function arcPath(cx: number, cy: number, r: number, fromAngle: number, toAngle: number): string {
  const a = Math.min(fromAngle, toAngle)
  const b = Math.max(fromAngle, toAngle)
  if (b - a < 0.01) return ''
  const start = polarToXY(cx, cy, r, a)
  const end = polarToXY(cx, cy, r, b)
  const largeArc = b - a > 180 ? 1 : 0
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}
