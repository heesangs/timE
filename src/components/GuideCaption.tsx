import type { Reaction } from '../types'
import { guide, reactionLabels, reactionOrder } from '../lib/copy'
import card from './Card.module.css'
import styles from './GuideCaption.module.css'

export interface GuideCaptionProps {
  variant: 'guide' | 'firstReaction'
  onSelectReaction?: (reaction: Reaction) => void
}

export function GuideCaption({ variant, onSelectReaction }: GuideCaptionProps) {
  if (variant === 'guide') {
    return (
      <p key="guide" className={styles.caption}>
        {guide.caption}
      </p>
    )
  }
  return (
    <section key="first" className={card.card} aria-label={guide.firstReactionQuestion}>
      <p className={card.prompt}>{guide.firstReactionQuestion}</p>
      <div className={card.options}>
        {reactionOrder.map((r) => (
          <button key={r} type="button" className={card.option} onClick={() => onSelectReaction?.(r)}>
            {reactionLabels[r]}
          </button>
        ))}
      </div>
    </section>
  )
}
