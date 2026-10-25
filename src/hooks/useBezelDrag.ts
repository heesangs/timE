import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { isInBezel, pointerAngle } from '../lib/lifeClock'

export interface BezelGeometry {
  /** viewBox 한 변 길이 (정사각) */
  viewBoxSize: number
  cx: number
  cy: number
  r: number
  inner?: number
  outer?: number
}

export interface BezelDragCallbacks {
  onStart: (angle: number) => void
  onMove: (angle: number) => void
  onEnd: () => void
}

export interface BezelDragHandlers {
  onPointerDown: (e: ReactPointerEvent<SVGSVGElement>) => void
  onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => void
  onPointerUp: (e: ReactPointerEvent<SVGSVGElement>) => void
  onPointerCancel: (e: ReactPointerEvent<SVGSVGElement>) => void
}

/**
 * Pointer Events 하나로 터치/마우스를 처리한다.
 * 베젤 링(0.85R~1.15R) 안에서 눌렀을 때만 드래그를 시작하고,
 * setPointerCapture로 링 밖으로 나가도 계속 추적한다.
 */
export function useBezelDrag(
  svgRef: RefObject<SVGSVGElement | null>,
  geometry: BezelGeometry,
  callbacks: BezelDragCallbacks,
): BezelDragHandlers {
  const activePointer = useRef<number | null>(null)
  const cbRef = useRef(callbacks)
  useEffect(() => {
    cbRef.current = callbacks
  }, [callbacks])

  const toViewBox = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const svg = svgRef.current
      if (!svg) return null
      const rect = svg.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return null
      const scale = geometry.viewBoxSize / rect.width
      return { x: (clientX - rect.left) * scale, y: (clientY - rect.top) * scale }
    },
    [svgRef, geometry.viewBoxSize],
  )

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (activePointer.current !== null) return
      if (e.button !== 0 && e.pointerType === 'mouse') return
      const p = toViewBox(e.clientX, e.clientY)
      if (!p) return
      const { cx, cy, r, inner, outer } = geometry
      if (!isInBezel(cx, cy, r, p.x, p.y, inner, outer)) return
      activePointer.current = e.pointerId
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // 일부 브라우저에서 캡처 실패는 무시
      }
      e.preventDefault()
      cbRef.current.onStart(pointerAngle(cx, cy, p.x, p.y))
    },
    [geometry, toViewBox],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (activePointer.current !== e.pointerId) return
      const p = toViewBox(e.clientX, e.clientY)
      if (!p) return
      e.preventDefault()
      cbRef.current.onMove(pointerAngle(geometry.cx, geometry.cy, p.x, p.y))
    },
    [geometry, toViewBox],
  )

  const finish = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== e.pointerId) return
    activePointer.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // 이미 해제된 경우 무시
    }
    cbRef.current.onEnd()
  }, [])

  return { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish }
}
