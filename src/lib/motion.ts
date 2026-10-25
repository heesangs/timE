/** prefers-reduced-motion이면 true. 회전·비행·펄스는 즉시 완료로 대체한다. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 모션 축소 설정이면 0, 아니면 ms 그대로. */
export function motionMs(ms: number): number {
  return prefersReducedMotion() ? 0 : ms
}
