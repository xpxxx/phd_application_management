import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const MAX_CV_CHARS = 80000

async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const doc = await pdfjs.getDocument({ data }).promise
  const parts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const line = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    parts.push(line)
  }
  return parts.join('\n')
}

/** Extract plain text from uploaded CV (.pdf / .txt / .md). */
export async function extractCvText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const buf = await file.arrayBuffer()
    const text = await extractPdfText(buf)
    return text.replace(/\s+\n/g, '\n').trim().slice(0, MAX_CV_CHARS)
  }
  if (
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    file.type.startsWith('text/') ||
    file.type === ''
  ) {
    const text = await file.text()
    return text.trim().slice(0, MAX_CV_CHARS)
  }
  throw new Error('仅支持 PDF、TXT、MD 格式的 CV')
}
