import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import RouletteWheel, { type Phase } from '../components/wavelength/RouletteWheel'
import styles from './Wavelength.module.css'

// Scoring thresholds (half-widths in game degrees)
const ZONE_5 = 9
const ZONE_4 = 18
const ZONE_3 = 27

function calcPoints(sweetSpot: number, guess: number): number {
  const diff = Math.abs(sweetSpot - guess)
  const dist = Math.min(diff, 180 - diff) // wrap-around distance
  if (dist <= ZONE_5) return 5
  if (dist <= ZONE_4) return 4
  if (dist <= ZONE_3) return 3
  return 0
}

const PHASE_LABELS: Record<Phase, string> = {
  start:    'Both players look at the open dial.',
  shuffled: 'Player 1 memorises the target. Player 2, look away!',
  closed:   'Dial is closed. Player 1, say your clue now.',
  guess:    'Player 2, tap to place the needle.',
  reveal:   '',
}

const PHASE_ACTIONS: Record<Phase, string> = {
  start:    'Shuffle',
  shuffled: 'Close the dial',
  closed:   'Ready to guess',
  guess:    'Reveal!',
  reveal:   'Next round',
}

function randomAngle() {
  return Math.random() * 180
}

const POINT_MESSAGES: Record<number, { title: string; subtitle: string }> = {
  5: { title: '🎯 Perfect!',   subtitle: 'You two are truly in sync.' },
  4: { title: '💡 So close!',  subtitle: 'Almost exactly right.' },
  3: { title: '👍 Not bad!',   subtitle: 'You got the general idea.' },
  0: { title: '😬 Miss!',      subtitle: 'Better luck next round.' },
}

export default function Wavelength() {
  const [phase, setPhase] = useState<Phase>('start')
  const [sweetSpot, setSweetSpot] = useState<number>(90)
  const [needleAngle, setNeedleAngle] = useState<number>(90)
  const [points, setPoints] = useState<number | null>(null)
  const [showPopup, setShowPopup] = useState(false)

  const handleAction = useCallback(() => {
    if (phase === 'start') {
      setSweetSpot(randomAngle())
      setNeedleAngle(90)
      setPhase('shuffled')
    } else if (phase === 'shuffled') {
      setPhase('closed')
    } else if (phase === 'closed') {
      setPhase('guess')
    } else if (phase === 'guess') {
      const pts = calcPoints(sweetSpot, needleAngle)
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
  }, [phase, sweetSpot, needleAngle])

  const msg = points !== null ? POINT_MESSAGES[points] : null

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <Link to="/" className={styles.back}>← Menu</Link>
        <h1 className={styles.title}>Wavelength</h1>
      </header>

      {/* Roulette */}
      <div className={styles.wheelWrap}>
        <RouletteWheel
          phase={phase}
          sweetSpot={sweetSpot}
          needleAngle={needleAngle}
          onNeedleMove={setNeedleAngle}
        />
      </div>

      {/* Phase label */}
      {phase !== 'reveal' && (
        <p className={styles.phaseLabel}>{PHASE_LABELS[phase]}</p>
      )}

      {/* Action button */}
      {phase !== 'reveal' && (
        <button className={styles.btn} onClick={handleAction}>
          {PHASE_ACTIONS[phase]}
        </button>
      )}

      {/* Score popup */}
      {showPopup && msg && (
        <div className={styles.popupOverlay} onClick={() => { setShowPopup(false); handleAction(); }}>
          <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
            <div className={styles.popupPoints}>
              {points} {points === 1 ? 'point' : 'points'}
            </div>
            <div className={styles.popupTitle}>{msg.title}</div>
            <div className={styles.popupSub}>{msg.subtitle}</div>
            <button
              className={styles.btn}
              onClick={() => { setShowPopup(false); handleAction(); }}
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
