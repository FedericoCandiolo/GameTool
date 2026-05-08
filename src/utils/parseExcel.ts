import type { Category, Question } from '../types/carreraDeMente'

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, 'application/xml')
}

function getCellValue(cell: Element): string {
  const t = cell.getAttribute('t')
  if (t === 'inlineStr') {
    return cell.getElementsByTagNameNS(NS, 't')[0]?.textContent ?? ''
  }
  const v = cell.getElementsByTagNameNS(NS, 'v')[0]
  return v?.textContent ?? ''
}

function readSheet(doc: Document): Array<Record<string, string>> {
  const rows = doc.getElementsByTagNameNS(NS, 'row')
  const result: Array<Record<string, string>> = []
  for (const row of Array.from(rows)) {
    const cells: Record<string, string> = {}
    for (const cell of Array.from(row.getElementsByTagNameNS(NS, 'c'))) {
      const ref = cell.getAttribute('r') ?? ''
      const col = ref.replace(/\d/g, '')
      cells[col] = getCellValue(cell)
    }
    result.push(cells)
  }
  return result
}

async function readFileFromZip(zip: import('jszip'), path: string): Promise<string> {
  const file = zip.file(path)
  if (!file) throw new Error(`Missing ${path} in xlsx`)
  return file.async('text')
}

// Lazy import to keep bundle lean
async function getJSZip() {
  const { default: JSZip } = await import('jszip')
  return JSZip
}

export async function parseExcelCategory(
  buffer: ArrayBuffer,
  fileName: string,
  color: string,
  id: string
): Promise<Category> {
  const JSZip = await getJSZip()
  const zip = await new JSZip().loadAsync(buffer)

  const sheet1Text = await readFileFromZip(zip, 'xl/worksheets/sheet1.xml')
  const sheet2Text = await readFileFromZip(zip, 'xl/worksheets/sheet2.xml')

  const sheet1 = parseXml(sheet1Text)
  const sheet2 = parseXml(sheet2Text)

  const questionRows = readSheet(sheet1)
  const metaRows = readSheet(sheet2)

  // Metadata: row 0 = header, row 1 = Titulo, row 2 = Idioma
  const title = metaRows[1]?.B ?? fileName.replace(/\.xlsx?$/i, '')
  const language = metaRows[2]?.B ?? ''

  // Questions: row 0 = header, rows 1+ = data
  const questions: Record<string, Question> = {}
  for (let i = 1; i < questionRows.length; i++) {
    const r = questionRows[i]
    const roll = (r.A ?? '').trim()
    if (!roll || roll.length !== 3) continue
    questions[roll] = {
      roll,
      question: r.B ?? '',
      correctAnswer: r.C ?? '',
      wrongOptions: [r.D ?? '', r.E ?? ''],
    }
  }

  return { id, title, language, color, questions, fileName, fileBuffer: buffer }
}
