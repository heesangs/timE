// 하루 중 분 → 배경색 선형 보간, 배경 밝기 → 전경색 테마.
import { MINUTES_PER_DAY } from './lifeClock'

export interface RGB {
  r: number
  g: number
  b: number
}

/** 키 포인트. 색상 값은 tokens.css의 --tone-* 와 같다. */
export const TONE_KEYPOINTS: ReadonlyArray<{ minute: number; hex: string }> = [
  { minute: 0, hex: '#0B1020' }, // 깊은 밤
  { minute: 360, hex: '#B8C4D6' }, // 새벽
  { minute: 720, hex: '#FFF4D6' }, // 정오
  { minute: 1080, hex: '#E8A06B' }, // 황혼
  { minute: 1440, hex: '#0B1020' }, // 밤
]

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** 분 값 → 배경색 (RGB). 키 포인트 사이는 선형 보간. */
export function toneAtMinutes(minutes: number): RGB {
  const m = Math.min(MINUTES_PER_DAY, Math.max(0, minutes))
  for (let i = 0; i < TONE_KEYPOINTS.length - 1; i++) {
    const a = TONE_KEYPOINTS[i]!
    const b = TONE_KEYPOINTS[i + 1]!
    if (m >= a.minute && m <= b.minute) {
      const t = (m - a.minute) / (b.minute - a.minute)
      const ca = hexToRgb(a.hex)
      const cb = hexToRgb(b.hex)
      return { r: lerp(ca.r, cb.r, t), g: lerp(ca.g, cb.g, t), b: lerp(ca.b, cb.b, t) }
    }
  }
  return hexToRgb(TONE_KEYPOINTS[0]!.hex)
}

export function toneHexAtMinutes(minutes: number): string {
  return rgbToHex(toneAtMinutes(minutes))
}

/** HSL 밝기(L), 0~1. */
export function lightness({ r, g, b }: RGB): number {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  return (max + min) / 2 / 255
}

export type Theme = 'light' | 'dark'

/** 배경 밝기 L이 50% 미만이면 밝은 글자(dark 테마). */
export function themeForBackground(rgb: RGB): Theme {
  return lightness(rgb) < 0.5 ? 'dark' : 'light'
}

export function themeAtMinutes(minutes: number): Theme {
  return themeForBackground(toneAtMinutes(minutes))
}
