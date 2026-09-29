import type {
  AiAnalysis,
  LlmSettings,
  OpportunityPriority,
  OpportunityStatus,
  OpportunityTrack,
  RpFit,
  SourceType,
  YesNoUnclear,
} from '../types'
import { resolvePageText } from './fetchPageText'

export { tryFetchPageText, fetchPageText, resolvePageText } from './fetchPageText'

export interface AnalyzeInput {
  url: string
  title?: string
  /** Optional paste; if empty, text is fetched from url. */
  jobText?: string
  /** Pre-computed applicant summary — do NOT pass full CV here. */
  profileSummary: string
}

export interface SourceDraftFromLlm {
  name: string
  type: SourceType
  countries: string[]
  howToSearch: string
  csNotes: string
  searchUrlTemplate: string
  notesForUser: string
}

export interface OpportunityDraftFromLlm {
  title: string
  country: string
  deadline: string
  priority: OpportunityPriority
  status: OpportunityStatus
  track: OpportunityTrack | undefined
  rpFit: RpFit
  tags: string[]
  note: string
  sourceId: string
  notesForUser: string
}

const SOURCE_TYPES: SourceType[] = [
  'aggregator',
  'national',
  'project',
  'university',
  'other',
]

function parseYesNoUnclear(v: unknown): YesNoUnclear {
  if (v === 'yes' || v === 'no' || v === 'unclear') return v
  return 'unclear'
}

function parseSourceType(v: unknown): SourceType {
  if (typeof v === 'string' && SOURCE_TYPES.includes(v as SourceType)) {
    return v as SourceType
  }
  return 'other'
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1))
    }
    throw new Error('模型返回的不是有效 JSON')
  }
}

async function chatCompletion(
  settings: LlmSettings,
  messages: { role: string; content: string }[],
  opts?: { json?: boolean; temperature?: number },
): Promise<string> {
  if (!settings.apiKey.trim()) {
    throw new Error('请先在「设置」中填写 API Key')
  }
  const base = settings.apiBase.replace(/\/$/, '')
  const payload = {
    model: settings.model.trim() || 'deepseek-chat',
    temperature: opts?.temperature ?? 0.2,
    messages,
  }

  let res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey.trim()}`,
    },
    body: JSON.stringify(
      opts?.json
        ? { ...payload, response_format: { type: 'json_object' } }
        : payload,
    ),
  })

  if (!res.ok && res.status === 400 && opts?.json) {
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey.trim()}`,
      },
      body: JSON.stringify(payload),
    })
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(
      `API 请求失败 (${res.status})${errText ? `: ${errText.slice(0, 300)}` : ''}`,
    )
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('API 未返回内容')
  return content
}

