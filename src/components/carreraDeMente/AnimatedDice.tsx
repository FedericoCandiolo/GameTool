import { useEffect, useRef, useState } from 'react'
import styles from './AnimatedDice.module.css'

const DOTS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

function Die({ value, active, settled, color }: {
  value: number; active: boolean; settled: boolean; color: string
}) {
  const dots = DOTS[value] ?? DOTS[1]
  return (
    <div
      className={`${styles.die} ${active ? styles.dieActive : ''} ${settled ? styles.dieSettled : ''}`}
      style={settled ? { borderColor: color, boxShadow: `0 0 16px ${color}55` } : undefined}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className={dots.includes(i) ? styles.dot : styles.dotHidden}
          style={dots.includes(i) && settled ? { background: color, boxShadow: `0 0 4px ${color}88` } : undefined}
        />
      ))}
    </div>
  )
}

interface Props {
  values: [number, number, number]
  color: string
  onComplete: () => void
}

const FLICKER_MS = 70
const FLICKER_DURATION = 650
const GAP_MS = 250
const DONE_DELAY = 500

export default function AnimatedDice({ values, color, onComplete }: Props) {
  const [display, setDisplay] = useState<[number, number, number]>([1, 1, 1])
  const [settled, setSettled] = useState<[boolean, boolean, boolean]>([false, false, false])
  const [activeDie, setActiveDie] = useState<number | null>(0)
  const ids = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    function flicker(dieIdx: number, startMs: number) {
      const count = Math.floor(FLICKER_DURATION / FLICKER_MS)
      for (let i = 0; i < count; i++) {
        ids.current.push(setTimeout(() => {
          setDisplay(prev => {
            const next = [...prev] as [number, number, number]
            next[dieIdx] = Math.floor(Math.random() * 6) + 1
            return next
          })
        }, startMs + i * FLICKER_MS))
      }
      // Settle
      ids.current.push(setTimeout(() => {
        setDisplay(prev => {
          const next = [...prev] as [number, number, number]
          next[dieIdx] = values[dieIdx]
          return next
        })
        setSettled(prev => {
          const next = [...prev] as [boolean, boolean, boolean]
          next[dieIdx] = true
          return next
        })
        setActiveDie(dieIdx < 2 ? dieIdx + 1 : null)
      }, startMs + FLICKER_DURATION))
    }

    flicker(0, 0)
    flicker(1, FLICKER_DURATION + GAP_MS)
    flicker(2, (FLICKER_DURATION + GAP_MS) * 2)
    ids.current.push(setTimeout(onComplete, (FLICKER_DURATION + GAP_MS) * 3 + DONE_DELAY))

    return () => ids.current.forEach(clearTimeout)
  }, [])

  return (
    <div className={styles.wrap}>
      {([0, 1, 2] as const).map(i => (
        <Die
          key={i}
          value={display[i]}
          active={activeDie === i}
          settled={settled[i]}
          color={color}
        />
      ))}
    </div>
  )
}
