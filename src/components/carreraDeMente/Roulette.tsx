import { useEffect, useRef, useState } from 'react'
import type { Category } from '../../types/carreraDeMente'
import styles from './Roulette.module.css'

const CX = 150, CY = 150, R = 132, LABEL_R = 85, INNER_R = 22
const DUEL_ANGLE = 60
const SPIN_MS = 3800
const SPIN_REVS = 5

interface Seg {
  id: string
  label: string
  color: string
  start: number
  end: number
  isDuel?: boolean
}

function buildSegs(cats: Category[]): Seg[] {
  const n = Math.max(1, cats.length)
  const ca = (360 - DUEL_ANGLE) / n
  return [
    { id: 'duel', label: 'DUEL', color: '#dc2626', start: 0, end: DUEL_ANGLE, isDuel: true },
    ...cats.map((c, i) => ({
      id: c.id,
      label: c.title,
      color: c.color,
      start: DUEL_ANGLE + i * ca,
      end: DUEL_ANGLE + (i + 1) * ca,
    })),
  ]
}

// Clockwise-from-top angle → SVG xy
function xy(deg: number, r: number) {
  const rad = (deg - 90) * Math.PI / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function slice(a: number, b: number, r: number) {
  const s = xy(a, r), e = xy(b, r)
  const lg = b - a > 180 ? 1 : 0
  return `M${CX},${CY} L${s.x.toFixed(2)},${s.y.toFixed(2)} A${r},${r},0,${lg},1,${e.x.toFixed(2)},${e.y.toFixed(2)} Z`
}

// Text rotation: always reads radially outward (right-side-up)
function textRot(mid: number) {
  return mid > 90 && mid <= 270 ? mid - 180 : mid
}

interface Props {
  categories: Category[]
  spinning: boolean
  targetId: string | null
  onSpinEnd: (id: string) => void
}

export default function Roulette({ categories, spinning, targetId, onSpinEnd }: Props) {
  const segs = buildSegs(categories)
  const [rot, setRot] = useState(0)
  const [animating, setAnimating] = useState(false)
  const prevSpin = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (spinning && !prevSpin.current && targetId) {
      const seg = segs.find(s => s.id === targetId)
      if (!seg) return
      const mid = (seg.start + seg.end) / 2
      const hw = (seg.end - seg.start) / 2
      const land = mid + (Math.random() - 0.5) * hw * 0.6

      const curMod = ((rot % 360) + 360) % 360
      let extra = ((land - curMod) + 360) % 360
      if (extra < 45) extra += 360

      const target = rot + SPIN_REVS * 360 + extra
      setAnimating(true)
      setRot(target)
      timer.current = setTimeout(() => {
        setAnimating(false)
        onSpinEnd(targetId)
      }, SPIN_MS + 250)
    }
    prevSpin.current = spinning
    return () => clearTimeout(timer.current)
  }, [spinning, targetId])

  return (
    <div className={styles.wrap}>
      <svg viewBox="0 0 300 300" className={styles.svg}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Decorative outer rings */}
        <circle cx={CX} cy={CY} r={R + 10} fill="none" stroke="#0f1e2e" strokeWidth="14" />
        <circle cx={CX} cy={CY} r={R + 10} fill="none" stroke="#1e3552" strokeWidth="1.5" />
        <circle cx={CX} cy={CY} r={R + 4}  fill="none" stroke="#0a1828" strokeWidth="6" />

        {/* Spinning wheel */}
        <g style={{
          transformOrigin: `${CX}px ${CY}px`,
          transform: `rotate(${rot}deg)`,
          transition: animating ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.85, 0.25, 1)` : 'none',
        }}>
          {segs.map(seg => {
            const mid = (seg.start + seg.end) / 2
            const lp = xy(mid, LABEL_R)
            const tr = textRot(mid)
            const segW = seg.end - seg.start
            const label = seg.label.length > 9 ? seg.label.slice(0, 8) + '…' : seg.label
            const fs = seg.isDuel ? 12 : Math.max(7, Math.min(11, segW * 0.65))

            return (
              <g key={seg.id}>
                {/* Main slice */}
                <path
                  d={slice(seg.start, seg.end, R)}
                  fill={seg.isDuel ? '#2d0505' : '#0a1625'}
                  stroke="#07111c"
                  strokeWidth="1.5"
                />
                {/* Color accent band near edge */}
                <path
                  d={`M${xy(seg.start, R - 18).x.toFixed(2)},${xy(seg.start, R - 18).y.toFixed(2)}
                      A${R - 18},${R - 18},0,${seg.end - seg.start > 180 ? 1 : 0},1,
                      ${xy(seg.end, R - 18).x.toFixed(2)},${xy(seg.end, R - 18).y.toFixed(2)}
                      A${R},${R},0,${seg.end - seg.start > 180 ? 1 : 0},0,
                      ${xy(seg.start, R).x.toFixed(2)},${xy(seg.start, R).y.toFixed(2)} Z`}
                  fill={seg.color}
                  opacity={seg.isDuel ? 0.85 : 0.75}
                />
                {/* Label */}
                <text
                  x={lp.x.toFixed(2)}
                  y={lp.y.toFixed(2)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${tr},${lp.x.toFixed(2)},${lp.y.toFixed(2)})`}
                  fill={seg.isDuel ? '#fca5a5' : seg.color}
                  fontSize={fs}
                  fontFamily="Orbitron, sans-serif"
                  fontWeight="bold"
                  style={{ textShadow: 'none' }}
                >
                  {label}
                </text>
                {/* Duel sword icon */}
                {seg.isDuel && (() => {
                  const ip = xy(mid, 50)
                  return (
                    <text
                      x={ip.x.toFixed(2)} y={ip.y.toFixed(2)}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize="18"
                      transform={`rotate(${tr},${ip.x.toFixed(2)},${ip.y.toFixed(2)})`}
                    >⚔</text>
                  )
                })()}
                {/* Divider lines */}
                <line
                  x1={CX} y1={CY}
                  x2={xy(seg.start, R).x.toFixed(2)} y2={xy(seg.start, R).y.toFixed(2)}
                  stroke="#07111c" strokeWidth="2"
                />
              </g>
            )
          })}

          {/* Center hub */}
          <circle cx={CX} cy={CY} r={INNER_R + 2} fill="#07111c" />
          <circle cx={CX} cy={CY} r={INNER_R}     fill="#0f1e2e" stroke="#1e3552" strokeWidth="1.5" />
          <circle cx={CX} cy={CY} r={5}            fill="#00d4ff" />
        </g>

        {/* Pointer (fixed, above wheel) */}
        <polygon
          points={`${CX - 9},2 ${CX + 9},2 ${CX},22`}
          fill="#00d4ff"
          stroke="#07111c"
          strokeWidth="1.5"
          filter="url(#glow)"
        />
        {/* Pointer base circle */}
        <circle cx={CX} cy={CY - R - 10} r={5} fill="#00d4ff" opacity="0.6" />
      </svg>
    </div>
  )
}
