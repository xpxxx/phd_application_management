import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MutableRefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { checklists } from '../data/checklists'
import { draftOpportunityWithLlm } from '../lib/llm'
import { AnalyzeModal } from './AnalyzeModal'
import {
  OPPORTUNITY_PRIORITY_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  PRIORITY_ORDER,
  YES_NO_UNCLEAR_LABELS,
  type AppSettings,
  type Opportunity,
  type OpportunityPriority,
  type OpportunityStatus,
  type Source,
} from '../types'
import { findDuplicate, newId } from '../lib/storage'

interface InboxProps {
  opportunities: Opportunity[]
  allSources: Source[]
  settings: AppSettings
  onSave: (opp: Opportunity) => void
  onDelete: (id: string) => void
  draftPrefill: Partial<Opportunity> | null
  onClearPrefill: () => void
  onExport: () => void
  onImport: (file: File) => Promise<void>
  onOpenSettings: () => void
  /** Filled by Inbox so the app can ask before leaving with unsaved edits. */
  leaveGuardRef?: MutableRefObject<((action: () => void) => void) | null>
}

const STATUSES: OpportunityStatus[] = [
  'to_review',
  'interested',
  'will_apply',
  'applied',
  'dropped',
]

const PRIORITIES: OpportunityPriority[] = ['must', 'try', 'low']

const emptyForm = (): Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt'> => ({
  title: '',
  url: '',
  sourceId: '',
  country: '',
  deadline: '',
  status: 'to_review',
  priority: 'try',
  tags: [],
  note: '',
  checklist: {},
})

