import type { Question } from '../../types/carreraDeMente'
import styles from './QuestionCard.module.css'

interface Props {
  question: Question
  categoryName: string
  primaryColor: string
  // Display state (parent controls)
  options: string[] | null     // null = hidden
  revealedAnswer: boolean
  selectedOption: string | null
  // Regular mode callbacks
  onShowOptions: () => void
  onRevealAnswer: () => void
  onSelectOption: (opt: string) => void
  onCorrect: () => void
  onWrong: () => void
  // Duel mode
  duelMode?: boolean
  challengerName?: string
  challengedName?: string
  onDuelWinner?: (side: 'challenger' | 'challenged') => void
}

export default function QuestionCard({
  question,
  categoryName,
  primaryColor,
  options,
  revealedAnswer,
  selectedOption,
  onShowOptions,
  onRevealAnswer,
  onSelectOption,
  onCorrect,
  onWrong,
  duelMode,
  challengerName,
  challengedName,
  onDuelWinner,
}: Props) {

  function optionClass(opt: string): string {
    if (selectedOption === null) return styles.optionBtn
    if (opt === question.correctAnswer) return `${styles.optionBtn} ${styles.optionCorrect}`
    if (opt === selectedOption) return `${styles.optionBtn} ${styles.optionWrong}`
    return styles.optionBtn
  }

  const isCorrect = selectedOption !== null && selectedOption === question.correctAnswer

  return (
    <div className={styles.card} style={{ borderTopColor: primaryColor }}>
      {/* Header */}
      <div className={styles.cardHeader}>
        <span className={styles.catLabel} style={{ color: primaryColor }}>{categoryName}</span>
        <span className={styles.rollLabel}>Roll · {question.roll}</span>
      </div>

      {/* Duel banner */}
      {duelMode && (
        <div className={styles.duelBanner}>
          <span className={styles.duelIcon}>⚔</span>
          <span><strong style={{ color: '#fca5a5' }}>{challengerName}</strong> vs <strong>{challengedName}</strong></span>
        </div>
      )}

      {/* Question */}
      <p className={styles.question}>{question.question}</p>

      {/* Options */}
      {options && (
        <div className={styles.optionList}>
          {options.map(opt => (
            <button
              key={opt}
              className={optionClass(opt)}
              disabled={selectedOption !== null || duelMode}
              onClick={() => !duelMode && onSelectOption(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Revealed answer */}
      {revealedAnswer && !options && (
        <div className={styles.answerBox}>
          <span className={styles.answerLabel}>Answer</span>
          <span className={styles.answerText}>{question.correctAnswer}</span>
        </div>
      )}

      {/* Feedback after option selection (non-duel) */}
      {selectedOption !== null && (
        <p className={`${styles.feedback} ${isCorrect ? styles.feedbackOk : styles.feedbackBad}`}>
          {isCorrect ? '✓ Correct!' : `✗ Wrong — ${question.correctAnswer}`}
        </p>
      )}

      {/* Action row */}
      <div className={styles.actions}>
        {/* No answer/options shown yet → regular */}
        {!options && !revealedAnswer && !duelMode && (
          <>
            <button className="btn" style={{ '--btn-color': primaryColor } as React.CSSProperties} onClick={onShowOptions}>
              Show Options
            </button>
            <button className="btn btn--ghost" onClick={onRevealAnswer}>Reveal Answer</button>
          </>
        )}

        {/* No answer/options shown yet → duel */}
        {!options && !revealedAnswer && duelMode && (
          <>
            <button className="btn btn--ghost" onClick={onRevealAnswer}>Reveal Answer</button>
            <button className="btn btn--ghost" onClick={onShowOptions}>Show Options</button>
          </>
        )}

        {/* Answer revealed (no options) → arbiter judges */}
        {revealedAnswer && !options && !duelMode && (
          <>
            <button className="btn" style={{ '--btn-color': '#22c55e' } as React.CSSProperties} onClick={onCorrect}>
              ✓ Correct!
            </button>
            <button className="btn btn--ghost" onClick={onWrong}>✗ Wrong</button>
          </>
        )}

        {/* Answer revealed → duel arbitration */}
        {revealedAnswer && !options && duelMode && onDuelWinner && (
          <>
            <button className="btn" style={{ '--btn-color': '#22c55e' } as React.CSSProperties} onClick={() => onDuelWinner('challenger')}>
              ✓ {challengerName}
            </button>
            <button className="btn" style={{ '--btn-color': '#f59e0b' } as React.CSSProperties} onClick={() => onDuelWinner('challenged')}>
              ✓ {challengedName}
            </button>
          </>
        )}

        {/* Options shown → duel arbitration */}
        {options && duelMode && onDuelWinner && (
          <>
            <button className="btn" style={{ '--btn-color': '#22c55e' } as React.CSSProperties} onClick={() => onDuelWinner('challenger')}>
              ✓ {challengerName}
            </button>
            <button className="btn" style={{ '--btn-color': '#f59e0b' } as React.CSSProperties} onClick={() => onDuelWinner('challenged')}>
              ✓ {challengedName}
            </button>
          </>
        )}

        {/* Options selected (non-duel): result already shown via feedback, parent drives next action */}
      </div>
    </div>
  )
}
