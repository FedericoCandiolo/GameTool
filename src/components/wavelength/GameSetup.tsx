import { useState } from 'react'
import type { Team } from '../../types/game'
import styles from './GameSetup.module.css'

interface Props {
  onStart: (teams: Team[]) => void
  onCancel: () => void
  onLoad: () => void
}

function makeId() {
  return Math.random().toString(36).slice(2)
}

function emptyTeam(): Team {
  return { id: makeId(), name: '', members: ['', ''], score: 0 }
}

export default function GameSetup({ onStart, onCancel, onLoad }: Props) {
  const [teams, setTeams] = useState<Team[]>([emptyTeam(), emptyTeam()])

  const updateTeam = (i: number, field: 'name' | 0 | 1, value: string) => {
    setTeams(prev => prev.map((t, idx) => {
      if (idx !== i) return t
      if (field === 'name') return { ...t, name: value }
      const members: [string, string] = [...t.members] as [string, string]
      members[field] = value
      return { ...t, members }
    }))
  }

  const addTeam = () => setTeams(prev => [...prev, emptyTeam()])
  const removeTeam = (i: number) => setTeams(prev => prev.filter((_, idx) => idx !== i))

  const valid = teams.length >= 2 && teams.every(t =>
    t.name.trim() && t.members[0].trim() && t.members[1].trim()
  )

  const handleStart = () => {
    if (!valid) return
    onStart(teams.map(t => ({
      ...t,
      name: t.name.trim(),
      members: [t.members[0].trim(), t.members[1].trim()],
    })))
  }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.modal}>
        <h2 className={styles.modalTitle}>Create Game</h2>

        <div className={styles.teamList}>
          {teams.map((team, i) => (
            <div key={team.id} className={styles.teamCard}>
              <div className={styles.teamHeader}>
                <span className={styles.teamNum}>Team {i + 1}</span>
                {teams.length > 2 && (
                  <button className={styles.removeBtn} onClick={() => removeTeam(i)} aria-label="Remove team">✕</button>
                )}
              </div>
              <input
                className={styles.input}
                placeholder="Team name"
                value={team.name}
                onChange={e => updateTeam(i, 'name', e.target.value)}
                maxLength={24}
              />
              <div className={styles.membersRow}>
                <input
                  className={styles.input}
                  placeholder="Player 1 name"
                  value={team.members[0]}
                  onChange={e => updateTeam(i, 0, e.target.value)}
                  maxLength={18}
                />
                <input
                  className={styles.input}
                  placeholder="Player 2 name"
                  value={team.members[1]}
                  onChange={e => updateTeam(i, 1, e.target.value)}
                  maxLength={18}
                />
              </div>
            </div>
          ))}
        </div>

        <button className={styles.addTeamBtn} onClick={addTeam}>+ Add team</button>

        <div className={styles.modalDivider} />

        <div className={styles.modalActions}>
          <button className={styles.loadBtn} onClick={onLoad}>📂 Load saved game</button>
          <div className={styles.modalActionsRight}>
            <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
            <button className={styles.startBtn} onClick={handleStart} disabled={!valid}>
              Start Game
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