/** Infer source metadata from URL (+ optional page text) for the add-source form. */
export async function analyzeSourceWithLlm(
  settings: LlmSettings,
  input: { url: string; pageText?: string },
): Promise<SourceDraftFromLlm> {
  let url: URL
  try {
    url = new URL(input.url.trim())
  } catch {
    throw new Error('请输入合法的 URL')
  }

  const system = `你是欧洲计算机（CS）岗位制博士申请的信息架构顾问。用户给出一个招聘/学术职位门户链接，请推断该「检索源」应如何录入本地目录。
输出严格 JSON（不要 markdown）：
{
  "name": "简短中英文站名",
  "type": "aggregator" | "national" | "project" | "university" | "other",
  "countries": ["国家或区域代码，如 DE, NL, Europe, EU"],
  "howToSearch": "中文，2-4句，说明如何筛 PhD/doctoral/CS 岗位",
  "csNotes": "中文，对该站 CS 博士岗位覆盖的简要评价与注意点",
  "searchUrlTemplate": "若能合理猜测带关键词的搜索 URL，用 {query} 占位；否则空字符串",
  "notesForUser": "一句中文：说明哪些字段是推测、建议用户核对什么"
}
type 含义：aggregator=跨国聚合站；national=国家门户；project=如 MSCA 项目；university=高校招聘页；other=其他。
只服务欧洲 CS 岗位制博士场景。不要编造不存在的 searchUrlTemplate 参数名；不确定则留空。`

  const page = input.pageText?.trim()
  const user = `链接：${url.toString()}
域名：${url.hostname}

${
  page
    ? `页面文本摘录（可能不完整）：\n${page.slice(0, 10000)}`
    : '（无法抓取页面正文，请主要依据 URL/域名与你对学术招聘站的常识推断；不确定的字段保持保守。）'
}`

  const content = await chatCompletion(
    settings,
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { json: true, temperature: 0.2 },
  )

  const parsed = extractJsonObject(content) as Record<string, unknown>
  const countries = Array.isArray(parsed.countries)
    ? parsed.countries.map((c) => String(c).trim()).filter(Boolean)
    : []

  return {
    name: String(parsed.name ?? '').trim() || url.hostname,
    type: parseSourceType(parsed.type),
    countries: countries.length ? countries : ['Europe'],
    howToSearch:
      String(parsed.howToSearch ?? '').trim() ||
      '打开首页后按关键词搜索 PhD / doctoral / computer science。',
    csNotes:
      String(parsed.csNotes ?? '').trim() ||
      '请人工核对覆盖范围与筛选方式。',
    searchUrlTemplate: String(parsed.searchUrlTemplate ?? '').trim(),
    notesForUser:
      String(parsed.notesForUser ?? '').trim() ||
      '以下为模型预填，请核对后保存。',
  }
}

