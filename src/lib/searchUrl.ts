import type { Skill, Source } from '../types'

/** Build a search URL for a source given skill keywords, or fall back to homepage. */
export function buildSearchUrl(source: Source, skill: Skill): string {
  const query = skill.keywords.join(' ')
  if (source.searchUrlTemplate) {
    return source.searchUrlTemplate.replace(
      '{query}',
      encodeURIComponent(query),
    )
  }
  return source.url
}

export function queryPreview(skill: Skill): string {
  const parts = [...skill.keywords]
  if (skill.exclude.length) {
    parts.push(...skill.exclude.map((e) => `-${e}`))
  }
  return parts.join(' ')
}
