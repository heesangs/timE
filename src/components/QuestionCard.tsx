import { useRef, useState, type FormEvent } from 'react'
import type { TraceKind } from '../types'
import { card as cardCopy, question } from '../lib/copy'
import card from './Card.module.css'

export interface QuestionCardProps {
  mode: TraceKind
  /** "34세 (오전 8시 09분)" */
  ageTimeLong: string
  /** 제출됨: "남겼어요" 한 줄만 보여준다 */
  submitted: boolean
  /** 제출. fromRect는 DotFlight의 출발 위치(인풋의 화면 좌표). */
  onSubmit: (text: string, fromRect: DOMRect) => void
}

export function QuestionCard({ mode, ageTimeLong, submitted, onSubmit }: QuestionCardProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const copy = question[mode]
  const trimmed = value.trim()
  const canSubmit = trimmed.length > 0 && trimmed.length <= cardCopy.maxLength

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    // 빈 입력은 아무 안내 없이 무시한다 (기록은 선택).
    if (!canSubmit) return
    const rect = inputRef.current?.getBoundingClientRect() ?? new DOMRect(0, 0, 0, 0)
    onSubmit(trimmed, rect)
    setValue('')
  }

  if (submitted) {
    return (
      <section className={card.card} aria-live="polite">
        <p className={card.done}>{cardCopy.submitted}</p>
      </section>
    )
  }

  return (
    <form className={card.card} onSubmit={handleSubmit} aria-label={copy.prompt(ageTimeLong)}>
      <p className={card.prompt}>{copy.prompt(ageTimeLong)}</p>
      <div className={card.row}>
        <input
          ref={inputRef}
          className={card.input}
          type="text"
          value={value}
          maxLength={cardCopy.maxLength}
          placeholder={cardCopy.placeholder}
          enterKeyHint="done"
          autoComplete="off"
          onChange={(e) => setValue(e.target.value)}
        />
        <button className={card.submit} type="submit" disabled={!canSubmit}>
          {cardCopy.submit}
        </button>
      </div>
      <div className={card.chips}>
        {copy.chips.map((chip) => (
          <button
            key={chip}
            type="button"
            className={`${card.chip} ${value === chip ? card.chipActive : ''}`}
            onClick={() => {
              setValue(chip)
              inputRef.current?.focus()
            }}
          >
            {chip}
          </button>
        ))}
      </div>
    </form>
  )
}
