import { useEffect, useRef } from 'react'
import type { Category } from '../../types/carreraDeMente'
import styles from './Roulette.module.css'

const CX = 150, CY = 150, R = 132, LABEL_R = 85, INNER_R = 22
const DUEL_ANGLE = 60
const SPIN_MS = 3800
const SPIN_REVS = 5

interface Seg {
  id: string; label: string; color: string; start: number; end: number; isDuel?: boolean
}

function buildSegs(cats: Category[]): Seg[] {
  const n = Math.max(1, cats.length)
  const ca = (360 - DUEL_ANGLE) / n
  return [
    { id: 'duel', label: 'DUEL', color: '#dc2626', start: 0, end: DUEL_ANGLE, isDuel: true },
    ...cats.map((c, i) => ({
      id: c.id, label: c.title, color: c.color,
      start: DUEL_ANGLE + i * ca,
      end: DUEL_ANGLE + (i + 1) * ca,
    })),
  ]
}

// Clockwise-from-top angle → SVG x,y
function xy(deg: number, r: number) {
  const rad = (deg - 90) * Math.PI / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function slicePath(a: number, b: number, r: number) {
  const s = xy(a, r), e = xy(b, r)
  return `M${CX},${CY} L${s.x.toFixed(2)},${s.y.toFixed(2)} A${r},${r},0,${b - a > 180 ? 1 : 0},1,${e.x.toFixed(2)},${e.y.toFixed(2)} Z`
}

function textRot(mid: number) {
  return mid > 90 && mid <= 270 ? mid - 180 : mid
}

// Quartic ease-out: fast start, long gentle deceleration (like a real roulette)
function easeOut(t: number) { return 1 - Math.pow(1 - t, 4) }

interface Props {
  categories: Category[]
  spinning: boolean
  targetId: string | null
  onSpinEnd: (id: string) => void
}

export default function Roulette({ categories, spinning, targetId, onSpinEnd }: Props) {
  const segs = buildSegs(categories)
  const wheelRef = useRef<SVGGElement>(null)
  const currentAngle = useRef(0)    // cumulative rotation in degrees
  const prevSpin = useRef(false)
  const rafRef = useRef<number>()

  // Set SVG rotate(angle, cx, cy) directly — zero CSS transform-origin ambiguity
  function setAngle(angle: number) {
    wheelRef.current?.setAttribute('transform', `rotate(${angle}, ${CX}, ${CY})`)
  }

  useEffect(() => {
    if (spinning && !prevSpin.current && targetId) {
      const seg = segs.find(s => s.id === targetId)
      if (!seg) return

      const mid = (seg.start + seg.end) / 2
      const hw = (seg.end - seg.start) / 2
      const land = mid + (Math.random() - 0.5) * hw * 0.6

      const from = currentAngle.current
      const fromMod = ((from % 360) + 360) % 360
      let extra = ((land - fromMod) + 360) % 360
      if (extra < 45) extra += 360
      const to = from + SPIN_REVS * 360 + extra

      const startTime = performance.now()
      const captured = targetId

      function step(now: number) {
        const t = Math.min((now - startTime) / SPIN_MS, 1)
        setAngle(from + (to - from) * easeOut(t))
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step)
        } else {
          currentAngle.current = to
          onSpinEnd(captured)
        }
      }
      rafRef.current = requestAnimationFrame(step)
    }
    prevSpin.current = spinning
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [spinning, targetId])

  // Reset wheel angle when categories change (new game)
  useEffect(() => {
    currentAngle.current = 0
    setAngle(0)
  }, [categories])

  return (
    <div className={styles.wrap}>
      <svg viewBox="0 0 300 300" className={styles.svg}>
        <defs>
          <filter id="rouletteGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Decorative outer rings (static) */}
        <circle cx={CX} cy={CY} r={R + 10} fill="none" stroke="#0f1e2e" strokeWidth="14" />
        <circle cx={CX} cy={CY} r={R + 10} fill="none" stroke="#1e3552" strokeWidth="1.5" />
        <circle cx={CX} cy={CY} r={R + 4}  fill="none" stroke="#0a1828" strokeWidth="6" />

        {/* Spinning wheel group — no React-controlled transform prop,
            angle is set directly via SVG attribute in the RAF callback */}
        <g ref={wheelRef}>
          {segs.map(seg => {
            const mid = (seg.start + seg.end) / 2
            const lp = xy(mid, LABEL_R)
            const tr = textRot(mid)
            const segW = seg.end - seg.start
            const label = seg.label.length > 9 ? seg.label.slice(0, 8) + '…' : seg.label
            const fs = seg.isDuel ? 12 : Math.max(7, Math.min(11, segW * 0.65))

            return (
              <g key={seg.id}>
                <path d={slicePath(seg.start, seg.end, R)}
                  fill={seg.isDuel ? '#2d0505' : '#0a1625'} stroke="#07111c" strokeWidth="1.5" />
                {/* Color edge band */}
                <path
                  d={`M${xy(seg.start, R - 18).x.toFixed(2)},${xy(seg.start, R - 18).y.toFixed(2)}
                      A${R-18},${R-18},0,${segW > 180 ? 1 : 0},1,
                      ${xy(seg.end, R - 18).x.toFixed(2)},${xy(seg.end, R - 18).y.toFixed(2)}
                      A${R},${R},0,${segW > 180 ? 1 : 0},0,
                      ${xy(seg.start, R).x.toFixed(2)},${xy(seg.start, R).y.toFixed(2)} Z`}
                  fill={seg.color} opacity={seg.isDuel ? 0.85 : 0.75}
                />
                <text x={lp.x.toFixed(2)} y={lp.y.toFixed(2)}
                  textAnchor="middle" dominantBaseline="middle"
                  transform={`rotate(${tr}, ${lp.x.toFixed(2)}, ${lp.y.toFixed(2)})`}
                  fill={seg.isDuel ? '#fca5a5' : seg.color}
                  fontSize={fs} fontFamily="Orbitron, sans-serif" fontWeight="bold"
                >
                  {label}
                </text>
                {seg.isDuel && (() => {
                  const ip = xy(mid, 50)
                  return <text x={ip.x.toFixed(2)} y={ip.y.toFixed(2)}
                    textAnchor="middle" dominantBaseline="middle" fontSize="18"
                    transform={`rotate(${tr}, ${ip.x.toFixed(2)}, ${ip.y.toFixed(2)})`}>⚔</text>
                })()}
                <line x1={CX} y1={CY}
                  x2={xy(seg.start, R).x.toFixed(2)} y2={xy(seg.start, R).y.toFixed(2)}
                  stroke="#07111c" strokeWidth="2" />
              </g>
            )
          })}
          <circle cx={CX} cy={CY} r={INNER_R + 2} fill="#07111c" />
          <circle cx={CX} cy={CY} r={INNER_R}     fill="#0f1e2e" stroke="#1e3552" strokeWidth="1.5" />
          <circle cx={CX} cy={CY} r={5}            fill="#00d4ff" />
        </g>

        {/* Pointer — fixed, rendered above the wheel */}
        <polygon points={`${CX-9},2 ${CX+9},2 ${CX},22`}
          fill="#00d4ff" stroke="#07111c" strokeWidth="1.5"
          filter="url(#rouletteGlow)" />
      </svg>
    </div>
  )
}
