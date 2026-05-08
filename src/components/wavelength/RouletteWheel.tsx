import React, { useCallback, useRef } from 'react'

// SVG viewport: 400 wide × 220 tall
// Circle center: (200, 200) — at the very bottom, so only the top half is visible
const CX = 200
const CY = 200
const R = 185
const R_INNER = 30 // hub radius


// Convert game angle (0=left edge, 90=top, 180=right edge) → SVG {x,y}
function toXY(angleDeg: number, radius: number = R) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: CX - radius * Math.cos(rad),
    y: CY - radius * Math.sin(rad),
  }
}

// SVG arc path for a sector between two game angles.
// In SVG (y-down), going from toXY(a1) → toXY(a2) through the TOP arc requires sweep=1.
// The return trip (a2 → a1) through the same top region uses sweep=0.
function sectorPath(a1: number, a2: number, rOuter: number = R, rInner: number = 0): string {
  if (Math.abs(a2 - a1) < 0.01) return ''
  const s = toXY(a1, rOuter)
  const e = toXY(a2, rOuter)
  const span = a2 - a1
  const largeArc = span > 180 ? 1 : 0

  if (rInner === 0) {
    return [
      `M ${CX} ${CY}`,
      `L ${s.x} ${s.y}`,
      `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${e.x} ${e.y}`,
      'Z',
    ].join(' ')
  }

  const si = toXY(a1, rInner)
  const ei = toXY(a2, rInner)
  return [
    `M ${si.x} ${si.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 1 ${ei.x} ${ei.y}`,
    `L ${e.x} ${e.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${s.x} ${s.y}`,
    'Z',
  ].join(' ')
}

// Draw a zone (with wrap-around at 0° / 180° edges)
function ZoneSector({
  sweetSpot,
  halfWidth,
  color,
}: {
  sweetSpot: number
  halfWidth: number
  color: string
}) {
  const paths: React.ReactNode[] = []
  const a1 = sweetSpot - halfWidth
  const a2 = sweetSpot + halfWidth

  // Primary segment (clamped to [0,180])
  const pa1 = Math.max(0, a1)
  const pa2 = Math.min(180, a2)
  if (pa2 > pa1) {
    paths.push(<path key="main" d={sectorPath(pa1, pa2, R, R_INNER)} fill={color} />)
  }

  // Overflow past right edge (a2 > 180) → wraps to [0, a2-180]
  if (a2 > 180) {
    const wrap = a2 - 180
    paths.push(<path key="wrap-r" d={sectorPath(0, wrap, R, R_INNER)} fill={color} />)
  }

  // Overflow past left edge (a1 < 0) → wraps to [180+a1, 180]
  if (a1 < 0) {
    const wrap = 180 + a1
    paths.push(<path key="wrap-l" d={sectorPath(wrap, 180, R, R_INNER)} fill={color} />)
  }

  return <>{paths}</>
}

// Tick marks every 10 degrees
function Ticks() {
  return (
    <>
      {Array.from({ length: 19 }, (_, i) => i * 10).map((deg) => {
        const outer = toXY(deg, R)
        const inner = toXY(deg, deg % 90 === 0 ? R - 22 : deg % 30 === 0 ? R - 16 : R - 10)
        return (
          <line
            key={deg}
            x1={outer.x} y1={outer.y}
            x2={inner.x} y2={inner.y}
            stroke="rgba(255,255,255,0.5)"
            strokeWidth={deg % 90 === 0 ? 2.5 : deg % 30 === 0 ? 1.8 : 1}
          />
        )
      })}
    </>
  )
}

// Edge percentage labels placed below the diameter line
// CY = 200, viewBox height = 242, so we have 42px of space below the arc ends
const LABEL_Y = 228
function Labels() {
  return (
    <>
      <text
        x={toXY(0).x + 4} y={LABEL_Y}
        textAnchor="start"
        fill="rgba(255,255,255,0.75)"
        fontSize="15"
        fontFamily="Rajdhani, sans-serif"
        fontWeight="700"
      >
        0%
      </text>
      <text
        x={toXY(180).x - 4} y={LABEL_Y}
        textAnchor="end"
        fill="rgba(255,255,255,0.75)"
        fontSize="15"
        fontFamily="Rajdhani, sans-serif"
        fontWeight="700"
      >
        100%
      </text>
    </>
  )
}

// Needle: thin triangle from hub to rim
const NEEDLE_BASE = 7   // half-width at the base in SVG units
function Needle({ angle }: { angle: number }) {
  const tip   = toXY(angle,      R - 4)
  const base1 = toXY(angle + 90, NEEDLE_BASE)
  const base2 = toXY(angle - 90, NEEDLE_BASE)
  return (
    <g>
      <polygon
        points={`${tip.x},${tip.y} ${base1.x},${base1.y} ${base2.x},${base2.y}`}
        fill="#00e5ff"
        stroke="#00b0d4"
        strokeWidth="0.5"
      />
      <circle cx={CX} cy={CY} r={R_INNER - 4} fill="#0d1b2a" stroke="#00e5ff" strokeWidth="2" />
    </g>
  )
}


export type Phase = 'start' | 'shuffled' | 'closed' | 'guess' | 'reveal'

