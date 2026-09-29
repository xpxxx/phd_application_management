import type { Skill, Source } from '../types'

/** Empty, the form's example placeholder, or not a real URL → not usable. */
export function isUsableSearchTemplate(template: string | undefined): boolean {
  const t = template?.trim()
  if (!t) return false
  try {
    const host = new URL(t.replace('{query}', 'q')).hostname
    return !/(^|\.)example\.(com|org|net)$/i.test(host)
  } catch {
    return false
  }
}

/** Search URL from the source's template with skill keywords, else the source homepage. */
export function buildSearchUrl(source: Source, skill: Skill): string {
  if (!isUsableSearchTemplate(source.searchUrlTemplate)) return source.url
  const query = skill.keywords.join(' ')
  return source.searchUrlTemplate!.trim().replace(
    '{query}',
    encodeURIComponent(query),
  )
}

export function queryPreview(skill: Skill): string {
  const parts = [...skill.keywords]
  if (skill.exclude.length) {
    parts.push(...skill.exclude.map((e) => `-${e}`))
  }
  return parts.join(' ')
}
