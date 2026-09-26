import { useRef, useState, type FormEvent } from 'react'
import { sources as builtinSources } from '../data/sources'
import { analyzeSourceWithLlm } from '../lib/llm'
import { fetchPageText } from '../lib/fetchPageText'
import { groupSourcesByCountry } from '../lib/groupSources'
import { slugId } from '../lib/storage'
import {
  SOURCE_TYPE_LABELS,
  type LlmSettings,
  type Source,
  type SourceType,
} from '../types'

const SOURCE_TYPES: SourceType[] = [
  'aggregator',
  'national',
  'project',
  'university',
  'other',
]

interface SourceManagerProps {
  customSources: Source[]
  skillExtras: string[]
  onSave: (source: Source, attachSkillId?: string) => void
  onDelete: (id: string) => void
  /** Discard the local edit of a built-in source. */
  onReset: (id: string) => void
  onPin: (sourceId: string) => void
  onUnpin: (sourceId: string) => void
  currentSkillId: string
  llm: LlmSettings
  onOpenSettings: () => void
}

interface SourceFormState {
  name: string
  url: string
  countriesText: string
  type: SourceType
  howToSearch: string
  csNotes: string
  searchUrlTemplate: string
}

const emptyForm = (): SourceFormState => ({
  name: '',
  url: '',
  countriesText: 'Europe',
  type: 'other',
  howToSearch: '',
  csNotes: '',
  searchUrlTemplate: '',
})

