import { useState } from 'react'
import type { Reaction } from '../types'
import { compareLabel, reactionLabels, reactionOrder, reflection } from '../lib/copy'
import card from './Card.module.css'

export interface ReflectionCardProps {
  firstReaction: Reaction | null
  /** "오후 12시 00분" */
  timeLong: string
  onSelect: (value: Reaction) => void
}

export function ReflectionCard({ firstReaction, timeLong, onSelect }: ReflectionCardProps) {
  const [selected, setSelected] = useState<Reaction | null>(null)
  const prompt = reflection.question(timeLong)
  return (
    <section className={card.card} aria-label={prompt}>
      <p className={card.prompt}>{prompt}</p>
      <div className={card.options}>
        {reactionOrder.map((r) => (
          <button
            key={r}
            type="button"
            className={`${card.option} ${selected === r ? card.optionSelected : ''}`}
            onClick={() => {
              if (selected !== null) return
              setSelected(r)
              onSelect(r)
            }}
            disabled={selected !== null && selected !== r}
            aria-pressed={selected === r}
          >
            {reactionLabels[r]}
          </button>
        ))}
      </div>
      {selected !== null && (
        <p className={card.result} aria-live="polite">
          {compareLabel(firstReaction, selected)}
        </p>
      )}
    </section>
  )
}
