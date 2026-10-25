import { describe, expect, it } from 'vitest'
import {
  ageFromBirthDate,
  ageToAngle,
  ageToMinutes,
  angleToAge,
  arcPath,
  classifyPosition,
  clampAngle,
  computeDelta,
  formatAgeTime,
  formatAgeTimeLong,
  formatAriaValueText,
  formatTimeLong,
  formatTimeShort,
  isInBezel,
  layoutDots,
  nearestDot,
  nextHandAngle,
  normalizeAngle,
  parseBirthDate,
  pointerAngle,
  polarToXY,
  roundAge,
} from './lifeClock'
import { parseAppData, STORAGE_KEY } from './storage'
import { themeAtMinutes, toneHexAtMinutes } from './tone'
import type { Trace } from '../types'

describe('나이 ↔ 분 ↔ 각도', () => {
  it('50세 → 720분 → 180°', () => {
    expect(ageToMinutes(50)).toBe(720)
    expect(ageToAngle(50)).toBe(180)
    expect(angleToAge(180)).toBe(50)
  })

  it('25세 → 06:00, 0세 → 0°, 100세 → 360°', () => {
    expect(formatTimeShort(ageToMinutes(25))).toBe('오전 6:00')
    expect(ageToAngle(0)).toBe(0)
    expect(ageToAngle(100)).toBe(360)
    expect(ageToAngle(120)).toBe(360)
  })

  it('34세 → 489.6분 → 오전 8:09', () => {
    expect(ageToMinutes(34)).toBeCloseTo(489.6, 5)
    expect(formatTimeShort(ageToMinutes(34))).toBe('오전 8:09')
    expect(formatTimeLong(ageToMinutes(34))).toBe('오전 8시 09분')
    expect(formatAgeTime(34.2)).toBe('34세 · 오전 8:12')
    expect(formatAgeTimeLong(34)).toBe('34세 (오전 8시 09분)')
    expect(formatAriaValueText(34)).toBe('34세, 오전 8시 09분')
  })

  it('65세 → 오후 3시 36분, 50세 → 오후 12시 00분', () => {
    expect(formatTimeLong(ageToMinutes(65))).toBe('오후 3시 36분')
    expect(formatTimeLong(ageToMinutes(50))).toBe('오후 12시 00분')
    expect(formatTimeShort(ageToMinutes(0))).toBe('오전 12:00')
  })

  it('생년월일 → 소수 나이', () => {
    const today = new Date(2026, 9, 25)
    expect(ageFromBirthDate('1976-10-25', today)).toBeCloseTo(50, 1)
    expect(ageFromBirthDate('2026-10-25', today)).toBe(0)
    expect(ageFromBirthDate('2030-01-01', today)).toBe(0)
    expect(parseBirthDate('2026-02-30')).toBeNull()
    expect(parseBirthDate('not-a-date')).toBeNull()
  })

  it('소수 1자리 반올림', () => {
    expect(roundAge(34.26)).toBe(34.3)
    expect(roundAge(-1)).toBe(0)
  })
})

describe('각도 경계', () => {
  it('0°~360° 클램프, 정규화', () => {
    expect(clampAngle(-10)).toBe(0)
    expect(clampAngle(370)).toBe(360)
    expect(clampAngle(Number.NaN)).toBe(0)
    expect(normalizeAngle(-90)).toBe(270)
    expect(normalizeAngle(450)).toBe(90)
  })

  it('포인터 각도: 12시=0°, 3시=90°, 6시=180°, 9시=270°', () => {
    expect(pointerAngle(200, 200, 200, 50)).toBeCloseTo(0)
    expect(pointerAngle(200, 200, 350, 200)).toBeCloseTo(90)
    expect(pointerAngle(200, 200, 200, 350)).toBeCloseTo(180)
    expect(pointerAngle(200, 200, 50, 200)).toBeCloseTo(270)
  })

  it('360°→0° 경계를 넘는 점프는 끝으로 클램프', () => {
    expect(nextHandAngle(355, 2)).toBe(360) // 시계방향으로 넘어감 → 100세에서 멈춤
    expect(nextHandAngle(360, 5)).toBe(360)
    expect(nextHandAngle(3, 358)).toBe(0) // 반시계로 넘어감 → 0세에서 멈춤
    expect(nextHandAngle(0, 350)).toBe(0)
    expect(nextHandAngle(100, 120)).toBe(120)
    expect(nextHandAngle(180, 10)).toBe(10)
  })

  it('베젤 링 판정 (0.85R ~ 1.15R)', () => {
    expect(isInBezel(200, 200, 150, 200, 50)).toBe(true) // d = 150
    expect(isInBezel(200, 200, 150, 200, 200)).toBe(false) // 중앙
    expect(isInBezel(200, 200, 150, 200, 20)).toBe(false) // d = 180 > 172.5
    expect(isInBezel(200, 200, 150, 200, 70)).toBe(true) // d = 130 > 127.5
  })

  it('극좌표와 호 path', () => {
    const p = polarToXY(200, 200, 150, 90)
    expect(p.x).toBeCloseTo(350)
    expect(p.y).toBeCloseTo(200)
    expect(arcPath(200, 200, 144, 180, 180)).toBe('')
    expect(arcPath(200, 200, 144, 180, 90)).toMatch(/^M .* A 144 144 0 0 1 /)
    expect(arcPath(200, 200, 144, 10, 300)).toMatch(/ A 144 144 0 1 1 /)
  })
})