export function SourceManager({
  customSources,
  skillExtras,
  onSave,
  onDelete,
  onReset,
  onPin,
  onUnpin,
  currentSkillId,
  llm,
  onOpenSettings,
}: SourceManagerProps) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [attachToSkill, setAttachToSkill] = useState(true)
  const [error, setError] = useState('')
  const [pageHint, setPageHint] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [aiNote, setAiNote] = useState('')
  const [fieldsReady, setFieldsReady] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const builtinIds = new Set(builtinSources.map((s) => s.id))
  const userSources = customSources.filter((s) => !builtinIds.has(s.id))
  const catalogSources = [
    ...builtinSources.map(
      (b) => customSources.find((c) => c.id === b.id) ?? b,
    ),
    ...userSources,
  ]
  const isOverridden = (id: string) => customSources.some((c) => c.id === id)

  const reset = () => {
    setForm(emptyForm())
    setEditingId(null)
    setAttachToSkill(true)
    setError('')
    setPageHint('')
    setAiNote('')
    setFieldsReady(false)
  }

  const startCreate = () => {
    reset()
    setShowForm(true)
  }

  const startEdit = (s: Source) => {
    setEditingId(s.id)
    setForm({
      name: s.name,
      url: s.url,
      countriesText: s.countries.join(', '),
      type: s.type,
      howToSearch: s.howToSearch,
      csNotes: s.csNotes,
      searchUrlTemplate: s.searchUrlTemplate ?? '',
    })
    setAttachToSkill(false)
    setError('')
    setPageHint('')
    setAiNote('')
    setFieldsReady(true)
    setShowForm(true)
    requestAnimationFrame(() =>
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  const runAiFill = async () => {
    setError('')
    setAiNote('')
    if (!form.url.trim()) {
      setError('请先填写源链接')
      return
    }
    try {
      new URL(form.url.trim())
    } catch {
      setError('请输入合法的 URL')
      return
    }
    if (!llm.apiKey.trim()) {
      if (confirm('尚未配置 API Key，是否前往设置？')) onOpenSettings()
      return
    }

    setAnalyzing(true)
    try {
      let pageText = pageHint.trim()
      let fetchNote = ''
      if (!pageText) {
        try {
          const fetched = await fetchPageText(form.url.trim())
          pageText = fetched.text
          fetchNote = `已抓取页面（${fetched.strategy}）。`
        } catch {
          fetchNote =
            '未能抓取页面，已主要依据链接推断；可粘贴首页简介后再分析一次。'
        }
      }
      const draft = await analyzeSourceWithLlm(llm, {
        url: form.url.trim(),
        pageText: pageText || undefined,
      })
      setForm((prev) => ({
        ...prev,
        name: draft.name,
        type: draft.type,
        countriesText: draft.countries.join(', '),
        howToSearch: draft.howToSearch,
        csNotes: draft.csNotes,
        searchUrlTemplate: draft.searchUrlTemplate,
      }))
      setAiNote(`${draft.notesForUser}${fetchNote ? ` ${fetchNote}` : ''}`)
      if (pageText && !pageHint.trim()) setPageHint(pageText.slice(0, 8000))
      setFieldsReady(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败')
    } finally {
      setAnalyzing(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.url.trim()) {
      setError('名称和首页 URL 为必填')
      return
    }
    try {
      new URL(form.url.trim())
    } catch {
      setError('请输入合法的 URL')
      return
    }
    const countries = form.countriesText
      .split(/[,，]/)
      .map((c) => c.trim())
      .filter(Boolean)
    const source: Source = {
      id: editingId ?? slugId(form.name),
      name: form.name.trim(),
      url: form.url.trim(),
      countries: countries.length ? countries : ['Europe'],
      type: form.type,
      howToSearch:
        form.howToSearch.trim() || '打开首页后按关键词搜索 PhD / doctoral。',
      csNotes: form.csNotes.trim() || '用户自定义源',
      searchUrlTemplate: form.searchUrlTemplate.trim() || undefined,
    }
    onSave(source, !editingId && attachToSkill ? currentSkillId : undefined)
    if (editingId && attachToSkill) onPin(source.id)
    reset()
    setShowForm(false)
  }

  return (
    <details className="source-manager">
      <summary>
        管理检索源（{catalogSources.length}）
      </summary>

      <p className="muted small">
        新增的源会按国家自动归入目录；新增与修改仅保存在本机。新增时可先贴链接让
        AI 预填，不满意再改；链接过期可在目录里点“编辑”修正。好用的源也可 PR 到{' '}
        <code>src/data/sources.ts</code>。
      </p>

      <div className="btn-row" style={{ marginBottom: '0.75rem' }}>
        <button type="button" className="btn btn-primary" onClick={startCreate}>
          新增源
        </button>
      </div>

      {showForm && (
        <form ref={formRef} className="opp-form" onSubmit={submit}>
          <h3>
            {editingId ? '编辑源（仅本机生效）' : '新增源'}
          </h3>
          {error && <p className="error">{error}</p>}

          <div className="form-grid">
            <label className="full">
              源链接 *
              <input
                type="url"
                value={form.url}
                onChange={(e) => {
                  setForm({ ...form, url: e.target.value })
                  setFieldsReady(false)
                }}
                placeholder="https://"
                required
              />
            </label>
            <label className="full">
              可选：粘贴首页简介（留空则自动抓取）
              <textarea
                rows={3}
                value={pageHint}
                onChange={(e) => setPageHint(e.target.value)}
                placeholder="从该站复制一段 About / How to search…"
              />
            </label>
          </div>

          <div className="btn-row" style={{ marginBottom: '0.85rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={analyzing}
              onClick={() => void runAiFill()}
            >
              {analyzing ? 'AI 分析中…' : 'AI 分析并预填'}
            </button>
            {!editingId && (
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

          {(fieldsReady || editingId) && (
            <>
              <div className="form-grid">
                <label>
                  名称 *
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  类型
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        type: e.target.value as SourceType,
                      })
                    }
                  >
                    {SOURCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {SOURCE_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="full">
                  搜索 URL 模板（可选，用 {'{query}'} 占位）
                  <input
                    value={form.searchUrlTemplate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        searchUrlTemplate: e.target.value,
                      })
                    }
                    placeholder="https://example.com/search?q={query}"
                  />
                </label>
                <label>
                  国家（逗号分隔）
                  <input
                    value={form.countriesText}
                    onChange={(e) =>
                      setForm({ ...form, countriesText: e.target.value })
                    }
                  />
                </label>
                <label>
                  如何搜索
                  <input
                    value={form.howToSearch}
                    onChange={(e) =>
                      setForm({ ...form, howToSearch: e.target.value })
                    }
                  />
                </label>
                <label className="full">
                  CS 备注
                  <textarea
                    rows={2}
                    value={form.csNotes}
                    onChange={(e) =>
                      setForm({ ...form, csNotes: e.target.value })
                    }
                  />
                </label>
              </div>
              <label
                className="check-inline"
                style={{ marginBottom: '0.75rem' }}
              >
                <input
                  type="checkbox"
                  checked={attachToSkill}
                  onChange={(e) => setAttachToSkill(e.target.checked)}
                />
                加入当前配方扫描列表
              </label>
              <div className="btn-row">
                <button type="submit" className="btn btn-primary">
                  保存
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={analyzing}
                  onClick={() => void runAiFill()}
                >
                  不满意，再分析一次
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    reset()
                    setShowForm(false)
                  }}
                >
                  取消
                </button>
              </div>
            </>
          )}
        </form>
      )}

      <details className="all-sources">
        <summary>检索源目录（{catalogSources.length}）</summary>
        {groupSourcesByCountry(catalogSources).map((group) => (
          <div key={group.key} className="source-group">
            <h4 className="source-group-title">
              {group.label} · {group.sources.length}
            </h4>
            <ul className="source-catalog">
              {group.sources.map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.name}
                  </a>
                  <span className="muted small">
                    {' '}
                    · {SOURCE_TYPE_LABELS[s.type]} · {s.countries.join(', ')}
                    {builtinIds.has(s.id) && isOverridden(s.id) ? ' · 已修改' : ''}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ marginLeft: '0.5rem' }}
                    onClick={() => startEdit(s)}
                  >
                    编辑
                  </button>
                  {!builtinIds.has(s.id) && (
                    <button
                      type="button"
                      className="btn btn-ghost danger"
                      onClick={() => {
                        if (confirm(`删除源「${s.name}」？`)) onDelete(s.id)
                      }}
                    >
                      删除
                    </button>
                  )}
                  {builtinIds.has(s.id) && isOverridden(s.id) && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        if (confirm(`将「${s.name}」恢复为内置默认？`)) {
                          if (editingId === s.id) {
                            reset()
                            setShowForm(false)
                          }
                          onReset(s.id)
                        }
                      }}
                    >
                      恢复默认
                    </button>
                  )}
                  {skillExtras.includes(s.id) ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => onUnpin(s.id)}
                    >
                      移出配方
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => onPin(s.id)}
                    >
                      加入当前配方
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </details>
    </details>
  )
}
