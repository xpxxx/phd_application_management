import type {
  AppSettings,
  LocalState,
  Opportunity,
  OpportunityPriority,
  ScanSession,
  Skill,
  Source,
} from '../types'
import { DEFAULT_SETTINGS } from '../types'
import { sources as builtinSources } from '../data/sources'

const STORAGE_KEY = 'phd-discovery-local-v1'

const defaultState = (): LocalState => ({
  version: 1,
  opportunities: [],
  scanSession: null,
  customSkills: [],
  customSources: [],
  skillSourceExtras: {},
  settings: structuredClone(DEFAULT_SETTINGS),
})

function normalizeOpportunity(raw: Opportunity): Opportunity {
  const priority: OpportunityPriority =
    raw.priority === 'must' || raw.priority === 'try' || raw.priority === 'low'
      ? raw.priority
      : 'try'
  return { ...raw, priority }
}

function migrateLlmSettings(llm: AppSettings['llm']): AppSettings['llm'] {
  const merged = { ...DEFAULT_SETTINGS.llm, ...llm }
  // Fresh installs or unused OpenAI placeholder → DeepSeek defaults (keep key).
  const unusedOpenai =
    !merged.apiKey &&
    (merged.apiBase.includes('api.openai.com') ||
      merged.model === 'gpt-4o-mini')
  if (unusedOpenai) {
    return { ...DEFAULT_SETTINGS.llm, apiKey: merged.apiKey }
  }
  return merged
}

/**
 * Local sources whose URL now matches a built-in source are dropped and every
 * reference is repointed to the built-in id.
 */
function mergeDuplicateSources(state: LocalState): LocalState {
  const builtinIds = new Set(builtinSources.map((s) => s.id))
  const byUrl = new Map(builtinSources.map((s) => [normalizeUrl(s.url), s.id]))
  const remap = new Map<string, string>()
  for (const s of state.customSources) {
    if (builtinIds.has(s.id)) continue
    const target = byUrl.get(normalizeUrl(s.url))
    if (target) remap.set(s.id, target)
  }
  if (remap.size === 0) return state
  const mapIds = (ids: string[]) => [
    ...new Set(ids.map((id) => remap.get(id) ?? id)),
  ]
  return {
    ...state,
    customSources: state.customSources.filter((s) => !remap.has(s.id)),
    customSkills: state.customSkills.map((k) => ({
      ...k,
      sources: mapIds(k.sources),
    })),
    skillSourceExtras: Object.fromEntries(
      Object.entries(state.skillSourceExtras).map(([k, ids]) => [
        k,
        mapIds(ids),
      ]),
    ),
    opportunities: state.opportunities.map((o) =>
      o.sourceId && remap.has(o.sourceId)
        ? { ...o, sourceId: remap.get(o.sourceId) }
        : o,
    ),
    scanSession: state.scanSession && {
      ...state.scanSession,
      scannedSourceIds: mapIds(state.scanSession.scannedSourceIds),
    },
  }
}

export function loadLocalState(): LocalState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw) as LocalState
    if (parsed.version !== 1) return defaultState()
    return mergeDuplicateSources({
      ...defaultState(),
      ...parsed,
      opportunities: (parsed.opportunities ?? []).map(normalizeOpportunity),
      customSkills: parsed.customSkills ?? [],
      customSources: parsed.customSources ?? [],
      skillSourceExtras: parsed.skillSourceExtras ?? {},
      settings: {
        ...DEFAULT_SETTINGS,
        ...parsed.settings,
        llm: migrateLlmSettings(parsed.settings?.llm ?? DEFAULT_SETTINGS.llm),
        profile: parsed.settings?.profile ?? '',
        profileSummary:
          parsed.settings?.profileSummary?.trim() ||
          parsed.settings?.profile?.trim() ||
          '',
        profileSummarizedAt: parsed.settings?.profileSummarizedAt,
        cvFileName: parsed.settings?.cvFileName,
        cvText: parsed.settings?.cvText,
      },
    })
  } catch {
    return defaultState()
  }
}

export function saveLocalState(state: LocalState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function exportLocalState(state: LocalState): string {
  // Never put API keys into shared backups by default — strip key on export.
  const safe: LocalState = {
    ...state,
    settings: {
      ...state.settings,
      llm: { ...state.settings.llm, apiKey: '' },
    },
  }
  return JSON.stringify(safe, null, 2)
}

export function parseImportJson(text: string): LocalState {
  const parsed = JSON.parse(text) as LocalState
  if (parsed.version !== 1 || !Array.isArray(parsed.opportunities)) {
    throw new Error('无效的备份文件：需要 version: 1 且包含 opportunities 数组')
  }
  const base = defaultState()
  return mergeDuplicateSources({
    version: 1,
    opportunities: (parsed.opportunities ?? []).map(normalizeOpportunity),
    scanSession: parsed.scanSession ?? null,
    customSkills: parsed.customSkills ?? [],
    customSources: parsed.customSources ?? [],
    skillSourceExtras: parsed.skillSourceExtras ?? {},
    settings: {
      ...base.settings,
      ...parsed.settings,
      llm: {
        ...base.settings.llm,
        ...parsed.settings?.llm,
        apiKey: parsed.settings?.llm?.apiKey || '',
      },
      profile: parsed.settings?.profile ?? '',
      profileSummary:
        parsed.settings?.profileSummary?.trim() ||
        parsed.settings?.profile?.trim() ||
        '',
      profileSummarizedAt: parsed.settings?.profileSummarizedAt,
      cvFileName: parsed.settings?.cvFileName,
      cvText: parsed.settings?.cvText,
    },
  })
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim())
    u.hash = ''
    let path = u.pathname
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
    u.pathname = path
    return u.toString()
  } catch {
    return url.trim().toLowerCase()
  }
}

