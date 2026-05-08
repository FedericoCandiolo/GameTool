import { useState } from 'react'
import type { Category, Player } from '../../types/carreraDeMente'
import CategoryManager from './CategoryManager'
import styles from './FullGameSetup.module.css'

function mkId() { return crypto.randomUUID() }
function mkPlayer(n: number): Player {
  return { id: mkId(), name: `Player ${n}`, crowns: {} }
}

interface Props {
  categories: Category[]
  onCategoriesChange: (cats: Category[]) => void
  onStart: (players: Player[], categories: Category[]) => void
}

export default function FullGameSetup({ categories, onCategoriesChange, onStart }: Props) {
  const [players, setPlayers] = useState<Player[]>([mkPlayer(1), mkPlayer(2)])

  function updateName(id: string, name: string) {
    setPlayers(ps => ps.map(p => p.id === id ? { ...p, name } : p))
  }

  function addPlayer() {
    setPlayers(ps => [...ps, mkPlayer(ps.length + 1)])
  }

  function removePlayer(id: string) {
    if (players.length <= 2) return
    setPlayers(ps => ps.filter(p => p.id !== id))
  }

  const canStart = categories.length >= 1 && players.length >= 2 &&
    players.every(p => p.name.trim().length > 0)

  function handleStart() {
    if (!canStart) return
    onStart(players.map(p => ({ ...p, name: p.name.trim() })), categories)
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.gameTitle}>Carrera de Mente</h1>

      <div className={styles.columns}>
        {/* Categories column */}
        <div className={styles.column}>
          <CategoryManager categories={categories} onChange={onCategoriesChange} />
        </div>

        {/* Players column */}
        <div className={styles.column}>
          <p className={styles.colTitle}>Players</p>
          <div className={styles.playerList}>
            {players.map((p, i) => (
              <div key={p.id} className={styles.playerRow}>
                <span className={styles.playerNum}>{i + 1}</span>
                <input
                  className={styles.input}
                  value={p.name}
                  onChange={e => updateName(p.id, e.target.value)}
                  placeholder={`Player ${i + 1}`}
                  maxLength={20}
                />
                {players.length > 2 && (
                  <button className={styles.removeBtn} onClick={() => removePlayer(p.id)}>✕</button>
                )}
              </div>
            ))}
          </div>
          <button className={styles.addPlayerBtn} onClick={addPlayer}>+ Add Player</button>
        </div>
      </div>

      <div className={styles.footer}>
        <button
          className={styles.startBtn}
          disabled={!canStart}
          onClick={handleStart}
        >
          ▶ Start Game
        </button>
        {!canStart && (
          <p className={styles.hint}>
            {categories.length === 0
              ? 'Load at least one category to start.'
              : 'All players need a name.'}
          </p>
        )}
      </div>
    </div>
  )
}
