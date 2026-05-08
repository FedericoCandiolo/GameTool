export interface Question {
  roll: string
  question: string
  correctAnswer: string
  wrongOptions: [string, string]
}

export interface Category {
  id: string
  title: string
  language: string
  color: string
  questions: Record<string, Question>
  fileName: string
  fileBuffer: ArrayBuffer
}

export interface Player {
  id: string
  name: string
  crowns: Record<string, number>  // categoryId → count
}

// Phase of the full game turn
export type TurnPhase =
  | 'spin'              // waiting to spin
  | 'spinning'          // roulette animating
  | 'spin-result'       // result announced, awaiting click
  | 'dice-rolling'      // dice animating
  | 'question'          // question visible, no answer/options
  | 'answer-reveal'     // answer shown, arbiter judges
  | 'options'           // options shown, player picks
  | 'feedback'          // correct/wrong after options pick
  | 'duel-pick'         // picking opponent + crown
  | 'duel-question'     // duel question (no answer/options)
  | 'duel-answer-reveal'// duel answer visible
  | 'duel-options'      // duel options visible
  | 'turn-transition'   // between turns
  | 'game-over'

export interface FullGame {
  players: Player[]
  categories: Category[]
  currentPlayerIndex: number
  phase: TurnPhase
  // spin
  spinResult: 'duel' | string | null
  // dice + question
  roll: [number, number, number] | null
  activeCategoryId: string | null
  question: Question | null
  shuffledOptions: string[]
  usedOptions: boolean
  selectedAnswer: string | null
  // duel
  duelChallengedPlayerId: string | null
  duelChallengedCategoryId: string | null
  duelUsedOptions: boolean
  // outcome
  winner: Player | null
}

// MVP-only phase (used in single-player/no-game-state mode)
export type GamePhase = 'setup' | 'dice' | 'question' | 'options' | 'answered'
