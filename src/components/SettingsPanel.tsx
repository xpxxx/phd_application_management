import { useEffect, useState, type FormEvent } from 'react'
import { extractCvText } from '../lib/cvText'
import { summarizeCvWithLlm } from '../lib/llm'
import { DEFAULT_LLM_SETTINGS, type AppSettings } from '../types'

interface SettingsPanelProps {
  settings: AppSettings
  onSave: (settings: AppSettings) => void
}

export function SettingsPanel({ settings, onSave }: SettingsPanelProps) {
  const [form, setForm] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [error, setError] = useState('')
  const [pendingSummary, setPendingSummary] = useState(false)

  useEffect(() => {
    setForm(settings)
  }, [settings])

  const persist = (next: AppSettings, opts?: { toast?: boolean }) => {
    setForm(next)
    onSave(next)
    if (opts?.toast !== false) {
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2000)
    }
  }

  const applyDeepSeek = () => {
    setForm({
      ...form,
      llm: {
        ...DEFAULT_LLM_SETTINGS,
        apiKey: form.llm.apiKey,
      },
    })
  }

  const submitLlm = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    persist(form)
  }

  const onCvFile = async (file: File | undefined) => {
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const text = await extractCvText(file)
      if (!text.trim()) {
        throw new Error('未能从文件中提取到文本，请换 PDF/TXT/MD 或检查是否为扫描件图片 PDF')
      }
      const next: AppSettings = {
        ...form,
        cvFileName: file.name,
        cvText: text,
        // Invalidate old summary until user regenerates
        profileSummary: '',
        profileSummarizedAt: undefined,
      }
      persist(next, { toast: false })
      setPendingSummary(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取 CV 失败')
    } finally {
      setUploading(false)
    }
  }

  const runSummarize = async () => {
    setError('')
    if (!form.cvText?.trim()) {
      setError('请先上传 CV')
      return
    }
    if (!form.llm.apiKey.trim()) {
      setError('请先填写并保存 API Key')
      return
    }
    setSummarizing(true)
    try {
      const summary = await summarizeCvWithLlm(form.llm, form.cvText)
      const next: AppSettings = {
        ...form,
        profileSummary: summary,
        profileSummarizedAt: new Date().toISOString(),
        profile: '', // clear legacy field
      }
      persist(next)
      setPendingSummary(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '总结失败')
    } finally {
      setSummarizing(false)
    }
  }

  const clearCv = () => {
    if (!confirm('清除已上传的 CV 与背景摘要？')) return
    persist({
      ...form,
      cvFileName: undefined,
      cvText: undefined,
      profileSummary: '',
      profileSummarizedAt: undefined,
    })
    setPendingSummary(false)
  }

  return (
    <section className="panel settings">
      <header className="panel-header">
        <div>
          <h2>设置</h2>
          <p className="muted">
            上传 CV 后用大模型总结一次并缓存；岗位匹配只使用摘要，避免每次浪费
            token。API Key 仅存本机。
          </p>
        </div>
      </header>

      <form className="opp-form" onSubmit={submitLlm}>
        <div className="panel-header" style={{ marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0 }}>大模型 API</h3>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={applyDeepSeek}
          >
            填入 DeepSeek 预设
          </button>
        </div>
        <p className="muted small" style={{ marginTop: 0 }}>
          在{' '}
          <a
            href="https://platform.deepseek.com/api_keys"
            target="_blank"
            rel="noopener noreferrer"
          >
            platform.deepseek.com
          </a>{' '}
          创建 Key。默认模型：<code>deepseek-chat</code>。
        </p>
        <div className="form-grid">
          <label className="full">
            API Base
            <input
              value={form.llm.apiBase}
              onChange={(e) =>
                setForm({
                  ...form,
                  llm: { ...form.llm, apiBase: e.target.value },
                })
              }
              placeholder="https://api.deepseek.com"
            />
          </label>
          <label className="full">
            API Key
            <input
              type="password"
              autoComplete="off"
              value={form.llm.apiKey}
              onChange={(e) =>
                setForm({
                  ...form,
                  llm: { ...form.llm, apiKey: e.target.value },
                })
              }
              placeholder="sk-…"
            />
          </label>
          <label className="full">
            模型
            <input
              value={form.llm.model}
              onChange={(e) =>
                setForm({
                  ...form,
                  llm: { ...form.llm, model: e.target.value },
                })
              }
              placeholder="deepseek-chat"
            />
          </label>
        </div>
        <div className="btn-row" style={{ marginBottom: '1.25rem' }}>
          <button type="submit" className="btn btn-primary">
            保存 API 设置
          </button>
          {saved && <span className="muted small">已保存到本机</span>}
        </div>
      </form>

      <div className="opp-form">
        <h3>申请者背景（CV → 摘要）</h3>
        <p className="muted small">
          支持 PDF / TXT / MD。上传后点击「生成背景摘要」；换 CV
          后需重新生成以覆盖旧摘要。岗位 AI
          分析只会带上这份摘要，不会再发送完整 CV。
        </p>

        <div className="btn-row" style={{ marginBottom: '0.75rem' }}>
          <label className="btn btn-secondary file-label">
            {uploading ? '读取中…' : '上传 CV'}
            <input
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
              hidden
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0]
                void onCvFile(f)
                e.target.value = ''
              }}
            />
          </label>
          <button
            type="button"
            className="btn btn-primary"
            disabled={summarizing || !form.cvText}
            onClick={() => void runSummarize()}
          >
            {summarizing
              ? '总结中…'
              : form.profileSummary
                ? '重新生成摘要（覆盖）'
                : '生成背景摘要'}
          </button>
          {(form.cvText || form.profileSummary) && (
            <button type="button" className="btn btn-ghost danger" onClick={clearCv}>
              清除 CV / 摘要
            </button>
          )}
        </div>

        {form.cvFileName && (
          <p className="small">
            当前文件：<strong>{form.cvFileName}</strong>
            {form.cvText && (
              <span className="muted">
                {' '}
                · 已提取约 {form.cvText.length.toLocaleString()} 字
              </span>
            )}
          </p>
        )}

        {pendingSummary && !form.profileSummary && (
          <p className="error" style={{ color: 'var(--warn)' }}>
            已上传新 CV，请点击「生成背景摘要」以更新匹配用摘要。
          </p>
        )}

        {error && <p className="error">{error}</p>}

        {form.profileSummary ? (
          <div className="analysis-result" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
            <h4>
              已缓存的背景摘要
              {form.profileSummarizedAt && (
                <span className="muted small" style={{ fontWeight: 400, marginLeft: '0.5rem' }}>
                  {new Date(form.profileSummarizedAt).toLocaleString()}
                </span>
              )}
            </h4>
            <p style={{ whiteSpace: 'pre-wrap' }}>{form.profileSummary}</p>
          </div>
        ) : (
          <p className="empty" style={{ padding: '1rem 0' }}>
            尚无摘要。上传 CV 并生成后，收件箱的 AI 分析将自动使用它。
          </p>
        )}
      </div>
    </section>
  )
}
