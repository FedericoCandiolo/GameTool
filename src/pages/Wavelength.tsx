import { useState, useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import RouletteWheel, { type Phase } from '../components/wavelength/RouletteWheel'
import styles from './Wavelength.module.css'

type Difficulty = 'easy' | 'normal' | 'hard'

// Half-width of each scoring band in game degrees
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

const PHASE_LABELS: Record<Phase, string> = {
  start:    'Both players look at the open dial.',
  shuffled: 'Player 1 memorises the target. Player 2, look away!',
  closed:   'Dial is closed. Player 1, say your clue now.',
  guess:    'Player 2, tap and drag to place the needle.',
  reveal:   '',
}

const POINT_MESSAGES: Record<number, { title: string; subtitle: string }> = {
  5: { title: '🎯 Perfect!',  subtitle: 'You two are truly in sync.' },
  4: { title: '💡 So close!', subtitle: 'Almost exactly right.' },
  3: { title: '👍 Not bad!',  subtitle: 'You got the general idea.' },
  0: { title: '😬 Miss!',     subtitle: 'Better luck next round.' },
}

function randomAngle() {
  return Math.random() * 180
}

const ANIM_DURATION = 2200  // ms
const ANIM_LAPS = 4         // full 180° sweeps before landing

export default function Wavelength() {
  const [phase, setPhase] = useState<Phase>('start')
  const [sweetSpot, setSweetSpot] = useState(90)
  const [needleAngle, setNeedleAngle] = useState(90)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [points, setPoints] = useState<number | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const animFrameRef = useRef<number | undefined>(undefined)

  // Cancel any in-flight animation on unmount
  useEffect(() => () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }, [])

  const sectionSize = SECTION_SIZES[difficulty]

  const handleShuffle = useCallback(() => {
    const finalAngle = randomAngle()
    const startAngle = sweetSpot
    const offset = ((finalAngle - startAngle) % 180 + 180) % 180
    const totalTravel = ANIM_LAPS * 180 + offset
    const startTime = performance.now()

    setIsAnimating(true)

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / ANIM_DURATION, 1)
      const eased = 1 - Math.pow(1 - t, 3)          // cubic ease-out
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

  const handleAction = useCallback(() => {
    if (phase === 'start') {
      handleShuffle()
    } else if (phase === 'shuffled') {
      setPhase('closed')
    } else if (phase === 'closed') {
      setPhase('guess')
    } else if (phase === 'guess') {
      const pts = calcPoints(sweetSpot, needleAngle, sectionSize)
      setPoints(pts)
      setPhase('reveal')
      setShowPopup(true)
    } else if (phase === 'reveal') {
      setShowPopup(false)
      setPoints(null)
      setPhase('start')
      setSweetSpot(90)
      setNeedleAngle(90)
    }
  }, [phase, sweetSpot, needleAngle, sectionSize, handleShuffle])

  const msg = points !== null ? POINT_MESSAGES[points] : null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>← Menu</Link>
        <h1 className={styles.title}>Wavelength</h1>
      </header>

      <div className={styles.wheelWrap}>
        <RouletteWheel
          phase={phase}
          sweetSpot={sweetSpot}
          needleAngle={needleAngle}
          sectionSize={sectionSize}
          onNeedleMove={setNeedleAngle}
        />
      </div>

      {phase !== 'reveal' && (
        <p className={styles.phaseLabel}>
          {isAnimating ? 'Shuffling…' : PHASE_LABELS[phase]}
        </p>
      )}

      {/* Difficulty selector — only before shuffling */}
      {phase === 'start' && !isAnimating && (
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

      {/* Action button */}
      {phase !== 'reveal' && (
        <button
          className={styles.btn}
          onClick={handleAction}
          disabled={isAnimating}
        >
          {phase === 'start'
            ? isAnimating ? 'Shuffling…' : 'Shuffle'
            : phase === 'shuffled' ? 'Close the dial'
            : phase === 'closed'   ? 'Ready to guess'
            : 'Reveal!'}
        </button>
      )}

      {/* Score popup */}
      {showPopup && msg && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <div className={styles.popupPoints}>
              {points} {points === 1 ? 'point' : 'points'}
            </div>
            <div className={styles.popupTitle}>{msg.title}</div>
            <div className={styles.popupSub}>{msg.subtitle}</div>
            <button
              className={styles.btn}
              onClick={handleAction}
              style={{ marginTop: '2rem' }}
            >
              Next round
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