export function findDuplicate(
  opportunities: Opportunity[],
  url: string,
  excludeId?: string,
): Opportunity | undefined {
  const key = normalizeUrl(url)
  return opportunities.find(
    (o) => o.id !== excludeId && normalizeUrl(o.url) === key,
  )
}

export function upsertOpportunity(
  state: LocalState,
  opportunity: Opportunity,
): LocalState {
  const dup = findDuplicate(state.opportunities, opportunity.url, opportunity.id)
  if (dup) {
    throw new Error(`链接已存在于收件箱：「${dup.title}」`)
  }
  const idx = state.opportunities.findIndex((o) => o.id === opportunity.id)
  const opportunities =
    idx >= 0
      ? state.opportunities.map((o, i) => (i === idx ? opportunity : o))
      : [opportunity, ...state.opportunities]
  return { ...state, opportunities }
}

export function removeOpportunity(state: LocalState, id: string): LocalState {
  return {
    ...state,
    opportunities: state.opportunities.filter((o) => o.id !== id),
  }
}

export function setScanSession(
  state: LocalState,
  session: ScanSession | null,
): LocalState {
  return { ...state, scanSession: session }
}

export function toggleScannedSource(
  state: LocalState,
  skillId: string,
  sourceId: string,
): LocalState {
  const now = new Date().toISOString()
  let session = state.scanSession
  if (!session || session.skillId !== skillId) {
    session = {
      skillId,
      scannedSourceIds: [sourceId],
      startedAt: now,
      updatedAt: now,
    }
  } else {
    const has = session.scannedSourceIds.includes(sourceId)
    session = {
      ...session,
      scannedSourceIds: has
        ? session.scannedSourceIds.filter((id) => id !== sourceId)
        : [...session.scannedSourceIds, sourceId],
      updatedAt: now,
    }
  }
  return { ...state, scanSession: session }
}

export function saveCustomSkill(state: LocalState, skill: Skill): LocalState {
  const idx = state.customSkills.findIndex((s) => s.id === skill.id)
  const customSkills =
    idx >= 0
      ? state.customSkills.map((s, i) => (i === idx ? skill : s))
      : [...state.customSkills, skill]
  return { ...state, customSkills }
}

export function removeCustomSkill(state: LocalState, id: string): LocalState {
  return {
    ...state,
    customSkills: state.customSkills.filter((s) => s.id !== id),
  }
}

export function clearSkillSourceExtras(
  state: LocalState,
  skillId: string,
): LocalState {
  if (!state.skillSourceExtras[skillId]) return state
  const { [skillId]: _removed, ...rest } = state.skillSourceExtras
  return { ...state, skillSourceExtras: rest }
}

export function upsertCustomSource(
  state: LocalState,
  source: Source,
): LocalState {
  const idx = state.customSources.findIndex((s) => s.id === source.id)
  const customSources =
    idx >= 0
      ? state.customSources.map((s, i) => (i === idx ? source : s))
      : [...state.customSources, source]
  return { ...state, customSources }
}

export function removeCustomSource(state: LocalState, id: string): LocalState {
  const skillSourceExtras = Object.fromEntries(
    Object.entries(state.skillSourceExtras).map(([skillId, ids]) => [
      skillId,
      ids.filter((sid) => sid !== id),
    ]),
  )
  return {
    ...state,
    customSources: state.customSources.filter((s) => s.id !== id),
    skillSourceExtras,
  }
}

/** Drop a local edit of a built-in source; recipe references stay intact. */
export function removeSourceOverride(
  state: LocalState,
  id: string,
): LocalState {
  return {
    ...state,
    customSources: state.customSources.filter((s) => s.id !== id),
  }
}

export function attachSourceToSkill(
  state: LocalState,
  skillId: string,
  sourceId: string,
): LocalState {
  const current = state.skillSourceExtras[skillId] ?? []
  if (current.includes(sourceId)) return state
  return {
    ...state,
    skillSourceExtras: {
      ...state.skillSourceExtras,
      [skillId]: [...current, sourceId],
    },
  }
}

export function detachSourceFromSkill(
  state: LocalState,
  skillId: string,
  sourceId: string,
): LocalState {
  const current = state.skillSourceExtras[skillId] ?? []
  return {
    ...state,
    skillSourceExtras: {
      ...state.skillSourceExtras,
      [skillId]: current.filter((id) => id !== sourceId),
    },
  }
}

export function updateSettings(
  state: LocalState,
  settings: AppSettings,
): LocalState {
  return { ...state, settings }
}

export function newId(): string {
  return crypto.randomUUID()
}

export function slugId(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
  return `custom-${base || 'source'}-${crypto.randomUUID().slice(0, 8)}`
}
