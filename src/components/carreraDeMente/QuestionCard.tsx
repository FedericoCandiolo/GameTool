import { useState, useMemo } from 'react'
import type { Question, GamePhase } from '../../types/carreraDeMente'
import styles from './QuestionCard.module.css'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Props {
  question: Question
  phase: GamePhase
  onPhaseChange: (p: GamePhase) => void
  onFinish: () => void
  primaryColor: string
}

export default function QuestionCard({ question, phase, onPhaseChange, onFinish, primaryColor }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  const options = useMemo(
    () => shuffle([question.correctAnswer, ...question.wrongOptions]),
    [question]
  )

  function handleSelect(opt: string) {
    if (phase !== 'options') return
    setSelected(opt)
    onPhaseChange('answered')
  }

  function handleFinish() {
    setSelected(null)
    onFinish()
  }

  function optionClass(opt: string): string {
    if (phase !== 'answered') return styles.optionBtn
    if (opt === question.correctAnswer) return `${styles.optionBtn} ${styles.optionCorrect}`
    if (opt === selected) return `${styles.optionBtn} ${styles.optionWrong}`
    return styles.optionBtn
  }

  const isCorrect = selected === question.correctAnswer

  return (
    <div className={styles.card} style={{ borderColor: phase !== 'dice' ? primaryColor + '55' : undefined }}>
      <span className={styles.roll}>Roll · {question.roll}</span>
      <p className={styles.question}>{question.question}</p>

      {phase === 'question' && (
        <div className={styles.actions}>
          <button
            className="btn"
            style={{ '--btn-color': primaryColor } as React.CSSProperties}
            onClick={() => onPhaseChange('options')}
          >
            Show Options
          </button>
          <button className="btn btn--ghost" onClick={() => onPhaseChange('answered')}>
            Show Answer
          </button>
        </div>
      )}

      {(phase === 'options' || phase === 'answered') && selected === null && phase === 'options' && (
        <div className={styles.options}>
          {options.map((opt) => (
            <button key={opt} className={styles.optionBtn} onClick={() => handleSelect(opt)}>
              {opt}
            </button>
          ))}
        </div>
      )}

      {phase === 'answered' && selected !== null && (
        <>
          <div className={styles.options}>
            {options.map((opt) => (
              <button key={opt} className={optionClass(opt)} disabled>
                {opt}
              </button>
            ))}
          </div>
          <p className={`${styles.feedback} ${isCorrect ? styles.feedbackCorrect : styles.feedbackWrong}`}>
            {isCorrect ? '✓ Correct!' : '✗ Wrong'}
          </p>
          <button className="btn btn--ghost" onClick={handleFinish}>Finish Turn</button>
        </>
      )}

      {phase === 'answered' && selected === null && (
        <>
          <p className={styles.answerReveal}>
            Answer: <strong>{question.correctAnswer}</strong>
          </p>
          <button className="btn btn--ghost" onClick={handleFinish}>Finish Turn</button>
        </>
      )}
    </div>
  )
}
