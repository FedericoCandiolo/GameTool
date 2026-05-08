import { useState } from 'react'
import type { GameState } from '../../types/game'
import { exportScoreboard } from '../../utils/exportScoreboard'
import styles from './ScorePanel.module.css'

interface Props {
  gameState: GameState
  onClose: () => void
  onRestart: () => void
  onFinish: () => void
  onSave: () => boolean
  onLoad: () => boolean
}

const PTS_COLOR: Record<number, string> = {
  5: '#e03030',
  4: '#f07d20',
  3: '#f5c842',
  0: '#6a8aaa',
}

export default function ScorePanel({ gameState, onClose, onRestart, onFinish, onSave, onLoad }: Props) {
  const sorted = [...gameState.teams].sort((a, b) => b.score - a.score)
  const [statusMsg, setStatusMsg] = useState('')

  const flash = (msg: string) => {
    setStatusMsg(msg)
    setTimeout(() => setStatusMsg(''), 2200)
  }

  const handleSave = () => { flash(onSave() ? '✓ Game saved' : '✕ Save failed') }
  const handleLoad = () => { flash(onLoad() ? '✓ Game loaded' : '✕ No save found') }

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.panel} id="score-panel-root">
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Scoreboard</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Standings */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Standings</h3>
          <div className={styles.standings}>
            {sorted.map((team, rank) => (
              <div key={team.id} className={styles.standingRow}>
                <span className={styles.rank}>{rank + 1}</span>
                <span className={styles.teamName}>{team.name}</span>
                <span className={styles.teamMembers}>{team.members[0]} &amp; {team.members[1]}</span>
                <span className={styles.teamScore}>{team.score}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Round history */}
        {gameState.history.length > 0 && (
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Round History</h3>
            <div className={styles.historyList}>
              {[...gameState.history].reverse().map((r, i) => (
                <div key={i} className={styles.historyRow}>
                  <span className={styles.histRound}>R{r.roundNumber}</span>
                  <div className={styles.histMain}>
                    <span className={styles.histTeam}>{r.teamName}</span>
                    <span className={styles.histPlayers}>{r.clueGiver} → {r.guesser}</span>
                    {r.clue && <span className={styles.histClue}>"{r.clue}"</span>}
                  </div>
                  <span
                    className={styles.histPoints}
                    style={{ color: PTS_COLOR[r.points] ?? 'var(--color-muted)' }}
                  >
                    {r.points}pts
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          {statusMsg && <span className={styles.statusMsg}>{statusMsg}</span>}
          <button className={styles.actionBtn} onClick={handleSave}>💾 Save</button>
          <button className={styles.actionBtn} onClick={handleLoad}>📂 Load</button>
          <button className={styles.actionBtn} onClick={() => exportScoreboard(gameState)}>📷 Export</button>
          <button className={`${styles.actionBtn} ${styles.warnBtn}`} onClick={onRestart}>↺ Restart</button>
          <button className={`${styles.actionBtn} ${styles.dangerBtn}`} onClick={onFinish}>✕ Finish</button>
        </div>
      </div>
    </div>
  )
}
