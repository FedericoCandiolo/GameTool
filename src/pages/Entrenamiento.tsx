import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Category, Question } from '../types/carreraDeMente'
import CategoryManager from '../components/carreraDeMente/CategoryManager'
import DiceSelector from '../components/carreraDeMente/DiceSelector'
import QuestionCard from '../components/carreraDeMente/QuestionCard'
import styles from './CarreraDeMente.module.css'

type Phase = 'setup' | 'idle' | 'question' | 'options' | 'answer-reveal' | 'feedback'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Entrenamiento() {
  const [categories, setCategories] = useState<Category[]>([])
  const [phase, setPhase] = useState<Phase>('setup')
  const [dice, setDice] = useState<[number, number, number]>([1, 1, 1])
  const [activeCatId, setActiveCatId] = useState<string | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [options, setOptions] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)

  const activeCategory = categories.find(c => c.id === activeCatId) ?? null

  function handleGetQuestion() {
    const cat = categories.find(c => c.id === activeCatId)
    if (!cat) return
    const q = cat.questions[dice.join('')] ?? null
    setQuestion(q)
    setOptions([])
    setSelected(null)
    setPhase('question')
  }

  function handleShowOptions() {
    if (!question) return
    setOptions(shuffle([question.correctAnswer, ...question.wrongOptions]))
    setPhase('options')
  }

  function handleRevealAnswer() {
    setPhase('answer-reveal')
  }

  function handleSelectOption(opt: string) {
    setSelected(opt)
    setPhase('feedback')
  }

  function handleNext() {
    setPhase('idle')
    setQuestion(null)
    setSelected(null)
    setOptions([])
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>← Menu</Link>
        <h1 className={styles.title}>Carrera de Mente</h1>
        <div className={styles.headerRight} />
      </header>

      <div className={styles.central}>

        {phase === 'setup' && (
          <>
            <CategoryManager categories={categories} onChange={setCategories} />
            {categories.length > 0 && (
              <button
                className={styles.actionBtn}
                onClick={() => { setActiveCatId(categories[0].id); setPhase('idle') }}
              >
                Play →
              </button>
            )}
          </>
        )}

        {phase !== 'setup' && (
          <>
            {/* Category selector */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCatId(cat.id)}
                  style={{
                    border: `2px solid ${activeCatId === cat.id ? cat.color : 'var(--color-border)'}`,
                    color: activeCatId === cat.id ? cat.color : 'var(--color-muted)',
                    background: activeCatId === cat.id ? `${cat.color}18` : 'transparent',
                    padding: '0.4rem 1.1rem', borderRadius: '2rem',
                    fontFamily: 'Orbitron, sans-serif', fontSize: '0.8rem',
                    cursor: 'pointer', fontWeight: 700, transition: 'all 0.15s',
                  }}
                >
                  {cat.title}
                </button>
              ))}
            </div>

            {/* Dice + get question */}
            {phase === 'idle' && (
              <>
                <DiceSelector values={dice} onChange={setDice} />
                {activeCatId && (
                  <button className={styles.actionBtn} onClick={handleGetQuestion}>
                    Get Question →
                  </button>
                )}
              </>
            )}

            {/* No question for this roll */}
            {phase === 'question' && !question && (
              <>
                <p style={{ color: 'var(--color-muted)', fontFamily: 'Rajdhani, sans-serif',
                  fontSize: '1.1rem', textAlign: 'center', margin: 0 }}>
                  No question for roll {dice.join('')}. Try different dice values.
                </p>
                <DiceSelector values={dice} onChange={setDice} />
                {activeCatId && (
                  <button className={styles.actionBtn} onClick={handleGetQuestion}>
                    Try Again →
                  </button>
                )}
              </>
            )}

            {/* Question card */}
            {(['question', 'options', 'answer-reveal', 'feedback'] as Phase[]).includes(phase) && question && (
              <QuestionCard
                question={question}
                categoryName={activeCategory?.title ?? ''}
                primaryColor={activeCategory?.color ?? 'var(--color-accent)'}
                options={['options', 'feedback'].includes(phase) ? options : null}
                revealedAnswer={phase === 'answer-reveal'}
                selectedOption={selected}
                onShowOptions={handleShowOptions}
                onRevealAnswer={handleRevealAnswer}
                onSelectOption={handleSelectOption}
                onCorrect={handleNext}
                onWrong={handleNext}
                duelMode={false}
              />
            )}
          </>
        )}
      </div>

      <div className={styles.controls}>
        {phase === 'feedback' && (
          <button className={styles.actionBtn} onClick={handleNext}>Next →</button>
        )}
        {phase !== 'setup' && (
          <button
            className={styles.btnGhost}
            onClick={() => { setPhase('setup'); setQuestion(null); setSelected(null); setOptions([]) }}
          >
            ← Categories
          </button>
        )}
      </div>
    </div>
  )
}
