import type { Player, Category } from '../../types/carreraDeMente'
import styles from './PlayerBoard.module.css'

interface Props {
  players: Player[]
  categories: Category[]
  currentIndex: number
}

export default function PlayerBoard({ players, categories, currentIndex }: Props) {
  return (
    <div className={styles.board}>
      {players.map((p, i) => {
        const isCurrent = i === currentIndex
        const totalCrowns = Object.values(p.crowns).reduce((s, n) => s + n, 0)
        return (
          <div
            key={p.id}
            className={`${styles.player} ${isCurrent ? styles.playerCurrent : ''}`}
          >
            <span className={styles.name} title={p.name}>{p.name}</span>
            <div className={styles.crowns}>
              {categories.map(cat => {
                const count = p.crowns[cat.id] ?? 0
                if (count === 0) return null
                return Array.from({ length: count }, (_, j) => (
                  <span
                    key={`${cat.id}-${j}`}
                    className={styles.crown}
                    style={{ color: cat.color, textShadow: `0 0 6px ${cat.color}88` }}
                    title={cat.title}
                  >♛</span>
                ))
              })}
              {totalCrowns === 0 && (
                <span className={styles.noCrowns}>—</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
