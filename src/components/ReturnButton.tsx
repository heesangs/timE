import { returnButton } from '../lib/copy'
import styles from './ReturnButton.module.css'

export interface ReturnButtonProps {
  visible: boolean
  onClick: () => void
}

export function ReturnButton({ visible, onClick }: ReturnButtonProps) {
  if (!visible) return null
  return (
    <button type="button" className={styles.button} onClick={onClick}>
      <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8 2.5a5.5 5.5 0 1 1-5.2 3.7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M2.3 2.6v3.8h3.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {returnButton.label}
    </button>
  )
}
