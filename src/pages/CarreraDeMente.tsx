import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Category, GamePhase } from '../types/carreraDeMente'
import DiceSelector from '../components/carreraDeMente/DiceSelector'
import QuestionCard from '../components/carreraDeMente/QuestionCard'
import CategoryManager from '../components/carreraDeMente/CategoryManager'
import styles from './CarreraDeMente.module.css'

export default function CarreraDeMente() {
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCatId, setActiveCatId] = useState<string | null>(null)
  const [dice, setDice] = useState<[number, number, number]>([1, 1, 1])
  const [phase, setPhase] = useState<GamePhase>('setup')
  const [showManager, setShowManager] = useState(false)

  const activeCategory = categories.find(c => c.id === activeCatId) ?? null
  const roll = dice.join('')
  const question = activeCategory?.questions[roll] ?? null

  function handleStartTurn() {
    if (!activeCategory) return
    setPhase('question')
    setShowManager(false)
  }

  function handleFinishTurn() {
    setPhase('dice')
  }

  function handleCategoryChange(cats: Category[]) {
    setCategories(cats)
    if (activeCatId && !cats.find(c => c.id === activeCatId)) {
      setActiveCatId(cats[0]?.id ?? null)
    }
    if (!activeCatId && cats.length > 0) {
      setActiveCatId(cats[0].id)
    }
    if (cats.length > 0 && phase === 'setup') setPhase('dice')
    if (cats.length === 0) setPhase('setup')
  }

  const isDicePhase = phase === 'dice'
  const isQuestionPhase = ['question', 'options', 'answered'].includes(phase)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>← Menu</Link>
        <h1 className={styles.title}>Carrera de Mente</h1>
        <div className={styles.headerRight}>
          <button
            className="btn btn--ghost"
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}
            onClick={() => { setShowManager(v => !v); if (isQuestionPhase) setPhase('dice') }}
          >
            {showManager ? 'Done' : 'Categories'}
          </button>
        </div>
      </header>

      <main className={styles.main}>

        {/* Setup / Manager overlay */}
        {(phase === 'setup' || showManager) && (
          <CategoryManager categories={categories} onChange={handleCategoryChange} />
        )}

        {/* Dice phase */}
        {isDicePhase && !showManager && (
          <>
            {categories.length > 1 && (
              <div className={styles.categoryRow}>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    className={`${styles.categoryChip} ${cat.id === activeCatId ? styles.categoryChipActive : ''}`}
                    style={{
                      borderColor: cat.color,
                      background: cat.id === activeCatId ? cat.color : undefined,
                    }}
                    onClick={() => setActiveCatId(cat.id)}
                  >
                    {cat.title}
                  </button>
                ))}
              </div>
            )}

            <DiceSelector values={dice} onChange={setDice} />

            {!question && activeCategory && (
              <p className={styles.notFound}>No question found for roll {roll}</p>
            )}

            <button
              className="btn"
              style={{ '--btn-color': activeCategory?.color } as React.CSSProperties}
              disabled={!question}
              onClick={handleStartTurn}
            >
              Start Turn
            </button>
          </>
        )}

        {/* Question phase */}
        {isQuestionPhase && !showManager && question && activeCategory && (
          <QuestionCard
            question={question}
            phase={phase}
            onPhaseChange={setPhase}
            onFinish={handleFinishTurn}
            primaryColor={activeCategory.color}
          />
        )}

      </main>
    </div>
  )
}
