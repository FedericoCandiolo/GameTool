import styles from './Instructions.module.css'

interface Props {
  onClose: () => void
}

export default function Instructions({ onClose }: Props) {
  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>How to Play</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.body}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>🏆 Goal</h3>
            <p>Be the first player to collect <strong>at least one crown of every category</strong>. You can hold multiple crowns per category as shields against theft.</p>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>🎲 Your Turn</h3>
            <p>Spin the roulette. It lands on a <strong>Category</strong> (5/6 chance) or a <strong>Duel</strong> (1/6 chance). Then dice are rolled to pick your question.</p>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>📖 Category Question</h3>
            <ul>
              <li><strong>Answer without options:</strong> Correct → earn a crown + keep spinning. Wrong → turn ends.</li>
              <li><strong>Answer with options:</strong> Correct → keep spinning (no crown). Wrong → turn ends.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>⚔ Duel</h3>
            <p>Challenge an opponent for one of their crowns (they must own one). A third player arbitrates.</p>
            <ul>
              <li><strong>Without options</strong> — arbiter reveals answer and declares winner:
                <ul>
                  <li>Challenger wins → steal crown + keep spinning.</li>
                  <li>Challenged wins → challenger's turn ends.</li>
                </ul>
              </li>
              <li><strong>With options</strong> (both agree) — arbiter judges who answered correctly first:
                <ul>
                  <li>Challenger wins or challenged fails → challenger keeps spinning (no crown stolen).</li>
                  <li>Challenged wins → challenger's turn ends.</li>
                </ul>
              </li>
            </ul>
            <p>If no opponent has a crown, pick any category and play as normal.</p>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>👑 Crowns</h3>
            <p>Extra crowns of the same color act as shields — each duel loss only removes one. The game ends the moment any player holds at least one crown of each category.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
