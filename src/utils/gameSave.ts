import type { Category, FullGame } from '../types/carreraDeMente'
import { parseExcelCategory } from './parseExcel'

interface CategoryMeta {
  id: string; title: string; language: string; color: string; fileName: string
}

interface GameJson {
  version: 2
  savedAt: string
  categories: CategoryMeta[]
  players: FullGame['players']
  currentPlayerIndex: number
  phase: FullGame['phase']
  spinResult: FullGame['spinResult']
  roll: FullGame['roll']
  activeCategoryId: FullGame['activeCategoryId']
  question: FullGame['question']
  shuffledOptions: FullGame['shuffledOptions']
  usedOptions: boolean
  selectedAnswer: FullGame['selectedAnswer']
  duelChallengedPlayerId: FullGame['duelChallengedPlayerId']
  duelChallengedCategoryId: FullGame['duelChallengedCategoryId']
  duelUsedOptions: boolean
  winner: FullGame['winner']
}

async function getJSZip() {
  const { default: JSZip } = await import('jszip')
  return JSZip
}

export async function saveGame(game: FullGame): Promise<void> {
  const JSZip = await getJSZip()
  const zip = new JSZip()

  const gameJson: GameJson = {
    version: 2,
    savedAt: new Date().toISOString(),
    categories: game.categories.map(c => ({
      id: c.id, title: c.title, language: c.language, color: c.color, fileName: c.fileName,
    })),
    players: game.players,
    currentPlayerIndex: game.currentPlayerIndex,
    phase: ['spinning', 'dice-rolling'].includes(game.phase) ? 'spin' : game.phase,
    spinResult: game.spinResult,
    roll: game.roll,
    activeCategoryId: game.activeCategoryId,
    question: game.question,
    shuffledOptions: game.shuffledOptions,
    usedOptions: game.usedOptions,
    selectedAnswer: game.selectedAnswer,
    duelChallengedPlayerId: game.duelChallengedPlayerId,
    duelChallengedCategoryId: game.duelChallengedCategoryId,
    duelUsedOptions: game.duelUsedOptions,
    winner: game.winner,
  }

  zip.file('game.json', JSON.stringify(gameJson, null, 2))

  const folder = zip.folder('categories')!
  for (const cat of game.categories) {
    folder.file(cat.fileName, cat.fileBuffer)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `cdm-save-${new Date().toISOString().slice(0, 10)}.zip`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10000)
}

export async function loadGameFromFile(): Promise<FullGame | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.zip,application/zip'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      try {
        const JSZip = await getJSZip()
        const zip = await new JSZip().loadAsync(await file.arrayBuffer())

        const gameFile = zip.file('game.json')
        if (!gameFile) { resolve(null); return }
        const gj = JSON.parse(await gameFile.async('text')) as GameJson
        if (gj.version !== 2) { resolve(null); return }

        const categories: Category[] = []
        for (const meta of gj.categories) {
          const excelFile = zip.file(`categories/${meta.fileName}`)
          if (!excelFile) continue
          const buf = await excelFile.async('arraybuffer')
          const cat = await parseExcelCategory(buf, meta.fileName, meta.color, meta.id)
          categories.push({ ...cat, title: meta.title, language: meta.language })
        }

        resolve({
          categories,
          players: gj.players,
          currentPlayerIndex: gj.currentPlayerIndex,
          phase: gj.phase,
          spinResult: gj.spinResult,
          roll: gj.roll,
          activeCategoryId: gj.activeCategoryId,
          question: gj.question,
          shuffledOptions: gj.shuffledOptions,
          usedOptions: gj.usedOptions,
          selectedAnswer: gj.selectedAnswer,
          duelChallengedPlayerId: gj.duelChallengedPlayerId,
          duelChallengedCategoryId: gj.duelChallengedCategoryId,
          duelUsedOptions: gj.duelUsedOptions,
          winner: gj.winner,
        })
      } catch { resolve(null) }
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}
