import { useState, useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import RouletteWheel, { type Phase } from '../components/wavelength/RouletteWheel'
import GameSetup from '../components/wavelength/GameSetup'
import ScorePanel from '../components/wavelength/ScorePanel'
import type { Team, GameState } from '../types/game'
import styles from './Wavelength.module.css'

type Difficulty = 'easy' | 'normal' | 'hard'

const SECTION_SIZES: Record<Difficulty, number> = {
  easy:   14,
  normal:  9,
  hard:    5,
}

function calcPoints(sweetSpot: number, guess: number, sectionSize: number): number {
  const diff = Math.abs(sweetSpot - guess)
  const dist = Math.min(diff, 180 - diff)
  const z5 = sectionSize / 2
  const z4 = z5 + sectionSize
  const z3 = z4 + sectionSize
  if (dist <= z5) return 5
  if (dist <= z4) return 4
  if (dist <= z3) return 3
  return 0
}

const POINT_MESSAGES: Record<number, { title: string; subtitle: string }> = {
  5: { title: '🎯 Perfect!',  subtitle: 'You two are truly in sync.' },
  4: { title: '💡 So close!', subtitle: 'Almost exactly right.' },
  3: { title: '👍 Not bad!',  subtitle: 'You got the general idea.' },
  0: { title: '😬 Miss!',     subtitle: 'Better luck next round.' },
}

function randomAngle() { return Math.random() * 180 }

const ANIM_DURATION = 2200
const ANIM_LAPS = 4

// Which player gives the clue this round (alternates by team round count)
function clueGiverIndex(roundNumber: number): 0 | 1 {
  return roundNumber % 2 === 0 ? 0 : 1
}

export default function Wavelength() {
  // ── Wheel state ────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('start')
  const [sweetSpot, setSweetSpot] = useState(90)
  const [needleAngle, setNeedleAngle] = useState(90)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [points, setPoints] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const animFrameRef = useRef<number | undefined>(undefined)

  // ── Game mode state ────────────────────────────────────────────
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [showScores, setShowScores] = useState(false)
  const [clue, setClue] = useState('')
  // Per-team round counter (how many rounds each team has played): teamId → count
  const [teamRoundCount, setTeamRoundCount] = useState<Record<string, number>>({})

  useEffect(() => () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }, [])

  const sectionSize = SECTION_SIZES[difficulty]

  // ── Current team helpers ───────────────────────────────────────
  const currentTeam = gameState ? gameState.teams[gameState.currentTeamIndex] : null
  const teamRounds = currentTeam ? (teamRoundCount[currentTeam.id] ?? 0) : 0
  const cgIdx = currentTeam ? clueGiverIndex(teamRounds) : 0
  const clueGiver = currentTeam ? currentTeam.members[cgIdx] : 'Player 1'
  const guesser   = currentTeam ? currentTeam.members[1 - cgIdx] : 'Player 2'

  // ── Phase labels ───────────────────────────────────────────────
  const PHASE_LABELS: Record<Phase, string> = gameState ? {
    start:    `${guesser}, look away! ${clueGiver} memorises the target.`,
    shuffled: `${clueGiver}, think of a clue.`,
    closed:   `Dial is closed. ${clueGiver}, enter your clue.`,
    guess:    `${guesser}, tap and drag to place the needle.`,
    reveal:   'Compare the positions!',
  } : {
    start:    'Player 2, look away! Player 1 memorises the target.',
    shuffled: 'Player 1, think of a clue.',
    closed:   'Dial is closed. Player 1, say your clue now.',
    guess:    'Player 2, tap and drag to place the needle.',
    reveal:   'Compare the positions!',
  }

  // ── Shuffle animation ──────────────────────────────────────────
  const handleShuffle = useCallback(() => {
    const finalAngle = randomAngle()
    const startAngle = sweetSpot
    const offset = ((finalAngle - startAngle) % 180 + 180) % 180
    const totalTravel = ANIM_LAPS * 180 + offset
    const startTime = performance.now()
    setIsAnimating(true)

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / ANIM_DURATION, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setSweetSpot(((startAngle + eased * totalTravel) % 180 + 180) % 180)
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate)
      } else {
        setSweetSpot(finalAngle)
        setIsAnimating(false)
        setPhase('shuffled')
      }
    }
    animFrameRef.current = requestAnimationFrame(animate)
  }, [sweetSpot])

  // ── Action handler ─────────────────────────────────────────────
  const handleAction = useCallback(() => {
    if (phase === 'start') {
      handleShuffle()
    } else if (phase === 'shuffled') {
      setPhase('closed')
      setClue('')
    } else if (phase === 'closed') {
      setPhase('guess')
    } else if (phase === 'guess') {
      const pts = calcPoints(sweetSpot, needleAngle, sectionSize)
      setPoints(pts)
      setPhase('reveal')

      // Record round in game mode
      if (gameState && currentTeam) {
        const record = {
          roundNumber: gameState.roundNumber,
          teamId: currentTeam.id,
          teamName: currentTeam.name,
          clueGiver,
          guesser,
          clue,
          points: pts,
        }
        setGameState(prev => {
          if (!prev) return prev
          return {
            ...prev,
            teams: prev.teams.map(t =>
              t.id === currentTeam.id ? { ...t, score: t.score + pts } : t
            ),
            history: [...prev.history, record],
          }
        })
        setTeamRoundCount(prev => ({
          ...prev,
          [currentTeam.id]: (prev[currentTeam.id] ?? 0) + 1,
        }))
      }
    } else if (phase === 'reveal') {
      // Advance to next team (or stay in solo)
      if (gameState) {
        setGameState(prev => {
          if (!prev) return prev
          const nextTeamIndex = (prev.currentTeamIndex + 1) % prev.teams.length
          const nextRound = nextTeamIndex === 0 ? prev.roundNumber + 1 : prev.roundNumber
          return { ...prev, currentTeamIndex: nextTeamIndex, roundNumber: nextRound }
        })
      }
      setPoints(null)
      setPhase('start')
      setSweetSpot(90)
      setNeedleAngle(90)
      setClue('')
    }
  }, [phase, sweetSpot, needleAngle, sectionSize, handleShuffle, gameState, currentTeam, clueGiver, guesser, clue])

  // ── Game setup callbacks ───────────────────────────────────────
  const handleStartGame = useCallback((teams: Team[]) => {
    setGameState({ teams, currentTeamIndex: 0, roundNumber: 1, history: [] })
    setTeamRoundCount({})
    setShowSetup(false)
    setPhase('start')
    setSweetSpot(90)
    setNeedleAngle(90)
    setPoints(null)
    setClue('')
  }, [])

  const handleRestartGame = useCallback(() => {
    setGameState(prev => prev ? {
      ...prev,
      currentTeamIndex: 0,
      roundNumber: 1,
      history: [],
      teams: prev.teams.map(t => ({ ...t, score: 0 })),
    } : null)
    setTeamRoundCount({})
    setPhase('start')
    setSweetSpot(90)
    setNeedleAngle(90)
    setPoints(null)
    setClue('')
    setShowScores(false)
  }, [])

  const handleFinishGame = useCallback(() => {
    setGameState(null)
    setTeamRoundCount({})
    setPhase('start')
    setSweetSpot(90)
    setNeedleAngle(90)
    setPoints(null)
    setClue('')
    setShowScores(false)
  }, [])

  const handleSave = useCallback((): boolean => {
    if (!gameState) return false
    try {
      const payload = { gameState, teamRoundCount, difficulty }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `wavelength-round${gameState.roundNumber}.json`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 10000)
      return true
    } catch {
      return false
    }
  }, [gameState, teamRoundCount, difficulty])

  const handleLoad = useCallback((): boolean => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const saved = JSON.parse(e.target?.result as string)
          if (!saved.gameState) return
          setGameState(saved.gameState)
          setTeamRoundCount(saved.teamRoundCount ?? {})
          setDifficulty(saved.difficulty ?? 'normal')
          setPhase('start')
          setSweetSpot(90)
          setNeedleAngle(90)
          setPoints(null)
          setClue('')
          setShowScores(false)
          setShowSetup(false)
        } catch { /* malformed file — ignore */ }
      }
      reader.readAsText(file)
    }
    input.click()
    return true
  }, [])

  const msg = points !== null ? POINT_MESSAGES[points] : null

  // ── Team banner (shown in game mode, non-start phases) ─────────
  const teamBanner = gameState && currentTeam ? (
    <div className={styles.teamBanner}>
      <span className={styles.teamBannerName}>{currentTeam.name}</span>
      <span className={styles.teamBannerRound}>Round {gameState.roundNumber}</span>
    </div>
  ) : null

  return (
    <div className={styles.page}>
      {showSetup && (
        <GameSetup onStart={handleStartGame} onCancel={() => setShowSetup(false)} onLoad={handleLoad} />
      )}
      {showScores && gameState && (
        <ScorePanel
          gameState={gameState}
          onClose={() => setShowScores(false)}
          onRestart={handleRestartGame}
          onFinish={handleFinishGame}
          onSave={handleSave}
          onLoad={handleLoad}
        />
      )}

      <header className={styles.header}>
        <Link to="/" className={styles.back}>← Menu</Link>
        <h1 className={styles.title}>Wavelength</h1>
        <div className={styles.headerRight}>
          {gameState ? (
            <button className={styles.btnGhost} onClick={() => setShowScores(true)}>Scores</button>
          ) : (
            <button className={styles.btnGhost} onClick={() => setShowSetup(true)}>Create Game</button>
          )}
        </div>
      </header>

      {teamBanner}

      <div className={styles.wheelWrap}>
        <RouletteWheel
          phase={phase}
          sweetSpot={sweetSpot}
          needleAngle={needleAngle}
          sectionSize={sectionSize}
          points={points}
          onNeedleMove={setNeedleAngle}
        />
      </div>

      {/* Bottom controls */}
      <div className={styles.controls}>
        {phase === 'reveal' && msg ? (
          <>
            <p className={styles.revealMsg}>
              <span className={styles.revealTitle}>{msg.title}</span>
              <span className={styles.revealSub}> — {msg.subtitle}</span>
            </p>
            <button className={styles.btn} onClick={handleAction}>
              {gameState ? 'Next team' : 'Next round'}
            </button>
          </>
        ) : (
          <>
            <p className={styles.phaseLabel}>
              {isAnimating ? 'Shuffling…' : PHASE_LABELS[phase]}
            </p>

            {/* Difficulty selector — solo only, start phase */}
            {!gameState && phase === 'start' && !isAnimating && (
              <div className={styles.difficultyRow}>
                {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    className={`${styles.diffBtn} ${difficulty === d ? styles.diffBtnActive : ''}`}
                    onClick={() => setDifficulty(d)}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>
            )}

            {/* Clue input — game mode only, closed phase */}
            {gameState && phase === 'closed' && (
              <input
                className={styles.clueInput}
                placeholder={`${clueGiver}'s clue…`}
                value={clue}
                onChange={e => setClue(e.target.value)}
                maxLength={48}
                autoFocus
              />
            )}

            <button className={styles.btn} onClick={handleAction} disabled={isAnimating}>
              {phase === 'start'    ? 'Shuffle'
               : phase === 'shuffled' ? 'Close the dial'
               : phase === 'closed'   ? 'Ready to guess'
               :                        'Reveal!'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
