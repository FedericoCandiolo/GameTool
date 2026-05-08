import type { Category } from '../types/carreraDeMente'
import { parseExcelCategory } from './parseExcel'

interface CategoryMeta {
  id: string
  title: string
  language: string
  color: string
  fileName: string
}

async function getJSZip() {
  const { default: JSZip } = await import('jszip')
  return JSZip
}

export async function exportSettingsZip(categories: Category[]): Promise<void> {
  const JSZip = await getJSZip()
  const zip = new JSZip()

  const meta: CategoryMeta[] = categories.map(c => ({
    id: c.id,
    title: c.title,
    language: c.language,
    color: c.color,
    fileName: c.fileName,
  }))
  zip.file('settings.json', JSON.stringify(meta, null, 2))

  const folder = zip.folder('categories')!
  for (const cat of categories) {
    folder.file(cat.fileName, cat.fileBuffer)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'carrera-de-mente-settings.zip'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10000)
}

export async function importSettingsZip(buffer: ArrayBuffer): Promise<Category[]> {
  const JSZip = await getJSZip()
  const zip = await new JSZip().loadAsync(buffer)

  const settingsFile = zip.file('settings.json')
  if (!settingsFile) throw new Error('Invalid settings zip: missing settings.json')

  const meta: CategoryMeta[] = JSON.parse(await settingsFile.async('text'))
  const categories: Category[] = []

  for (const m of meta) {
    const excelFile = zip.file(`categories/${m.fileName}`)
    if (!excelFile) continue
    const buf = await excelFile.async('arraybuffer')
    const cat = await parseExcelCategory(buf, m.fileName, m.color, m.id)
    categories.push({ ...cat, title: m.title, language: m.language })
  }

  return categories
}