interface Props {
  phase: Phase
  sweetSpot: number       // 0–180 game degrees
  needleAngle: number     // 0–180 game degrees
  sectionSize: number     // half-width of each scoring band in degrees
  points?: number | null  // shown as overlay in reveal phase
  onNeedleMove?: (angle: number) => void
}

export default function RouletteWheel({ phase, sweetSpot, needleAngle, sectionSize, points, onNeedleMove }: Props) {
  const faceOpen = phase === 'start' || phase === 'shuffled' || phase === 'reveal'
  const showNeedle = phase === 'guess' || phase === 'reveal'
  const showSweetSpot = phase === 'reveal'
  const interactive = phase === 'guess'
  const dragging = useRef(false)

  // Zone half-widths: 5-pt zone is half a section, then one section per outer band
  const z5 = sectionSize / 2
  const z4 = z5 + sectionSize
  const z3 = z4 + sectionSize

  const angleFromEvent = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (400 / rect.width)
    const y = (e.clientY - rect.top) * (242 / rect.height)
    const dx = x - CX
    const dy = CY - y
    let angle = Math.atan2(dy, -dx) * (180 / Math.PI)
    return Math.max(0, Math.min(180, angle))
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!interactive || !onNeedleMove) return
      dragging.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      onNeedleMove(angleFromEvent(e))
    },
    [interactive, onNeedleMove, angleFromEvent]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!interactive || !onNeedleMove || !dragging.current) return
      onNeedleMove(angleFromEvent(e))
    },
    [interactive, onNeedleMove, angleFromEvent]
  )

  const handlePointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  return (
    <svg
      viewBox="0 0 400 242"
      style={{ width: '100%', display: 'block', cursor: interactive ? 'crosshair' : 'default', userSelect: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Outer frame ring */}
      <path
        d={`M ${toXY(0).x} ${toXY(0).y} A ${R + 28} ${R + 28} 0 0 1 ${toXY(180).x} ${toXY(180).y} Z`}
        fill="#1a2a3a"
        stroke="#2a4060"
        strokeWidth="2"
      />

      {/* Face: open shows zones, closed shows cover */}
      {faceOpen ? (
        <>
          {/* Base face color */}
          <path d={sectorPath(0, 180, R, R_INNER)} fill="#162030" />
          {/* Score zones — drawn outermost first so inner overwrites */}
          <ZoneSector sweetSpot={sweetSpot} halfWidth={z3} color="#f5c842" />
          <ZoneSector sweetSpot={sweetSpot} halfWidth={z4} color="#f07d20" />
          <ZoneSector sweetSpot={sweetSpot} halfWidth={z5} color="#e03030" />
          {/* Re-draw hub on top */}
          <circle cx={CX} cy={CY} r={R_INNER} fill="#0d1b2a" stroke="#2a4060" strokeWidth="2" />
          <Ticks />
          <Labels />
        </>
      ) : (
        <>
          {/* Closed face */}
          <path d={sectorPath(0, 180, R, R_INNER)} fill="#0d1b2a" />
          {/* Subtle grid lines */}
          {Array.from({ length: 7 }, (_, i) => (i + 1) * 22.5).map((deg) => {
            const outer = toXY(deg, R)
            return (
              <line
                key={deg}
                x1={CX} y1={CY}
                x2={outer.x} y2={outer.y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="1"
              />
            )
          })}
          {/* Hub */}
          <circle cx={CX} cy={CY} r={R_INNER} fill="#0d1b2a" stroke="#1a3050" strokeWidth="2" />
          <Ticks />
          <Labels />
        </>
      )}

      {/* Needle */}
      {showNeedle && <Needle angle={needleAngle} />}

      {/* Sweet-spot marker: a subtle line from hub to rim at the target angle */}
      {showSweetSpot && (() => {
        const tip = toXY(sweetSpot, R - 4)
        return <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeDasharray="4 3" />
      })()}

      {/* Diameter baseline */}
      <line
        x1={toXY(0).x} y1={CY}
        x2={toXY(180).x} y2={CY}
        stroke="#2a4060" strokeWidth="2"
      />

      {/* Points overlay — rendered inside the SVG so it scales with the wheel */}
      {showSweetSpot && points != null && (
        <g style={{ pointerEvents: 'none' }}>
          {/* Dark backdrop so text stays legible over any zone colour */}
          <rect
            x="148" y="88" width="104" height="84"
            rx="14"
            fill="rgba(7,17,28,0.80)"
            stroke="rgba(0,212,255,0.18)"
            strokeWidth="1"
          />
          {/* Points number */}
          <text
            x="200" y="148"
            textAnchor="middle"
            fill="#00d4ff"
            fontSize="52"
            fontFamily="Orbitron, sans-serif"
            fontWeight="900"
            style={{ filter: 'drop-shadow(0 0 10px rgba(0,212,255,0.6))' }}
          >
            {points}
          </text>
          {/* "POINTS" label */}
          <text
            x="200" y="165"
            textAnchor="middle"
            fill="rgba(255,255,255,0.55)"
            fontSize="12"
            fontFamily="Rajdhani, sans-serif"
            fontWeight="700"
            letterSpacing="4"
          >
            POINTS
          </text>
        </g>
      )}
    </svg>
  )
}

