import {
  COUNTRY_LABELS,
  COUNTRY_ORDER,
  OTHER_COUNTRY_KEY,
  PAN_EUROPE_KEY,
  type Source,
} from '../types'

export interface SourceGroup {
  key: string
  label: string
  sources: Source[]
}

function countryKey(source: Source): string {
  const codes = source.countries.map((c) => c.trim().toUpperCase())
  if (codes.length === 0 || !codes[0]) return OTHER_COUNTRY_KEY
  if (codes.length > 1 || codes.includes('EUROPE') || codes.includes('EU')) {
    return PAN_EUROPE_KEY
  }
  return codes[0] === 'GB' ? 'UK' : codes[0]
}

/**
 * Group sources by country, keeping input order within each group.
 * Countries without a preset label get their own group before "other".
 */
export function groupSourcesByCountry(sources: Source[]): SourceGroup[] {
  const buckets = new Map<string, Source[]>()
  for (const source of sources) {
    const key = countryKey(source)
    const list = buckets.get(key)
    if (list) list.push(source)
    else buckets.set(key, [source])
  }
  const extraKeys = [...buckets.keys()]
    .filter((key) => !COUNTRY_ORDER.includes(key))
    .sort()
  const order = [
    ...COUNTRY_ORDER.filter((key) => key !== OTHER_COUNTRY_KEY),
    ...extraKeys,
    OTHER_COUNTRY_KEY,
  ]
  return order
    .filter((key) => buckets.has(key))
    .map((key) => ({
      key,
      label: COUNTRY_LABELS[key] ?? key,
      sources: buckets.get(key)!,
    }))
}
