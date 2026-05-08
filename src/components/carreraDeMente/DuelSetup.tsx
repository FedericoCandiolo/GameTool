import type { Player, Category } from '../../types/carreraDeMente'
import styles from './DuelSetup.module.css'

interface Props {
  challenger: Player
  players: Player[]
  categories: Category[]
  onChallenge: (targetPlayerId: string, categoryId: string) => void
  onPickCategory: (categoryId: string) => void  // when no crowns available
}

export default function DuelSetup({ challenger, players, categories, onChallenge, onPickCategory }: Props) {
  const opponents = players.filter(p => p.id !== challenger.id)
  const opponentsWithCrowns = opponents.filter(p =>
    categories.some(cat => (p.crowns[cat.id] ?? 0) > 0)
  )
  const noCrowns = opponentsWithCrowns.length === 0

  return (
    <div className={styles.wrap}>
      {noCrowns ? (
        <>
          <p className={styles.noCrownsMsg}>
            <span className={styles.icon}>⚔</span>
            No crowns to steal yet!<br />
            <span className={styles.sub}>Pick a category and play as normal.</span>
          </p>
          <div className={styles.catGrid}>
            {categories.map(cat => (
              <button
                key={cat.id}
                className={styles.catBtn}
                style={{ borderColor: cat.color, color: cat.color }}
                onClick={() => onPickCategory(cat.id)}
              >
                {cat.title}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className={styles.heading}>
            <span className={styles.icon}>⚔</span>
            Choose your target
          </p>
          <div className={styles.opponents}>
            {opponentsWithCrowns.map(opp => (
              <div key={opp.id} className={styles.oppRow}>
                <span className={styles.oppName}>{opp.name}</span>
                <div className={styles.crownRow}>
                  {categories.map(cat => {
                    const count = opp.crowns[cat.id] ?? 0
                    if (count === 0) return null
                    return (
                      <button
                        key={cat.id}
                        className={styles.crownBtn}
                        style={{ borderColor: cat.color }}
                        onClick={() => onChallenge(opp.id, cat.id)}
                        title={`Challenge ${opp.name} for a ${cat.title} crown (×${count})`}
                      >
                        <span style={{ color: cat.color, fontSize: '1.1rem' }}>♛</span>
                        <span className={styles.crownLabel} style={{ color: cat.color }}>{cat.title}</span>
                        {count > 1 && <span className={styles.crownCount} style={{ color: cat.color }}>×{count}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
