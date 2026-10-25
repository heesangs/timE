import { useId, useState, type FormEvent } from 'react'
import { onboarding } from '../lib/copy'
import { LIFE_SPAN_YEARS, validateBirthDate, type BirthDateError } from '../lib/lifeClock'
import styles from './OnboardingForm.module.css'

export interface OnboardingFormProps {
  onSubmit: (birthDate: string) => void
}

function toInputDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const ERROR_COPY: Record<BirthDateError, string> = {
  required: onboarding.errorRequired,
  future: onboarding.errorFuture,
  tooOld: onboarding.errorTooOld,
}

export function OnboardingForm({ onSubmit }: OnboardingFormProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<BirthDateError | null>(null)
  const id = useId()
  const [range] = useState(() => {
    const today = new Date()
    return {
      max: toInputDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)),
      min: toInputDate(new Date(today.getFullYear() - LIFE_SPAN_YEARS, today.getMonth(), today.getDate() + 1)),
    }
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const err = validateBirthDate(value)
    if (err) {
      setError(err)
      return
    }
    onSubmit(value)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.title}>{onboarding.title}</h1>
      <p className={styles.lead}>{onboarding.lead}</p>
      <label className={styles.label} htmlFor={id}>
        {onboarding.birthDateLabel}
      </label>
      <input
        id={id}
        className={`${styles.input} tabular`}
        type="date"
        value={value}
        min={range.min}
        max={range.max}
        required
        autoComplete="bday"
        onChange={(e) => {
          setValue(e.target.value)
          if (error) setError(null)
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className={styles.error} role="alert">
          {ERROR_COPY[error]}
        </p>
      )}
      <button className={styles.submit} type="submit">
        {onboarding.submit}
      </button>
    </form>
  )
}
