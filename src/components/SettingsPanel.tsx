import { useEffect, useState, type FormEvent } from 'react'
import { extractCvText } from '../lib/cvText'
import { summarizeCvWithLlm, summarizeRpWithLlm } from '../lib/llm'
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
  const [rpText, setRpText] = useState(settings.researchProposal ?? '')
  const [rpSaved, setRpSaved] = useState(false)
  const [rpUploading, setRpUploading] = useState(false)
  const [rpError, setRpError] = useState('')
  const [rpSummarizing, setRpSummarizing] = useState(false)

  useEffect(() => {
    setForm(settings)
    setRpText(settings.researchProposal ?? '')
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

  const saveRp = (text: string, fileName?: string): AppSettings => {
    const changed = text.trim() !== (form.researchProposal ?? '')
    const next: AppSettings = {
      ...form,
      researchProposal: text.trim() || undefined,
      researchProposalFileName: text.trim() ? fileName : undefined,
      ...(changed && {
        researchProposalSummary: undefined,
        researchProposalSummarizedAt: undefined,
      }),
    }
    persist(next, { toast: false })
    setRpSaved(true)
    window.setTimeout(() => setRpSaved(false), 2000)
    return next
  }

  const runRpSummarize = async () => {
    setRpError('')
    if (!rpText.trim()) {
      setRpError('请先粘贴或上传 RP')
      return
    }
    if (!form.llm.apiKey.trim()) {
      setRpError('请先填写并保存 API Key')
      return
    }
    const base =
      rpText.trim() === (form.researchProposal ?? '')
        ? form
        : saveRp(rpText, form.researchProposalFileName)
    setRpSummarizing(true)
    try {
      const summary = await summarizeRpWithLlm(base.llm, rpText)
      persist({
        ...base,
        researchProposalSummary: summary,
        researchProposalSummarizedAt: new Date().toISOString(),
      })
    } catch (err) {
      setRpError(err instanceof Error ? err.message : 'RP 总结失败')
    } finally {
      setRpSummarizing(false)
    }
  }

  const onRpFile = async (file: File | undefined) => {
    if (!file) return
    setRpError('')
    setRpUploading(true)
    try {
      const text = await extractCvText(file)
      if (!text.trim()) throw new Error('未能从文件中提取到文本')
      setRpText(text)
      saveRp(text, file.name)
    } catch (err) {
      setRpError(err instanceof Error ? err.message : '读取 RP 失败')
    } finally {
      setRpUploading(false)
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

      <div className="opp-form">
        <h3>我的研究计划（RP）</h3>
        <p className="muted small">
          保存后点「生成 RP 摘要」，大模型总结一次并缓存。收件箱「AI 拟稿」只带上这份摘要，
          用来判断机会是岗位制还是统招以及 RP 契合度，不会每次都发送完整 RP。修改 RP
          后需重新生成。仅存本机。
        </p>
        <div className="btn-row" style={{ marginBottom: '0.75rem' }}>
          <label className="btn btn-secondary file-label">
            {rpUploading ? '读取中…' : '上传 RP 文件'}
            <input
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
              hidden
              disabled={rpUploading}
              onChange={(e) => {
                void onRpFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
          {form.researchProposalFileName && (
            <span className="muted small">
              来自文件：{form.researchProposalFileName}
            </span>
          )}
        </div>
        {rpError && <p className="error">{rpError}</p>}
        <label className="full">
          <textarea
            rows={8}
            value={rpText}
            onChange={(e) => setRpText(e.target.value)}
            placeholder="粘贴 RP 正文，或上传 PDF / TXT / MD…"
          />
        </label>
        <div className="btn-row" style={{ marginTop: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={rpText === (settings.researchProposal ?? '')}
            onClick={() => saveRp(rpText, form.researchProposalFileName)}
          >
            保存 RP
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={rpSummarizing || !rpText.trim()}
            onClick={() => void runRpSummarize()}
          >
            {rpSummarizing
              ? '总结中…'
              : form.researchProposalSummary
                ? '重新生成 RP 摘要（覆盖）'
                : '生成 RP 摘要'}
          </button>
          {rpText && (
            <button
              type="button"
              className="btn btn-ghost danger"
              onClick={() => {
                if (!confirm('清除已保存的 RP？')) return
                setRpText('')
                saveRp('')
              }}
            >
              清除 RP
            </button>
          )}
          {rpSaved && <span className="muted small">已保存到本机</span>}
          {rpText && (
            <span className="muted small">约 {rpText.length.toLocaleString()} 字</span>
          )}
        </div>
        {form.researchProposalSummary ? (
          <div
            className="analysis-result"
            style={{ borderTop: 'none', marginTop: '0.75rem', paddingTop: 0 }}
          >
            <h4>
              已缓存的 RP 摘要
              {form.researchProposalSummarizedAt && (
                <span
                  className="muted small"
                  style={{ fontWeight: 400, marginLeft: '0.5rem' }}
                >
                  {new Date(form.researchProposalSummarizedAt).toLocaleString()}
                </span>
              )}
            </h4>
            <p style={{ whiteSpace: 'pre-wrap' }}>
              {form.researchProposalSummary}
            </p>
          </div>
        ) : (
          form.researchProposal && (
            <p className="error" style={{ color: 'var(--warn)' }}>
              尚未生成 RP 摘要。在生成之前，AI 拟稿会直接发送 RP 原文（前约 8000
              字），更耗 token。
            </p>
          )
        )}
      </div>
    </section>
  )
}
