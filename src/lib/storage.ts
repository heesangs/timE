// localStorage 읽기/쓰기는 이 파일에서만 한다.
import type { AppData } from '../types'

export const STORAGE_KEY = 'lifeclock:v1'
export const DATA_VERSION = 1 as const

export function createAppData(birthDate: string): AppData {
  return {
    version: DATA_VERSION,
    birthDate,
    firstReaction: null,
    firstReactionAskedAt: null,
    traces: [],
    reflections: [],
  }
}

function getStore(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

/** version 불일치 또는 파싱 실패 시 null (데이터를 버리고 온보딩으로). */
export function parseAppData(raw: string | null): AppData | null {
  if (!raw) return null
  try {
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object') return null
    const d = data as Record<string, unknown>
    if (d.version !== DATA_VERSION) return null
    if (typeof d.birthDate !== 'string') return null
    return {
      version: DATA_VERSION,
      birthDate: d.birthDate,
      firstReaction: isReaction(d.firstReaction) ? d.firstReaction : null,
      firstReactionAskedAt: typeof d.firstReactionAskedAt === 'string' ? d.firstReactionAskedAt : null,
      traces: Array.isArray(d.traces) ? d.traces.filter(isTrace) : [],
      reflections: Array.isArray(d.reflections) ? d.reflections.filter(isReflection) : [],
    }
  } catch {
    return null
  }
}

function isReaction(v: unknown): v is AppData['firstReaction'] & string {
  return v === 'rushed' || v === 'justRight' || v === 'hopeful'
}

function isTrace(v: unknown): v is AppData['traces'][number] {
  if (!v || typeof v !== 'object') return false
  const t = v as Record<string, unknown>
  return (
    typeof t.id === 'string' &&
    typeof t.age === 'number' &&
    (t.kind === 'past' || t.kind === 'future') &&
    typeof t.text === 'string' &&
    typeof t.createdAt === 'string'
  )
}

function isReflection(v: unknown): v is AppData['reflections'][number] {
  if (!v || typeof v !== 'object') return false
  const r = v as Record<string, unknown>
  return (r.before === null || isReaction(r.before)) && isReaction(r.after) && typeof r.createdAt === 'string'
}

export function loadAppData(): AppData | null {
  const store = getStore()
  if (!store) return null
  const data = parseAppData(store.getItem(STORAGE_KEY))
  if (!data) store.removeItem(STORAGE_KEY)
  return data
}

export function saveAppData(data: AppData): void {
  const store = getStore()
  if (!store) return
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // 저장 공간 부족 등은 조용히 무시한다 (기록은 선택).
  }
}

export function clearAppData(): void {
  getStore()?.removeItem(STORAGE_KEY)
}