/** Draft inbox opportunity fields from a job posting (before user edits/saves). */
export async function draftOpportunityWithLlm(
  settings: LlmSettings,
  input: {
    url: string
    jobText?: string
    profileSummary?: string
    researchProposal?: string
    sources: { id: string; name: string; url: string }[]
  },
): Promise<OpportunityDraftFromLlm & { fetchedJobText: string; fetchNote: string }> {
  try {
    new URL(input.url.trim())
  } catch {
    throw new Error('请输入合法的岗位链接')
  }

  const page = await resolvePageText({
    url: input.url.trim(),
    pasted: input.jobText,
  })
  const jobText = page.text
  const fetchNote = page.fromPaste
    ? '使用你粘贴的正文拟稿。'
    : `已从链接抓取正文（策略：${page.strategy}）并拟稿。`

  const sourceLines = input.sources
    .slice(0, 40)
    .map((s) => `- id=${s.id} | ${s.name} | ${s.url}`)
    .join('\n')

  const system = `你是欧洲 CS 岗位制博士申请助手。根据招聘启事，为「机会收件箱」拟一份录入草稿。
输出严格 JSON（不要 markdown）：
{
  "title": "简洁岗位标题（可含学校/课题组）",
  "country": "国家代码如 DE/NL/CH/UK，或空字符串",
  "deadline": "YYYY-MM-DD，若无明确日期则空字符串",
  "priority": "must" | "try" | "low",
  "tags": ["短标签，英文或中文，3个以内"],
  "note": "中文备注 2-5 句：课题要点、合同/资助、硬性门槛、值得关注点",
  "sourceId": "若能匹配给定源目录则填其 id，否则空字符串",
  "track": "position" | "open" | "unclear",
  "trackReason": "一句中文：判断依据（引用启事里的关键表述）",
  "rpFitScore": 1到10的整数或 null,
  "rpFitNote": "中文 2-3 句：申请者已有 RP 与本机会的契合点、缺口，以及 RP 需要怎样调整",
  "notesForUser": "一句中文：哪些字段是推测、建议核对什么"
}
priority：must=十分契合且值得优先；try=可尝试；low=备选/匹配弱。可参考申请者背景摘要和 RP，但不要编造启事中没有的硬性信息。
deadline 必须是真实可解析日期或空。
track 判断：
- position（岗位制）：启事给定了具体课题/项目/导师，经费绑定该项目（如 funded project、MSCA DN 某个 DC 岗、"the PhD candidate will work on …"）。申请者需要围绕岗位课题重写或修改 RP。
- open（统招）：研究生院、博士项目或学院的统一招生（如 graduate school / doctoral programme open call、ELLIS、IMPRS 的年度招生，或要求"submit your own research proposal"），方向较宽，可以直接用申请者已有的 RP。
- 信息不足以判断时填 unclear。
rpFitScore：申请者已有 RP 与本机会课题/方向的契合度，10=几乎可以原样使用，1=几乎无关。未提供 RP 时填 null，rpFitNote 注明"未提供 RP"。`

  const user = `岗位链接：${input.url.trim()}

申请者背景摘要（仅供建议优先级，可忽略）：
${input.profileSummary?.trim() || '（无）'}

申请者已有研究计划（RP）的摘要或节选（用于判断 rpFitScore）：
${input.researchProposal?.trim().slice(0, 8000) || '（未提供）'}

可选来源目录（匹配 sourceId 用）：
${sourceLines || '（无）'}

招聘文本：
${jobText.slice(0, 24000)}`

  const content = await chatCompletion(
    settings,
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { json: true, temperature: 0.2 },
  )

  const parsed = extractJsonObject(content) as Record<string, unknown>
  const priorityRaw = String(parsed.priority ?? 'try')
  const priority: OpportunityPriority =
    priorityRaw === 'must' || priorityRaw === 'try' || priorityRaw === 'low'
      ? priorityRaw
      : 'try'
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 8)
    : []
  let deadline = String(parsed.deadline ?? '').trim()
  if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    deadline = ''
  }
  const sourceId = String(parsed.sourceId ?? '').trim()
  const track =
    parsed.track === 'position' || parsed.track === 'open'
      ? parsed.track
      : undefined
  const fitRaw = parsed.rpFitScore
  const rpFitScore =
    typeof fitRaw === 'number' && Number.isFinite(fitRaw)
      ? Math.max(1, Math.min(10, Math.round(fitRaw)))
      : null
  const trackReason = String(parsed.trackReason ?? '').trim()
  const known = new Set(input.sources.map((s) => s.id))

  return {
    title: String(parsed.title ?? '').trim() || '未命名岗位',
    country: String(parsed.country ?? '').trim(),
    deadline,
    priority,
    status: 'research',
    track,
    rpFit: {
      score: rpFitScore,
      note: [
        trackReason && `类型判断：${trackReason}`,
        String(parsed.rpFitNote ?? '').trim(),
      ]
        .filter(Boolean)
        .join('\n'),
    },
    tags,
    note: String(parsed.note ?? '').trim(),
    sourceId: known.has(sourceId) ? sourceId : '',
    notesForUser:
      (String(parsed.notesForUser ?? '').trim() ||
        '以下为模型拟稿，请核对后保存。') +
      ' ' +
      fetchNote,
    fetchedJobText: jobText,
    fetchNote,
  }
}

/** One-time (or on CV update) summary — result should be cached in settings. */
export async function summarizeCvWithLlm(
  settings: LlmSettings,
  cvText: string,
): Promise<string> {
  if (!cvText.trim()) throw new Error('CV 文本为空，请先上传文件')

  const system = `你是欧洲岗位制博士申请顾问。根据申请人的 CV 文本，用中文写一份结构化背景摘要，供后续岗位匹配反复使用。
要求：
- 400–700 字为宜，信息密度高，不要空话
- 覆盖：学历与时间线、研究方向、核心技能与工具、代表项目/论文、语言、地理/签证相关约束（若有）、可推断的申请目标
- 不要编造 CV 中没有的信息；不确定处略过
- 直接输出摘要正文，不要标题外的寒暄，不要 JSON`

  const content = await chatCompletion(
    settings,
    [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `CV 文本：\n${cvText.trim().slice(0, 60000)}`,
      },
    ],
    { temperature: 0.3 },
  )
  return content.trim()
}

