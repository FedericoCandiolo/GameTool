export interface Team {
  id: string
  name: string
  members: [string, string] // [clueGiver, guesser] — roles alternate each round
  score: number
}

export interface RoundRecord {
  roundNumber: number
  teamId: string
  teamName: string
  clueGiver: string
  guesser: string
  clue: string
  points: number
}

export interface GameState {
  teams: Team[]
  currentTeamIndex: number
  roundNumber: number
  history: RoundRecord[]
}