describe('과거/미래/현재 판정', () => {
  it('±0.5세 안은 현재', () => {
    expect(classifyPosition(49.6, 50)).toBe('now')
    expect(classifyPosition(50.4, 50)).toBe('now')
    expect(classifyPosition(49.4, 50)).toBe('past')
    expect(classifyPosition(50.6, 50)).toBe('future')
  })

  it('Delta 문구', () => {
    expect(computeDelta(30, 50).label).toBe('현재보다 20년 전 (-4시간 48분)')
    expect(computeDelta(65, 50).label).toBe('현재보다 15년 후 (+3시간 36분)')
    expect(computeDelta(50.2, 50).label).toBe('')
    expect(computeDelta(50.2, 50).position).toBe('now')
    expect(computeDelta(49, 50).label).toBe('현재보다 1년 전 (-14분)')
  })
})

describe('점(Trace)', () => {
  const t = (id: string, age: number, createdAt: string, kind: Trace['kind'] = 'past'): Trace => ({
    id,
    age,
    kind,
    text: id,
    createdAt,
  })

  it('겹치는 점은 4px씩 바깥으로', () => {
    const dots = layoutDots([
      t('b', 34.2, '2026-01-02T00:00:00Z'),
      t('a', 34.0, '2026-01-01T00:00:00Z'),
      t('c', 60, '2026-01-03T00:00:00Z', 'future'),
      t('d', 34.4, '2026-01-04T00:00:00Z'),
    ])
    expect(dots.map((d) => d.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(dots.map((d) => d.radiusOffset)).toEqual([0, 4, 0, 8])
    expect(dots[2]!.angle).toBe(216)
  })

  it('±3° 이내 가장 가까운 점', () => {
    const dots = [
      { id: 'x', angle: 100 },
      { id: 'y', angle: 104 },
      { id: 'z', angle: 110 },
    ]
    expect(nearestDot(102.5, dots)?.id).toBe('y')
    expect(nearestDot(101, dots)?.id).toBe('x')
    expect(nearestDot(108, dots)?.id).toBe('z')
    expect(nearestDot(120, dots)).toBeNull()
  })
})

describe('배경 톤', () => {
  it('키 포인트 값과 보간', () => {
    expect(toneHexAtMinutes(0)).toBe('#0b1020')
    expect(toneHexAtMinutes(360)).toBe('#b8c4d6')
    expect(toneHexAtMinutes(720)).toBe('#fff4d6')
    expect(toneHexAtMinutes(1080)).toBe('#e8a06b')
    expect(toneHexAtMinutes(1440)).toBe('#0b1020')
    // 03:00 은 깊은 밤과 새벽의 중간
    expect(toneHexAtMinutes(180)).toBe('#626a7b')
  })

  it('어두우면 dark 테마, 밝으면 light 테마', () => {
    expect(themeAtMinutes(0)).toBe('dark')
    expect(themeAtMinutes(120)).toBe('dark')
    expect(themeAtMinutes(360)).toBe('light')
    expect(themeAtMinutes(720)).toBe('light')
    expect(themeAtMinutes(1080)).toBe('light')
    expect(themeAtMinutes(1320)).toBe('dark')
    expect(themeAtMinutes(1440)).toBe('dark')
  })
})

describe('저장 데이터 파싱', () => {
  it('version 불일치 / 파싱 실패 → null', () => {
    expect(STORAGE_KEY).toBe('lifeclock:v1')
    expect(parseAppData(null)).toBeNull()
    expect(parseAppData('{')).toBeNull()
    expect(parseAppData(JSON.stringify({ version: 2, birthDate: '1990-01-01' }))).toBeNull()
    expect(parseAppData(JSON.stringify({ version: 1 }))).toBeNull()
  })

  it('정상 데이터는 누락 필드를 기본값으로 채운다', () => {
    const data = parseAppData(JSON.stringify({ version: 1, birthDate: '1990-01-01', traces: [{ bad: true }] }))
    expect(data).toEqual({
      version: 1,
      birthDate: '1990-01-01',
      firstReaction: null,
      firstReactionAskedAt: null,
      traces: [],
      reflections: [],
    })
  })
})
