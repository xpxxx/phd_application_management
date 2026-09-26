export type PageFetchStrategy = 'direct' | 'jina' | 'allorigins'

export interface PageFetchResult {
  text: string
  strategy: PageFetchStrategy
  /** Final URL that produced the text (may be a proxy URL). */
  via: string
}

const MAX_CHARS = 48000
const MIN_USEFUL_CHARS = 80

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeExtracted(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function isUseful(text: string): boolean {
  const t = text.trim()
  if (t.length < MIN_USEFUL_CHARS) return false
  // Reject obvious soft-block / captcha shells
  const lower = t.toLowerCase()
  if (
    lower.includes('enable javascript') &&
    t.length < 400 &&
    !lower.includes('phd') &&
    !lower.includes('doctoral')
  ) {
    return false
  }
  return true
}

async function fetchDirect(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
    signal,
  })
  if (!res.ok) throw new Error(`direct ${res.status}`)
  const ctype = res.headers.get('content-type') ?? ''
  const raw = await res.text()
  if (ctype.includes('text/html') || raw.includes('<html') || raw.includes('<!DOCTYPE')) {
    return normalizeExtracted(stripHtml(raw)).slice(0, MAX_CHARS)
  }
  return normalizeExtracted(raw).slice(0, MAX_CHARS)
}

/** Jina Reader — returns readable markdown; often works where CORS blocks direct fetch. */
async function fetchViaJina(url: string, signal?: AbortSignal): Promise<string> {
  const target = `https://r.jina.ai/${url}`
  const res = await fetch(target, {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
    signal,
    headers: {
      Accept: 'text/plain',
      'X-Return-Format': 'markdown',
    },
  })
  if (!res.ok) throw new Error(`jina ${res.status}`)
  const text = normalizeExtracted(await res.text()).slice(0, MAX_CHARS)
  if (!isUseful(text)) throw new Error('jina empty')
  return text
}

/** allorigins CORS proxy — returns original HTML/JSON wrapper. */
async function fetchViaAllOrigins(
  url: string,
  signal?: AbortSignal,
): Promise<string> {
  const target = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
  const res = await fetch(target, {
    method: 'GET',
    mode: 'cors',
    credentials: 'omit',
    signal,
  })
  if (!res.ok) throw new Error(`allorigins ${res.status}`)
  const data = (await res.json()) as { contents?: string; status?: { http_code?: number } }
  if (data.status?.http_code && data.status.http_code >= 400) {
    throw new Error(`allorigins upstream ${data.status.http_code}`)
  }
  const contents = data.contents ?? ''
  const text = normalizeExtracted(stripHtml(contents)).slice(0, MAX_CHARS)
  if (!isUseful(text)) throw new Error('allorigins empty')
  return text
}

/**
 * Fetch readable text from a public URL.
 * Tries: direct CORS → Jina Reader → allorigins.
 * Throws if all strategies fail.
 */
export async function fetchPageText(
  url: string,
  opts?: { signal?: AbortSignal },
): Promise<PageFetchResult> {
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    throw new Error('链接不合法')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('仅支持 http/https 链接')
  }

  const href = parsed.toString()
  const errors: string[] = []

  try {
    const text = await fetchDirect(href, opts?.signal)
    if (isUseful(text)) {
      return { text, strategy: 'direct', via: href }
    }
    errors.push('direct: 内容过短')
  } catch (e) {
    errors.push(`direct: ${e instanceof Error ? e.message : '失败'}`)
  }

  try {
    const text = await fetchViaJina(href, opts?.signal)
    return { text, strategy: 'jina', via: `https://r.jina.ai/${href}` }
  } catch (e) {
    errors.push(`jina: ${e instanceof Error ? e.message : '失败'}`)
  }

  try {
    const text = await fetchViaAllOrigins(href, opts?.signal)
    return { text, strategy: 'allorigins', via: 'allorigins' }
  } catch (e) {
    errors.push(`allorigins: ${e instanceof Error ? e.message : '失败'}`)
  }

  throw new Error(
    `无法从链接抓取正文（${errors.join('；')}）。可手动粘贴页面文本后重试。`,
  )
}

/**
 * Prefer pasted text; otherwise fetch from URL.
 * Returns the text that should be sent to the LLM.
 */
export async function resolvePageText(input: {
  url: string
  pasted?: string
  signal?: AbortSignal
}): Promise<PageFetchResult & { fromPaste: boolean }> {
  const pasted = input.pasted?.trim() ?? ''
  if (pasted.length >= MIN_USEFUL_CHARS) {
    return {
      text: pasted.slice(0, MAX_CHARS),
      strategy: 'direct',
      via: 'paste',
      fromPaste: true,
    }
  }
  const fetched = await fetchPageText(input.url, { signal: input.signal })
  return { ...fetched, fromPaste: false }
}

/** @deprecated use fetchPageText — kept for call-site compatibility */
export async function tryFetchPageText(url: string): Promise<string> {
  try {
    const r = await fetchPageText(url)
    return r.text
  } catch {
    return ''
  }
}
