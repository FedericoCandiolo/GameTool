import type { Category, FullGame } from '../types/carreraDeMente'

type SavedCategory = Omit<Category, 'fileBuffer'> & { fileBuffer: string }
type SavedGame    = Omit<FullGame, 'categories'>  & { categories: SavedCategory[] }

interface GameSaveFile { version: 1; savedAt: string; game: SavedGame }

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export function saveGame(game: FullGame): void {
  const save: GameSaveFile = {
    version: 1,
    savedAt: new Date().toISOString(),
    game: {
      ...game,
      categories: game.categories.map(c => ({ ...c, fileBuffer: bufferToBase64(c.fileBuffer) })),
    },
  }
  const blob = new Blob([JSON.stringify(save)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `cdm-save-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10000)
}

export function loadGameFromFile(): Promise<FullGame | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) { resolve(null); return }
      try {
        const save = JSON.parse(await file.text()) as GameSaveFile
        if (save.version !== 1 || !save.game) { resolve(null); return }
        resolve({
          ...save.game,
          // Reset mid-animation phases so the board is in a stable state
          phase: ['spinning', 'dice-rolling'].includes(save.game.phase) ? 'spin' : save.game.phase,
          categories: save.game.categories.map(c => ({ ...c, fileBuffer: base64ToBuffer(c.fileBuffer) })),
        })
      } catch { resolve(null) }
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}
