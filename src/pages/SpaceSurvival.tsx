import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import styles from './SpaceSurvival.module.css'

// The game is a standalone HTML page (see the "Space Survival" folder); vite
// serves it as-is from here. It is framed rather than bundled so it keeps
// running on its own too.
const GAME_URL = `${import.meta.env.BASE_URL}games/space-survival/index.html`

export default function SpaceSurvival() {
  const stageRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [started, setStarted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // The game listens for keys on its own window, so the iframe needs focus.
  const focusGame = useCallback(() => {
    setStarted(true)
    frameRef.current?.focus()
    frameRef.current?.contentWindow?.focus()
  }, [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else stageRef.current?.requestFullscreen().then(focusGame, () => {})
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.back}>← Menu</Link>
        <h1 className={styles.title}>Space Survival</h1>
        <div className={styles.headerRight}>
          <span className={styles.hint}>W A S D · Space · Click · P</span>
          <button className="btn btn--ghost" onClick={toggleFullscreen}>
            {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </header>

      <div className={styles.stage} ref={stageRef} onClick={focusGame}>
        <iframe
          ref={frameRef}
          className={styles.frame}
          src={GAME_URL}
          title="Space Survival"
          allow="autoplay; fullscreen"
        />
        {!started && (
          <button className={styles.overlay} onClick={focusGame}>
            <span className={styles.overlayTitle}>Space Survival</span>
            <span className={styles.overlayHint}>Click to play</span>
          </button>
        )}
      </div>
    </div>
  )
}
