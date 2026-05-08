import { Link } from 'react-router-dom'
import styles from './Home.module.css'

const games = [
  {
    id: 'wavelength',
    name: 'Wavelength',
    description: 'Guess where on the spectrum your partner placed the needle.',
    path: '/wavelength',
    icon: '〰️',
  },
  {
    id: 'carrera-de-mente',
    name: 'Carrera de Mente',
    description: 'Roll three dice, pick a category, and race through trivia questions.',
    path: '/carrera-de-mente',
    icon: '🎲',
  },
]

export default function Home() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>GameTool</h1>
        <p className={styles.subtitle}>Table-top companion</p>
      </header>
      <main className={styles.grid}>
        {games.map((game) => (
          <Link key={game.id} to={game.path} className={styles.card}>
            <span className={styles.cardIcon}>{game.icon}</span>
            <h2 className={styles.cardName}>{game.name}</h2>
            <p className={styles.cardDesc}>{game.description}</p>
          </Link>
        ))}
      </main>
    </div>
  )
}
