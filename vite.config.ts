import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const BASE = '/GameTool/'

// Space Survival is a plain HTML/JS game that lives in its own folder. It is not
// bundled: these files are served as-is in dev and copied into dist on build, so
// the game keeps working on its own (double-click index.html) as well as inside
// the app. "RAW Scratch" (the original Scratch project, ~90 MB) and assets/ (the
// sources the packer embeds into js/assets-embebidos.js) are left out on purpose.
const GAME_DIR = path.join(root, 'Space Survival')
const GAME_PATH = 'games/space-survival'
const GAME_FILES = ['index.html', 'estilos.css', 'config.js', 'icono.png', 'js']

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
}

function spaceSurvival(): Plugin {
  const prefix = BASE + GAME_PATH + '/'
  return {
    name: 'space-survival',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0]
        if (!url.startsWith(prefix)) return next()
        let rel = decodeURIComponent(url.slice(prefix.length))
        if (rel === '' || rel.endsWith('/')) rel += 'index.html'
        const file = path.join(GAME_DIR, rel)
        if (!file.startsWith(GAME_DIR) || !fs.existsSync(file)) return next()
        res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream')
        fs.createReadStream(file).pipe(res)
      })
    },
    closeBundle() {
      const out = path.join(root, 'dist', GAME_PATH)
      fs.mkdirSync(out, { recursive: true })
      for (const name of GAME_FILES) {
        fs.cpSync(path.join(GAME_DIR, name), path.join(out, name), { recursive: true })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), spaceSurvival()],
  base: BASE,
})
