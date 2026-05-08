import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import type { FullGame, Player, Category, TurnPhase } from '../types/carreraDeMente'
import Roulette from '../components/carreraDeMente/Roulette'
import AnimatedDice from '../components/carreraDeMente/AnimatedDice'
import QuestionCard from '../components/carreraDeMente/QuestionCard'
import PlayerBoard from '../components/carreraDeMente/PlayerBoard'
import DuelSetup from '../components/carreraDeMente/DuelSetup'
import FullGameSetup from '../components/carreraDeMente/FullGameSetup'
import Instructions from '../components/carreraDeMente/Instructions'
import styles from './CarreraDeMente.module.css'

// ── Helpers ────────────────────────────────────────────────────

function rollDice(): [number, number, number] {
  return [rand6(), rand6(), rand6()]
}
function rand6() { return Math.floor(Math.random() * 6) + 1 }

function pickSpinResult(categories: Category[]): 'duel' | string {
  if (Math.random() < 1 / 6) return 'duel'
  return categories[Math.floor(Math.random() * categories.length)].id
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function hasAllCrowns(player: Player, categories: Category[]): boolean {
  return categories.every(cat => (player.crowns[cat.id] ?? 0) > 0)
}

function addCrown(player: Player, categoryId: string): Player {
  return { ...player, crowns: { ...player.crowns, [categoryId]: (player.crowns[categoryId] ?? 0) + 1 } }
}

function removeCrown(player: Player, categoryId: string): Player {
  const count = player.crowns[categoryId] ?? 0
  if (count <= 0) return player
  const crowns = { ...player.crowns, [categoryId]: count - 1 }
  if (crowns[categoryId] === 0) delete crowns[categoryId]
  return { ...player, crowns }
}

function initGame(players: Player[], categories: Category[]): FullGame {
  return {
    players,
    categories,
    currentPlayerIndex: 0,
    phase: 'spin',
    spinResult: null,
    roll: null,
    activeCategoryId: null,
    question: null,
    shuffledOptions: [],
    usedOptions: false,
    selectedAnswer: null,
    duelChallengedPlayerId: null,
    duelChallengedCategoryId: null,
    duelUsedOptions: false,
    winner: null,
  }
}

// ── Component ──────────────────────────────────────────────────

export default function CarreraDeMente() {
  const [game, setGame] = useState<FullGame | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)

  // ── Setup ─────────────────────────────────────────────────────
  function handleStart(players: Player[], categories: Category[]) {
    setGame(initGame(players, categories))
  }

  // ── Derived ───────────────────────────────────────────────────
  const g = game
  const currentPlayer = g ? g.players[g.currentPlayerIndex] : null
  const activeCategory = g ? g.categories.find(c => c.id === g.activeCategoryId) ?? null : null
  const isDuel = g?.spinResult === 'duel' && g?.duelChallengedPlayerId !== null
  const challengedPlayer = g?.duelChallengedPlayerId
    ? g.players.find(p => p.id === g.duelChallengedPlayerId) ?? null
    : null

  // ── Phase transitions ─────────────────────────────────────────
  const update = useCallback((patch: Partial<FullGame> | ((g: FullGame) => Partial<FullGame>)) => {
    setGame(prev => {
      if (!prev) return prev
      const changes = typeof patch === 'function' ? patch(prev) : patch
      return { ...prev, ...changes }
    })
  }, [])

  // SPIN
  function handleSpin() {
    if (!g) return
    const result = pickSpinResult(g.categories)
    update({ phase: 'spinning', spinResult: result })
  }

  // Roulette animation ended
  function handleSpinEnd() {
    update({ phase: 'spin-result' })
  }

  // Proceed after spin result
  function handleSpinResultContinue() {
    if (!g) return
    if (g.spinResult === 'duel') {
      update({ phase: 'duel-pick' })
    } else {
      // Regular category
      const roll = rollDice()
      const cat = g.categories.find(c => c.id === g.spinResult)!
      const q = cat.questions[roll.join('')]
      update({
        phase: 'dice-rolling',
        activeCategoryId: g.spinResult,
        roll,
        question: q ?? null,
        usedOptions: false,
        shuffledOptions: [],
        selectedAnswer: null,
      })
    }
  }

  // Duel: pick target
  function handleChallenge(targetId: string, categoryId: string) {
    if (!g) return
    const roll = rollDice()
    const cat = g.categories.find(c => c.id === categoryId)!
    const q = cat.questions[roll.join('')]
    update({
      phase: 'dice-rolling',
      activeCategoryId: categoryId,
      duelChallengedPlayerId: targetId,
      duelChallengedCategoryId: categoryId,
      roll,
      question: q ?? null,
      usedOptions: false,
      duelUsedOptions: false,
      shuffledOptions: [],
      selectedAnswer: null,
    })
  }

  // Duel: no crowns → pick category, play regular
  function handleDuelPickCategory(categoryId: string) {
    if (!g) return
    const roll = rollDice()
    const cat = g.categories.find(c => c.id === categoryId)!
    const q = cat.questions[roll.join('')]
    update({
      phase: 'dice-rolling',
      activeCategoryId: categoryId,
      duelChallengedPlayerId: null,
      duelChallengedCategoryId: null,
      roll,
      question: q ?? null,
      usedOptions: false,
      shuffledOptions: [],
      selectedAnswer: null,
    })
  }

  // Dice animation done
  function handleDiceComplete() {
    update(prev => ({
      phase: prev.duelChallengedPlayerId ? 'duel-question' : 'question',
    }))
  }

  // Show options
  function handleShowOptions() {
    if (!g?.question) return
    update({
      phase: isDuel ? 'duel-options' : 'options',
      shuffledOptions: shuffle([g.question.correctAnswer, ...g.question.wrongOptions]),
      usedOptions: true,
      duelUsedOptions: isDuel ? true : undefined,
    })
  }

  // Reveal answer
  function handleRevealAnswer() {
    update({
      phase: isDuel ? 'duel-answer-reveal' : 'answer-reveal',
    })
  }

  // Player picks an option (non-duel)
  function handleSelectOption(opt: string) {
    if (!g) return
    update({ selectedAnswer: opt, phase: 'feedback' })
  }

  // Arbiter: correct (no options, regular)
  function handleCorrect() {
    if (!g || !currentPlayer) return
    const updatedPlayer = addCrown(currentPlayer, g.activeCategoryId!)
    const players = g.players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p)
    if (hasAllCrowns(updatedPlayer, g.categories)) {
      update({ players, winner: updatedPlayer, phase: 'game-over' })
    } else {
      update({ players, phase: 'spin', spinResult: null, roll: null, question: null })
    }
  }

  // Arbiter: wrong (no options, regular)
  function handleWrong() {
    update({ phase: 'turn-transition' })
  }

  // After options feedback: continue (keep playing) or end turn
  function handleFeedbackContinue() {
    if (!g) return
    const correct = g.selectedAnswer === g.question?.correctAnswer
    if (correct) {
      update({ phase: 'spin', spinResult: null, roll: null, question: null, selectedAnswer: null })
    } else {
      update({ phase: 'turn-transition', selectedAnswer: null })
    }
  }

  // Duel winner declared
  function handleDuelWinner(side: 'challenger' | 'challenged') {
    if (!g || !currentPlayer) return
    const isNoOptions = g.phase === 'duel-answer-reveal'

    if (side === 'challenger') {
      if (isNoOptions && g.duelChallengedPlayerId && g.duelChallengedCategoryId) {
        // Steal crown
        const challenged = g.players.find(p => p.id === g.duelChallengedPlayerId)!
        const updChallenger = addCrown(currentPlayer, g.duelChallengedCategoryId)
        const updChallenged = removeCrown(challenged, g.duelChallengedCategoryId)
        const players = g.players.map(p =>
          p.id === updChallenger.id ? updChallenger
          : p.id === updChallenged.id ? updChallenged
          : p
        )
        if (hasAllCrowns(updChallenger, g.categories)) {
          update({ players, winner: updChallenger, phase: 'game-over' })
        } else {
          update({ players, phase: 'spin', spinResult: null, roll: null, question: null })
        }
      } else {
        // With options: challenger wins, no crown, keep playing
        update({ phase: 'spin', spinResult: null, roll: null, question: null })
      }
    } else {
      // Challenged wins → end challenger turn
      update({ phase: 'turn-transition' })
    }
  }

  // Advance to next player
  function handleNextTurn() {
    if (!g) return
    const next = (g.currentPlayerIndex + 1) % g.players.length
    update({
      currentPlayerIndex: next,
      phase: 'spin',
      spinResult: null,
      roll: null,
      question: null,
      activeCategoryId: null,
      usedOptions: false,
      duelUsedOptions: false,
      shuffledOptions: [],
      selectedAnswer: null,
      duelChallengedPlayerId: null,
      duelChallengedCategoryId: null,
    })
  }

  // ── Phase labels ───────────────────────────────────────────────
  function phaseLabel(): string {
    if (!g || !currentPlayer) return ''
    const { phase, spinResult, activeCategoryId, duelChallengedPlayerId } = g
    const catName = activeCategoryId ? g.categories.find(c => c.id === activeCategoryId)?.title ?? '' : ''
    switch (phase) {
      case 'spin': return `${currentPlayer.name}'s turn — spin the roulette!`
      case 'spinning': return 'Spinning…'
      case 'spin-result': {
        if (spinResult === 'duel') return '⚔ DUEL!'
        const sc = g.categories.find(c => c.id === spinResult)?.title ?? ''
        return `Category: ${sc}`
      }
      case 'dice-rolling': return 'Rolling dice…'
      case 'question':
      case 'answer-reveal':
      case 'options':
      case 'feedback':
        return `${currentPlayer.name} — ${catName}`
      case 'duel-pick': return `${currentPlayer.name} — choose your duel target`
      case 'duel-question':
      case 'duel-answer-reveal':
      case 'duel-options': {
        const opp = duelChallengedPlayerId
          ? g.players.find(p => p.id === duelChallengedPlayerId)?.name ?? ''
          : ''
        return `⚔ ${currentPlayer.name} vs ${opp} — ${catName}`
      }
      case 'turn-transition':
        return `${currentPlayer.name}'s turn ended`
      case 'game-over': return `${g.winner?.name} wins!`
      default: return ''
    }
  }

  // ── Render ─────────────────────────────────────────────────────

  if (!game) {
    return (
      <div className={styles.page}>
        {showInstructions && <Instructions onClose={() => setShowInstructions(false)} />}
        <header className={styles.header}>
          <Link to="/" className={styles.back}>← Menu</Link>
          <h1 className={styles.title}>Carrera de Mente</h1>
          <div className={styles.headerRight}>
            <button className={styles.btnGhost} onClick={() => setShowInstructions(true)}>?</button>
          </div>
        </header>
        <div className={styles.setupWrap}>
          <FullGameSetup onStart={handleStart} />
        </div>
      </div>
    )
  }

  const phase = game.phase

  return (
    <div className={styles.page}>
      {showInstructions && <Instructions onClose={() => setShowInstructions(false)} />}

      {/* Header */}
      <header className={styles.header}>
        <button className={styles.back} onClick={() => { if (confirm('End game and return to setup?')) setGame(null) }}>
          ← Menu
        </button>
        <h1 className={styles.title}>Carrera de Mente</h1>
        <div className={styles.headerRight}>
          <button className={styles.btnGhost} onClick={() => setShowInstructions(true)}>?</button>
        </div>
      </header>

      {/* Player board */}
      <PlayerBoard
        players={game.players}
        categories={game.categories}
        currentIndex={game.currentPlayerIndex}
      />

      {/* Phase label / turn banner */}
      <div className={styles.banner}>
        <span className={styles.bannerText}>{phaseLabel()}</span>
      </div>

      {/* Central area */}
      <div className={styles.central}>

        {/* Roulette (shown on spin phases) */}
        {(phase === 'spin' || phase === 'spinning' || phase === 'spin-result') && (
          <div className={styles.rouletteWrap}>
            <Roulette
              categories={game.categories}
              spinning={phase === 'spinning'}
              targetId={game.spinResult}
              onSpinEnd={handleSpinEnd}
            />
          </div>
        )}

        {/* Spin result overlay */}
        {phase === 'spin-result' && (() => {
          const spinCat = game.spinResult && game.spinResult !== 'duel'
            ? game.categories.find(c => c.id === game.spinResult) ?? null
            : null
          return (
            <div className={styles.resultOverlay}>
              <p className={styles.resultText}>
                {game.spinResult === 'duel' ? (
                  <><span className={styles.duelResultIcon}>⚔</span> DUEL!</>
                ) : (
                  <>
                    <span className={styles.catResultDot} style={{ background: spinCat?.color }} />
                    {spinCat?.title}
                  </>
                )}
              </p>
            </div>
          )
        })()}

        {/* Dice rolling */}
        {phase === 'dice-rolling' && game.roll && (
          <AnimatedDice
            key={game.roll.join('-') + game.currentPlayerIndex}
            values={game.roll}
            color={activeCategory?.color ?? 'var(--color-accent)'}
            onComplete={handleDiceComplete}
          />
        )}

        {/* Question phases */}
        {(['question','answer-reveal','options','feedback',
           'duel-question','duel-answer-reveal','duel-options'] as TurnPhase[]).includes(phase) && game.question && (
          <QuestionCard
            question={game.question}
            categoryName={activeCategory?.title ?? ''}
            primaryColor={activeCategory?.color ?? 'var(--color-accent)'}
            options={
              ['options','feedback','duel-options'].includes(phase) && game.shuffledOptions.length
                ? game.shuffledOptions
                : null
            }
            revealedAnswer={['answer-reveal','duel-answer-reveal'].includes(phase)}
            selectedOption={game.selectedAnswer}
            onShowOptions={handleShowOptions}
            onRevealAnswer={handleRevealAnswer}
            onSelectOption={handleSelectOption}
            onCorrect={handleCorrect}
            onWrong={handleWrong}
            duelMode={!!game.duelChallengedPlayerId}
            challengerName={currentPlayer?.name}
            challengedName={challengedPlayer?.name}
            onDuelWinner={handleDuelWinner}
          />
        )}

        {/* Duel pick */}
        {phase === 'duel-pick' && currentPlayer && (
          <DuelSetup
            challenger={currentPlayer}
            players={game.players}
            categories={game.categories}
            onChallenge={handleChallenge}
            onPickCategory={handleDuelPickCategory}
          />
        )}

        {/* Turn transition */}
        {phase === 'turn-transition' && (
          <div className={styles.transitionCard}>
            <p className={styles.transitionTitle}>{currentPlayer?.name}'s turn ended</p>
            <p className={styles.transitionNext}>
              {game.players[(game.currentPlayerIndex + 1) % game.players.length].name}, get ready!
            </p>
          </div>
        )}

        {/* Game over */}
        {phase === 'game-over' && game.winner && (
          <div className={styles.gameOverCard}>
            <div className={styles.trophyIcon}>🏆</div>
            <p className={styles.winnerName}>{game.winner.name}</p>
            <p className={styles.winnerSub}>Wins!</p>
            <div className={styles.winnerCrowns}>
              {game.categories.map(cat => (
                Array.from({ length: game.winner!.crowns[cat.id] ?? 0 }, (_, i) => (
                  <span key={`${cat.id}-${i}`} style={{ color: cat.color, fontSize: '1.4rem' }}>♛</span>
                ))
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className={styles.controls}>
        {phase === 'spin' && (
          <button className={styles.actionBtn} onClick={handleSpin}>Spin!</button>
        )}
        {phase === 'spin-result' && (
          <button className={styles.actionBtn} onClick={handleSpinResultContinue}>
            {game.spinResult === 'duel' ? '⚔ Enter Duel' : 'Roll Dice →'}
          </button>
        )}
        {phase === 'feedback' && (
          <button
            className={`${styles.actionBtn} ${game.selectedAnswer !== game.question?.correctAnswer ? styles.actionBtnWrong : ''}`}
            onClick={handleFeedbackContinue}
          >
            {game.selectedAnswer === game.question?.correctAnswer ? 'Keep Playing →' : 'Turn Ends'}
          </button>
        )}
        {phase === 'turn-transition' && (
          <button className={styles.actionBtn} onClick={handleNextTurn}>Continue →</button>
        )}
        {phase === 'game-over' && (
          <button className={styles.actionBtn} onClick={() => setGame(null)}>Play Again</button>
        )}
      </div>
    </div>
  )
}
