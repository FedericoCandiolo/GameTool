import styles from './DiceSelector.module.css'

// Dot positions per face value: grid cell indices (0-8, row-major in a 3x3 grid)
const DOT_POSITIONS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

function DieFace({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const dots = DOT_POSITIONS[value]

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    onChange(e.deltaY < 0 ? Math.min(6, value + 1) : Math.max(1, value - 1))
  }

  return (
    <div className={styles.dieWrap}>
      <button className={styles.dieBtn} onClick={() => onChange(Math.min(6, value + 1))}>▲</button>
      <div
        className={styles.dieFace}
        onWheel={handleWheel}
        onClick={() => onChange(value === 6 ? 1 : value + 1)}
        title={`Die: ${value}`}
      >
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className={dots.includes(i) ? styles.dot : styles.dotHidden} />
        ))}
      </div>
      <button className={styles.dieBtn} onClick={() => onChange(Math.max(1, value - 1))}>▼</button>
    </div>
  )
}

interface Props {
  values: [number, number, number]
  onChange: (values: [number, number, number]) => void
}

export default function DiceSelector({ values, onChange }: Props) {
  function set(idx: number, v: number) {
    const next = [...values] as [number, number, number]
    next[idx] = v
    onChange(next)
  }

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Roll the dice</span>
      <div className={styles.dice}>
        {values.map((v, i) => (
          <DieFace key={i} value={v} onChange={(nv) => set(i, nv)} />
        ))}
      </div>
      <span className={styles.rollCode}>{values.join('')}</span>
    </div>
  )
}
