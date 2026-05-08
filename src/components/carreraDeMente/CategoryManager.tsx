import { useRef } from 'react'
import type { Category } from '../../types/carreraDeMente'
import { parseExcelCategory } from '../../utils/parseExcel'
import { exportSettingsZip, importSettingsZip } from '../../utils/settingsZip'
import styles from './CategoryManager.module.css'

const PRESET_COLORS = ['#00d4ff','#f59e0b','#22c55e','#a855f7','#ef4444','#f97316','#ec4899','#14b8a6']

function nextColor(existing: Category[]): string {
  const used = new Set(existing.map(c => c.color))
  return PRESET_COLORS.find(c => !used.has(c)) ?? PRESET_COLORS[existing.length % PRESET_COLORS.length]
}

interface Props {
  categories: Category[]
  onChange: (cats: Category[]) => void
}

export default function CategoryManager({ categories, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const zipRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const added: Category[] = []
    for (const file of Array.from(files)) {
      if (!/\.xlsx?$/i.test(file.name)) continue
      const buf = await file.arrayBuffer()
      const id = crypto.randomUUID()
      const color = nextColor([...categories, ...added])
      try {
        const cat = await parseExcelCategory(buf, file.name, color, id)
        added.push(cat)
      } catch (e) {
        console.error('Failed to parse', file.name, e)
      }
    }
    if (added.length) onChange([...categories, ...added])
  }

  function updateColor(id: string, color: string) {
    onChange(categories.map(c => c.id === id ? { ...c, color } : c))
  }

  function remove(id: string) {
    onChange(categories.filter(c => c.id !== id))
  }

  async function handleImportZip(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      const cats = await importSettingsZip(buf)
      onChange(cats)
    } catch (e) {
      console.error('Failed to import zip', e)
    }
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.title}>Categories</p>

      {categories.length === 0 ? (
        <div className={styles.empty}>No categories loaded yet. Add an Excel file to start.</div>
      ) : (
        <div className={styles.list}>
          {categories.map(cat => (
            <div key={cat.id} className={styles.item}>
              <div className={styles.colorDot} style={{ background: cat.color }}>
                <input
                  type="color"
                  className={styles.colorInput}
                  value={cat.color}
                  onChange={e => updateColor(cat.id, e.target.value)}
                  title="Change color"
                />
              </div>
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>{cat.title}</div>
                <div className={styles.itemMeta}>{cat.language} · {Object.keys(cat.questions).length} questions · {cat.fileName}</div>
              </div>
              <button className={styles.removeBtn} onClick={() => remove(cat.id)} title="Remove">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.addRow}>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
        <button className="btn" onClick={() => fileRef.current?.click()}>+ Add Category</button>
      </div>

      <div className={styles.zipRow}>
        <input
          ref={zipRef}
          type="file"
          accept=".zip"
          style={{ display: 'none' }}
          onChange={e => handleImportZip(e.target.files)}
        />
        <button className="btn btn--ghost" onClick={() => zipRef.current?.click()}>Import ZIP</button>
        {categories.length > 0 && (
          <button className="btn btn--ghost" onClick={() => exportSettingsZip(categories)}>Export ZIP</button>
        )}
      </div>
    </div>
  )
}
