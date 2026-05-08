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

export type GamePhase = 'setup' | 'dice' | 'question' | 'options' | 'answered'
