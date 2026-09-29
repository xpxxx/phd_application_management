export type SourceType = 'aggregator' | 'national' | 'project' | 'university' | 'other'

export interface Source {
  id: string
  name: string
  url: string
  countries: string[]
  type: SourceType
  howToSearch: string
  csNotes: string
  /** Optional URL template. Use {query} for encoded keywords. */
  searchUrlTemplate?: string
}

export interface Skill {
  id: string
  title: string
  description: string
  keywords: string[]
  exclude: string[]
  countries: string[]
  sources: string[]
  tips: string[]
}

export interface ChecklistItem {
  id: string
  label: string
  hint?: string
}

export interface ChecklistTemplate {
  id: string
  title: string
  items: ChecklistItem[]
}

/** Application pipeline stage; each stage is a sub-inbox. */
export type OpportunityStatus =
  | 'research'
  | 'contact'
  | 'apply'
  | 'waiting'
  | 'result'

export type OpportunityOutcome = 'success' | 'failed'

/** position = 岗位制（按岗位课题改 RP）；open = 统招（可用已有 RP） */
export type OpportunityTrack = 'position' | 'open'

export interface RpFit {
  /** 1–10; null when there was no RP or not enough information. */
  score: number | null
  note: string
}

/** must = 十分想申；try = 一般可尝试；low = 备选 */
export type OpportunityPriority = 'must' | 'try' | 'low'

export type YesNoUnclear = 'yes' | 'no' | 'unclear'

export interface AiAnalysis {
  summary: string
  matchAssessment: string
  matchScore: number | null
  internationalApplicants: YesNoUnclear
  visaSupport: YesNoUnclear
  visaNotes: string
  analyzedAt: string
}

export interface Opportunity {
  id: string
  title: string
  url: string
  sourceId?: string
  country?: string
  deadline?: string
  status: OpportunityStatus
  /** Only meaningful when status is 'result'. */
  outcome?: OpportunityOutcome
  track?: OpportunityTrack
  /** How well the user's existing research proposal fits this opportunity. */
  rpFit?: RpFit
  priority: OpportunityPriority
  tags: string[]
  note: string
  createdAt: string
  updatedAt: string
  /** Local checklist progress: itemId -> checked */
  checklist?: Record<string, boolean>
  aiAnalysis?: AiAnalysis
}

export interface ScanSession {
  skillId: string
  scannedSourceIds: string[]
  startedAt: string
  updatedAt: string
}

export interface LlmSettings {
  apiBase: string
  apiKey: string
  model: string
}

export interface AppSettings {
  llm: LlmSettings
  /**
   * Legacy free-text profile. Migrated into profileSummary when empty.
   * @deprecated Prefer profileSummary from CV.
   */
  profile: string
  /** Cached applicant summary for match analysis (token-saving). */
  profileSummary: string
  profileSummarizedAt?: string
  cvFileName?: string
  /** Raw extracted CV text kept for re-summarize; not sent on each job analysis. */
  cvText?: string
  /** User's existing research proposal, used to judge fit when drafting opportunities. */
  researchProposal?: string
  researchProposalFileName?: string
  /** Cached RP summary sent to the LLM instead of the full RP. */
  researchProposalSummary?: string
  researchProposalSummarizedAt?: string
}

export interface LocalState {
  version: 1
  opportunities: Opportunity[]
  scanSession: ScanSession | null
  customSkills: Skill[]
  customSources: Source[]
  /** Extra source ids appended per skill (local only). */
  skillSourceExtras: Record<string, string[]>
  settings: AppSettings
}

export const OPPORTUNITY_STATUSES: OpportunityStatus[] = [
  'research',
  'contact',
  'apply',
  'waiting',
  'result',
]

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  research: '了解岗位与导师',
  contact: '套瓷',
  apply: '网站申请',
  waiting: '等待面试通知',
  result: '最终结果',
}

export const OPPORTUNITY_OUTCOME_LABELS: Record<OpportunityOutcome, string> = {
  success: '成功',
  failed: '失败',
}

export const OPPORTUNITY_TRACK_LABELS: Record<OpportunityTrack, string> = {
  position: '岗位制',
  open: '统招',
}

export const OPPORTUNITY_TRACK_HINTS: Record<OpportunityTrack, string> = {
  position: '针对岗位课题修改 RP',
  open: '可用已有 RP',
}

export const OPPORTUNITY_PRIORITY_LABELS: Record<OpportunityPriority, string> = {
  must: '十分想申',
  try: '可以尝试',
  low: '备选',
}

export const PRIORITY_ORDER: Record<OpportunityPriority, number> = {
  must: 0,
  try: 1,
  low: 2,
}

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  aggregator: '聚合站',
  national: '国家门户',
  project: '项目制',
  university: '高校门户',
  other: '其他',
}

/** Group key for sources spanning several countries or all of Europe. */
export const PAN_EUROPE_KEY = 'Europe'
export const OTHER_COUNTRY_KEY = 'other'

export const COUNTRY_LABELS: Record<string, string> = {
  [PAN_EUROPE_KEY]: '泛欧',
  NL: '荷兰',
  SE: '瑞典',
  FI: '芬兰',
  DK: '丹麦',
  NO: '挪威',
  IS: '冰岛',
  DE: '德国',
  CH: '瑞士',
  LU: '卢森堡',
  AT: '奥地利',
  BE: '比利时',
  UK: '英国',
  FR: '法国',
  [OTHER_COUNTRY_KEY]: '其他',
}

export const COUNTRY_ORDER: string[] = [
  PAN_EUROPE_KEY,
  'NL',
  'SE',
  'FI',
  'DK',
  'NO',
  'IS',
  'DE',
  'CH',
  'LU',
  'AT',
  'BE',
  'UK',
  'FR',
  OTHER_COUNTRY_KEY,
]

export const YES_NO_UNCLEAR_LABELS: Record<YesNoUnclear, string> = {
  yes: '是',
  no: '否',
  unclear: '不明确',
}

export const DEFAULT_LLM_SETTINGS: LlmSettings = {
  apiBase: 'https://api.deepseek.com',
  apiKey: '',
  model: 'deepseek-chat',
}

export const DEFAULT_SETTINGS: AppSettings = {
  llm: DEFAULT_LLM_SETTINGS,
  profile: '',
  profileSummary: '',
}