export function Inbox({
  opportunities,
  allSources,
  settings,
  onSave,
  onDelete,
  draftPrefill,
  onClearPrefill,
  onExport,
  onImport,
  onOpenSettings,
  leaveGuardRef,
}: InboxProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | 'all'>(
    'all',
  )
  const [priorityFilter, setPriorityFilter] = useState<
    OpportunityPriority | 'all'
  >('all')
  const [countryFilter, setCountryFilter] = useState('')
  const [editing, setEditing] = useState<Opportunity | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [tagInput, setTagInput] = useState('')
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [analyzing, setAnalyzing] = useState<Opportunity | null>(null)
  const [jobDraftText, setJobDraftText] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [fieldsReady, setFieldsReady] = useState(false)
  const [aiNote, setAiNote] = useState('')
  const [snapshot, setSnapshot] = useState('')
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(
    null,
  )
  const createFormRef = useRef<HTMLFormElement>(null)

  const formSnapshot = (
    f: typeof form,
    tags: string,
    jobText: string,
  ) => JSON.stringify([f, tags, jobText])

  const dirty =
    showForm && formSnapshot(form, tagInput, jobDraftText) !== snapshot
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  const closeForm = () => {
    dirtyRef.current = false
    setShowForm(false)
    setEditing(null)
    setForm(emptyForm())
    setTagInput('')
    setFieldsReady(false)
    setAiNote('')
    setJobDraftText('')
    setError('')
  }

  /** Run action now, or after the user decides what to do with unsaved edits. */
  const guard = (action: () => void) => {
    if (dirtyRef.current) setPendingAction(() => action)
    else action()
  }

  useEffect(() => {
    if (!leaveGuardRef) return
    leaveGuardRef.current = guard
    return () => {
      leaveGuardRef.current = null
    }
  })

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  useEffect(() => {
    if (!draftPrefill) return
    setForm({
      ...emptyForm(),
      title: draftPrefill.title ?? '',
      url: draftPrefill.url ?? '',
      sourceId: draftPrefill.sourceId ?? '',
      priority: draftPrefill.priority ?? 'try',
    })
    setEditing(null)
    setTagInput('')
    setJobDraftText('')
    setAiNote('')
    setFieldsReady(Boolean(draftPrefill.title))
    setShowForm(true)
    setError('')
    setSnapshot(formSnapshot(emptyForm(), '', ''))
    onClearPrefill()
  }, [draftPrefill, onClearPrefill])

  const countries = useMemo(() => {
    const set = new Set(
      opportunities.map((o) => o.country).filter((c): c is string => Boolean(c)),
    )
    return Array.from(set).sort()
  }, [opportunities])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return opportunities
      .filter((o) => {
        if (editing && o.id === editing.id) return true
        if (statusFilter !== 'all' && o.status !== statusFilter) return false
        if (priorityFilter !== 'all' && o.priority !== priorityFilter)
          return false
        if (countryFilter && o.country !== countryFilter) return false
        if (!q) return true
        return (
          o.title.toLowerCase().includes(q) ||
          o.url.toLowerCase().includes(q) ||
          o.note.toLowerCase().includes(q) ||
          o.tags.some((t) => t.toLowerCase().includes(q)) ||
          (o.country ?? '').toLowerCase().includes(q) ||
          (o.aiAnalysis?.summary ?? '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        const pd =
          PRIORITY_ORDER[a.priority ?? 'try'] -
          PRIORITY_ORDER[b.priority ?? 'try']
        if (pd !== 0) return pd
        return (a.deadline || '9999').localeCompare(b.deadline || '9999')
      })
  }, [opportunities, query, statusFilter, priorityFilter, countryFilter, editing])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setTagInput('')
    setJobDraftText('')
    setAiNote('')
    setFieldsReady(false)
    setError('')
    setShowForm(true)
    setSnapshot(formSnapshot(emptyForm(), '', ''))
    requestAnimationFrame(() =>
      createFormRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      }),
    )
  }

  const openEdit = (opp: Opportunity) => {
    const next = {
      title: opp.title,
      url: opp.url,
      sourceId: opp.sourceId ?? '',
      country: opp.country ?? '',
      deadline: opp.deadline ?? '',
      status: opp.status,
      priority: opp.priority ?? 'try',
      tags: opp.tags,
      note: opp.note,
      checklist: opp.checklist ?? {},
      aiAnalysis: opp.aiAnalysis,
    }
    const tags = opp.tags.join(', ')
    setEditing(opp)
    setForm(next)
    setTagInput(tags)
    setJobDraftText('')
    setAiNote('')
    setFieldsReady(true)
    setError('')
    setShowForm(true)
    setSnapshot(formSnapshot(next, tags, ''))
  }

  const runAiDraft = async () => {
    setError('')
    setAiNote('')
    if (!form.url.trim()) {
      setError('请先填写岗位链接')
      return
    }
    try {
      new URL(form.url.trim())
    } catch {
      setError('请输入合法的 URL')
      return
    }
    if (!settings.llm.apiKey.trim()) {
      if (confirm('尚未配置 API Key，是否前往设置？')) onOpenSettings()
      return
    }
    setDrafting(true)
    try {
      const draft = await draftOpportunityWithLlm(settings.llm, {
        url: form.url.trim(),
        jobText: jobDraftText,
        profileSummary:
          settings.profileSummary.trim() || settings.profile.trim(),
        sources: allSources.map((s) => ({
          id: s.id,
          name: s.name,
          url: s.url,
        })),
      })
      if (!jobDraftText.trim() && draft.fetchedJobText) {
        setJobDraftText(draft.fetchedJobText)
      }
      setForm((prev) => ({
        ...prev,
        title: draft.title,
        country: draft.country,
        deadline: draft.deadline,
        priority: draft.priority,
        status: draft.status,
        note: draft.note,
        sourceId: draft.sourceId || prev.sourceId,
        tags: draft.tags,
      }))
      setTagInput(draft.tags.join(', '))
      setAiNote(draft.notesForUser)
      setFieldsReady(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '拟稿失败')
    } finally {
      setDrafting(false)
    }
  }

  /** Returns true when the form was saved and closed. */
  const saveForm = (): boolean => {
    setError('')
    if (!form.title.trim() || !form.url.trim()) {
      setError('标题和链接为必填')
      return false
    }
    const tags = tagInput
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean)
    const now = new Date().toISOString()
    const opp: Opportunity = {
      id: editing?.id ?? newId(),
      title: form.title.trim(),
      url: form.url.trim(),
      sourceId: form.sourceId || undefined,
      country: (form.country ?? '').trim() || undefined,
      deadline: form.deadline || undefined,
      status: form.status,
      priority: form.priority,
      tags,
      note: form.note.trim(),
      checklist: form.checklist,
      aiAnalysis: form.aiAnalysis ?? editing?.aiAnalysis,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    }
    try {
      const dup = findDuplicate(opportunities, opp.url, editing?.id)
      if (dup) {
        setError(`链接已存在：「${dup.title}」`)
        return false
      }
      onSave(opp)
      closeForm()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
      return false
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    saveForm()
  }

  const checklist = checklists[0]

  const toggleCheck = (itemId: string) => {
    setForm((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [itemId]: !prev.checklist?.[itemId],
      },
    }))
  }

  const renderForm = () => (
    <form
      ref={editing ? undefined : createFormRef}
      className="opp-form"
      onSubmit={submit}
    >
      <h3>{editing ? '编辑机会' : '新增机会'}</h3>
      {error && <p className="error">{error}</p>}
      <p className="muted small">
        填写岗位链接后即可 AI 拟稿（会自动抓取页面正文）。也可选粘贴正文以提高准确性。
      </p>
      <div className="form-grid">
        <label className="full">
          链接 *
          <input
            type="url"
            value={form.url}
            onChange={(e) => {
              setForm({ ...form, url: e.target.value })
              if (!editing) setFieldsReady(false)
            }}
            placeholder="https://"
            required
          />
        </label>
        <label className="full">
          岗位详情文本（可选；留空则自动从链接抓取）
          <textarea
            rows={5}
            value={jobDraftText}
            onChange={(e) => setJobDraftText(e.target.value)}
            placeholder="留空则自动抓取；抓取失败或不准时再粘贴正文…"
          />
        </label>
      </div>
      <div className="btn-row" style={{ marginBottom: '0.85rem' }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={drafting}
          onClick={() => void runAiDraft()}
        >
          {drafting ? 'AI 拟稿中…' : 'AI 拟稿并预填'}
        </button>
        {!editing && !fieldsReady && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setFieldsReady(true)}
          >
            跳过，手动填写
          </button>
        )}
      </div>
      {aiNote && (
        <p className="muted small" style={{ color: 'var(--warn)' }}>
          {aiNote}
        </p>
      )}
      {(fieldsReady || Boolean(editing)) && (
        <>
          <div className="form-grid">
            <label>
              标题 *
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </label>
            <label>
              来源
              <select
                value={form.sourceId}
                onChange={(e) =>
                  setForm({ ...form, sourceId: e.target.value })
                }
              >
                <option value="">未指定</option>
                {allSources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              优先级
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority: e.target.value as OpportunityPriority,
                  })
                }
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {OPPORTUNITY_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              国家
              <input
                value={form.country}
                onChange={(e) =>
                  setForm({ ...form, country: e.target.value })
                }
                placeholder="DE / NL / CH …"
              />
            </label>
            <label>
              截止日期
              <input
                type="date"
                value={form.deadline}
                onChange={(e) =>
                  setForm({ ...form, deadline: e.target.value })
                }
              />
            </label>
            <label>
              状态
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as OpportunityStatus,
                  })
                }
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {OPPORTUNITY_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="full">
              标签（逗号分隔）
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="ML, systems, MSCA"
              />
            </label>
            <label className="full">
              备注
              <textarea
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </label>
          </div>

          {checklist && (
            <fieldset className="checklist">
              <legend>{checklist.title}</legend>
              {checklist.items.map((item) => (
                <label key={item.id} className="check-row">
                  <input
                    type="checkbox"
                    checked={Boolean(form.checklist?.[item.id])}
                    onChange={() => toggleCheck(item.id)}
                  />
                  <span>
                    {item.label}
                    {item.hint && (
                      <span className="muted small"> — {item.hint}</span>
                    )}
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          <div className="btn-row">
            <button type="submit" className="btn btn-primary">
              保存到本地
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={drafting}
              onClick={() => void runAiDraft()}
            >
              不满意，再拟一次
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => guard(closeForm)}
            >
              取消
            </button>
          </div>
        </>
      )}
    </form>
  )

  return (
    <section className="panel inbox">
      <header className="panel-header">
        <div>
          <h2>本地机会收件箱</h2>
          <p className="muted">
            数据仅存在本浏览器。请定期导出备份，勿将导出文件提交到公开仓库。
          </p>
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => guard(openCreate)}
          >
            新增机会
          </button>
          <button type="button" className="btn btn-secondary" onClick={onExport}>
            导出 JSON
          </button>
          <label className="btn btn-ghost file-label">
            导入
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file)
                  guard(() => {
                    closeForm()
                    void onImport(file).catch((err) => {
                      alert(err instanceof Error ? err.message : '导入失败')
                    })
                  })
              }}
            />
          </label>
        </div>
      </header>

      <div className="filters filters-4">
        <input
          type="search"
          placeholder="搜索标题、链接、标签、备注…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          value={priorityFilter}
          onChange={(e) =>
            setPriorityFilter(e.target.value as OpportunityPriority | 'all')
          }
        >
          <option value="all">全部优先级</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {OPPORTUNITY_PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as OpportunityStatus | 'all')
          }
        >
          <option value="all">全部状态</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {OPPORTUNITY_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
        >
          <option value="">全部国家</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {showForm && !editing && renderForm()}

      {filtered.length === 0 ? (
        <p className="empty">
          {opportunities.length === 0
            ? '收件箱为空。从工作台打开搜索后，把感兴趣的岗位加进来。'
            : '没有符合筛选条件的机会。'}
        </p>
      ) : (
        <ul className="opp-list">
          {filtered.map((opp) => {
            const sourceName = allSources.find((s) => s.id === opp.sourceId)?.name
            const checkedCount = Object.values(opp.checklist ?? {}).filter(
              Boolean,
            ).length
            const totalChecks = checklist?.items.length ?? 0
            const priority = opp.priority ?? 'try'
            if (showForm && editing?.id === opp.id) {
              return (
                <li key={opp.id} className="editing">
                  {renderForm()}
                </li>
              )
            }
            return (
              <li key={opp.id}>
                <div className="opp-main">
                  <div className="opp-title-row">
                    <a
                      href={opp.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {opp.title}
                    </a>
                    <span className={`priority priority-${priority}`}>
                      {OPPORTUNITY_PRIORITY_LABELS[priority]}
                    </span>
                    <span className={`status status-${opp.status}`}>
                      {OPPORTUNITY_STATUS_LABELS[opp.status]}
                    </span>
                  </div>
                  <div className="opp-meta muted small">
                    {opp.country && <span>{opp.country}</span>}
                    {sourceName && <span>{sourceName}</span>}
                    {opp.deadline && <span>DDL {opp.deadline}</span>}
                    {totalChecks > 0 && (
                      <span>
                        清单 {checkedCount}/{totalChecks}
                      </span>
                    )}
                  </div>
                  {opp.tags.length > 0 && (
                    <div className="chip-row">
                      {opp.tags.map((t) => (
                        <span key={t} className="chip">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {opp.note && <p className="small">{opp.note}</p>}
                  {opp.aiAnalysis && (
                    <div className="ai-snippet">
                      <p className="small">{opp.aiAnalysis.summary}</p>
                      <div className="opp-meta muted small">
                        {opp.aiAnalysis.matchScore != null && (
                          <span>匹配 {opp.aiAnalysis.matchScore}/10</span>
                        )}
                        <span>
                          国际申请{' '}
                          {
                            YES_NO_UNCLEAR_LABELS[
                              opp.aiAnalysis.internationalApplicants
                            ]
                          }
                        </span>
                        <span>
                          签证协助{' '}
                          {YES_NO_UNCLEAR_LABELS[opp.aiAnalysis.visaSupport]}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="opp-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      guard(() => {
                        if (!settings.llm.apiKey) {
                          if (confirm('尚未配置 API Key，是否前往设置？')) {
                            onOpenSettings()
                          }
                          return
                        }
                        setAnalyzing(opp)
                      })
                    }
                  >
                    AI 分析
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => guard(() => openEdit(opp))}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost danger"
                    onClick={() =>
                      guard(() => {
                        if (confirm(`删除「${opp.title}」？`)) onDelete(opp.id)
                      })
                    }
                  >
                    删除
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {pendingAction &&
        createPortal(
          <div className="modal-backdrop" role="presentation">
            <div
              className="modal modal-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby="unsaved-title"
            >
              <header className="modal-header">
                <h3 id="unsaved-title">有未保存的修改</h3>
              </header>
              <p className="small">
                {editing ? `「${editing.title}」` : '新增的机会'}
                有尚未保存的修改，是否先保存？
              </p>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const action = pendingAction
                    setPendingAction(null)
                    if (saveForm()) action()
                  }}
                >
                  保存
                </button>
                <button
                  type="button"
                  className="btn btn-ghost danger"
                  onClick={() => {
                    const action = pendingAction
                    setPendingAction(null)
                    closeForm()
                    action()
                  }}
                >
                  不保存
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setPendingAction(null)}
                >
                  继续编辑
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {analyzing && (
        <AnalyzeModal
          opportunity={analyzing}
          settings={settings}
          onClose={() => setAnalyzing(null)}
          onSaveAnalysis={(analysis) => {
            onSave({
              ...analyzing,
              aiAnalysis: analysis,
              updatedAt: new Date().toISOString(),
            })
            setAnalyzing({ ...analyzing, aiAnalysis: analysis })
          }}
        />
      )}
    </section>
  )
}
