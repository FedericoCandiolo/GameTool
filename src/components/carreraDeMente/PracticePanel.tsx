import { useState } from 'react'
import type { Category, Question } from '../../types/carreraDeMente'
import CategoryManager from './CategoryManager'
import DiceSelector from './DiceSelector'
import QuestionCard from './QuestionCard'
import styles from '../../pages/CarreraDeMente.module.css'

type Phase = 'idle' | 'question' | 'options' | 'answer-reveal' | 'feedback'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Props {
  categories: Category[]
  onCategoriesChange: (cats: Category[]) => void
}

export default function PracticePanel({ categories, onCategoriesChange }: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [dice, setDice] = useState<[number, number, number]>([1, 1, 1])
  const [activeCatId, setActiveCatId] = useState<string | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [options, setOptions] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  const effectiveCatId = (activeCatId && categories.find(c => c.id === activeCatId))
    ? activeCatId
    : categories[0]?.id ?? null
  const activeCat = categories.find(c => c.id === effectiveCatId) ?? null

  function handleGetQuestion() {
    if (!activeCat) return
    const q = activeCat.questions[dice.join('')] ?? null
    setQuestion(q)
    setOptions([])
    setSelected(null)
    setPhase('question')
  }

  function handleNext() {
    setPhase('idle')
    setQuestion(null)
    setSelected(null)
    setOptions([])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
      width: '100%', maxWidth: '700px', margin: '0 auto', padding: '0 1rem 1rem', gap: '0.75rem' }}>
      <CategoryManager categories={categories} onChange={onCategoriesChange} />

      {categories.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCatId(cat.id)}
                style={{
                  border: `2px solid ${effectiveCatId === cat.id ? cat.color : 'var(--color-border)'}`,
                  color: effectiveCatId === cat.id ? cat.color : 'var(--color-muted)',
                  background: effectiveCatId === cat.id ? `${cat.color}18` : 'transparent',
                  padding: '0.4rem 1.1rem', borderRadius: '2rem',
                  fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem',
                  cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s',
                }}
              >
                {cat.title}
              </button>
            ))}
          </div>

          {phase === 'idle' && (
            <>
              <DiceSelector values={dice} onChange={setDice} />
              <button className={styles.actionBtn} onClick={handleGetQuestion}>
                Get Question →
              </button>
            </>
          )}

          {phase === 'question' && !question && (
            <>
              <p style={{ color: 'var(--color-muted)', fontFamily: 'Rajdhani, sans-serif',
                fontSize: '1.1rem', margin: 0, textAlign: 'center' }}>
                No question for roll {dice.join('')}. Try different values.
              </p>
              <DiceSelector values={dice} onChange={setDice} />
              <button className={styles.actionBtn} onClick={handleGetQuestion}>Try Again →</button>
            </>
          )}

          {(['question', 'options', 'answer-reveal', 'feedback'] as Phase[]).includes(phase) && question && (
            <>
              <QuestionCard
                question={question}
                categoryName={activeCat?.title ?? ''}
                primaryColor={activeCat?.color ?? 'var(--color-accent)'}
                options={['options', 'feedback'].includes(phase) ? options : null}
                revealedAnswer={phase === 'answer-reveal'}
                selectedOption={selected}
                onShowOptions={() => {
                  setOptions(shuffle([question.correctAnswer, ...question.wrongOptions]))
                  setPhase('options')
                }}
                onRevealAnswer={() => setPhase('answer-reveal')}
                onSelectOption={opt => { setSelected(opt); setPhase('feedback') }}
                onCorrect={handleNext}
                onWrong={handleNext}
                duelMode={false}
              />
              {phase === 'feedback' && (
                <button className={styles.actionBtn} onClick={handleNext}>Next →</button>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