/** One-time (or on RP update) summary — result should be cached in settings. */
export async function summarizeRpWithLlm(
  settings: LlmSettings,
  rpText: string,
): Promise<string> {
  if (!rpText.trim()) throw new Error('RP 文本为空')

  const system = `你是欧洲 CS 博士申请顾问。根据申请人的研究计划（RP），用中文写一份结构化摘要，供后续判断「RP 与各博士机会的契合度」反复使用。
要求：
- 300–500 字为宜，信息密度高，不要空话
- 覆盖：研究问题与动机、核心方法/技术路线、应用场景或数据、预期贡献、关键词（中英文各 5-10 个）、可延展的相邻方向
- 保留专有名词、方法名、领域术语的英文原文
- 不要编造 RP 中没有的信息
- 直接输出摘要正文，不要寒暄，不要 JSON`

  const content = await chatCompletion(
    settings,
    [
      { role: 'system', content: system },
      { role: 'user', content: `RP 文本：\n${rpText.trim().slice(0, 40000)}` },
    ],
    { temperature: 0.3 },
  )
  return content.trim()
}

export async function analyzeOpportunityWithLlm(
  settings: LlmSettings,
  input: AnalyzeInput,
): Promise<AiAnalysis & { fetchedJobText?: string }> {
  const page = await resolvePageText({
    url: input.url,
    pasted: input.jobText,
  })
  const jobText = page.text

  const system = `你是欧洲岗位制（position-based）博士申请顾问。根据用户提供的招聘文本与「已缓存的申请者背景摘要」，输出严格 JSON（不要 markdown 代码块），字段如下：
{
  "summary": "岗位简介（中文，120-200字，含课题、合同/资助、地点、DDL若有）",
  "matchAssessment": "与申请者背景摘要的匹配分析（中文，指出匹配点与缺口）",
  "matchScore": 1到10的整数或 null（信息不足时为 null）,
  "internationalApplicants": "yes" | "no" | "unclear",
  "visaSupport": "yes" | "no" | "unclear",
  "visaNotes": "关于国际申请/签证/工作许可的原文要点或推断说明（中文）"
}
internationalApplicants：是否接受国际学生/非欧盟申请者。
visaSupport：雇主是否提及协助签证、工作许可或 relocation。
只依据给定文本，不要编造未出现的硬性规定；不确定标 unclear。
注意：申请者信息已是摘要，不要要求或假设还有完整 CV。`

  const user = `岗位链接：${input.url}
岗位标题：${input.title || '（未提供）'}

申请者背景摘要（已预先总结，请直接用于匹配，勿再要求原文 CV）：
${input.profileSummary.trim() || '（尚未生成背景摘要，请只做岗位摘要与国际/签证相关判断，匹配分析注明缺少背景）'}

招聘文本：
${jobText.slice(0, 24000)}`

  const content = await chatCompletion(
    settings,
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { json: true, temperature: 0.2 },
  )

  const parsed = extractJsonObject(content) as Record<string, unknown>
  const scoreRaw = parsed.matchScore
  let matchScore: number | null = null
  if (typeof scoreRaw === 'number' && Number.isFinite(scoreRaw)) {
    matchScore = Math.max(1, Math.min(10, Math.round(scoreRaw)))
  }

  return {
    summary: String(parsed.summary ?? '').trim() || '（无简介）',
    matchAssessment:
      String(parsed.matchAssessment ?? '').trim() || '（无匹配分析）',
    matchScore,
    internationalApplicants: parseYesNoUnclear(parsed.internationalApplicants),
    visaSupport: parseYesNoUnclear(parsed.visaSupport),
    visaNotes: String(parsed.visaNotes ?? '').trim(),
    analyzedAt: new Date().toISOString(),
    fetchedJobText: page.fromPaste ? undefined : jobText,
  }
}
