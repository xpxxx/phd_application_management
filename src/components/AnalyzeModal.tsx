import { useState, type FormEvent } from 'react'
import { analyzeOpportunityWithLlm } from '../lib/llm'
import {
  YES_NO_UNCLEAR_LABELS,
  type AiAnalysis,
  type AppSettings,
  type Opportunity,
} from '../types'

interface AnalyzeModalProps {
  opportunity: Opportunity
  settings: AppSettings
  onClose: () => void
  onSaveAnalysis: (analysis: AiAnalysis) => void
}

export function AnalyzeModal({
  opportunity,
  settings,
  onClose,
  onSaveAnalysis,
}: AnalyzeModalProps) {
  const [jobText, setJobText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fetchHint, setFetchHint] = useState('')
  const [preview, setPreview] = useState<AiAnalysis | null>(
    opportunity.aiAnalysis ?? null,
  )

  const run = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setFetchHint('')
    setLoading(true)
    try {
      const analysis = await analyzeOpportunityWithLlm(settings.llm, {
        url: opportunity.url,
        title: opportunity.title,
        jobText,
        profileSummary:
          settings.profileSummary.trim() || settings.profile.trim(),
      })
      if (analysis.fetchedJobText && !jobText.trim()) {
        setJobText(analysis.fetchedJobText)
        setFetchHint('已自动从链接抓取岗位正文。')
      }
      setPreview(analysis)
      onSaveAnalysis(analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-labelledby="analyze-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <h3 id="analyze-title">AI 分析 · {opportunity.title}</h3>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            关闭
          </button>
        </header>

        <p className="muted small">
          默认会从下方链接自动抓取正文再分析；抓取失败或不准时可手动粘贴补充。
        </p>
        <p className="mono small" style={{ wordBreak: 'break-all' }}>
          {opportunity.url}
        </p>

        {!settings.profileSummary.trim() && !settings.profile.trim() && (
          <p className="error" style={{ color: 'var(--warn)' }}>
            尚未生成申请者背景摘要，匹配分析会受限。请先到「设置」上传 CV 并总结。
          </p>
        )}

        {!settings.llm.apiKey && (
          <p className="error">尚未配置 API Key，请先到「设置」填写。</p>
        )}

        <form onSubmit={(e) => void run(e)}>
          <label className="full" style={{ display: 'block' }}>
            <span className="muted small">岗位详情文本（可选）</span>
            <textarea
              rows={8}
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              placeholder="留空则自动抓取链接正文…"
              style={{ width: '100%', marginTop: '0.35rem' }}
            />
          </label>
          {fetchHint && (
            <p className="muted small" style={{ color: 'var(--warn)' }}>
              {fetchHint}
            </p>
          )}
          {error && <p className="error">{error}</p>}
          <div className="btn-row" style={{ marginTop: '0.75rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !settings.llm.apiKey}
            >
              {loading ? '抓取/分析中…' : preview ? '重新分析' : '开始分析'}
            </button>
          </div>
        </form>

        {preview && (
          <div className="analysis-result">
            <h4>岗位简介</h4>
            <p>{preview.summary}</p>
            <h4>
              匹配情况
              {preview.matchScore != null && (
                <span className="badge" style={{ marginLeft: '0.5rem' }}>
                  {preview.matchScore}/10
                </span>
              )}
            </h4>
            <p>{preview.matchAssessment}</p>
            <div className="analysis-flags">
              <span>
                国际申请：{YES_NO_UNCLEAR_LABELS[preview.internationalApplicants]}
              </span>
              <span>
                签证协助：{YES_NO_UNCLEAR_LABELS[preview.visaSupport]}
              </span>
            </div>
            {preview.visaNotes && (
              <>
                <h4>签证 / 国际相关说明</h4>
                <p>{preview.visaNotes}</p>
              </>
            )}
            <p className="muted small">
              分析于 {new Date(preview.analyzedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
