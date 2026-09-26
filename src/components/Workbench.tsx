import { useState } from 'react'
import { sources as builtinSources } from '../data/sources'
import { SkillEditor } from './SkillEditor'
import { SourceManager } from './SourceManager'
import { SOURCE_TYPE_LABELS, type LlmSettings, type Skill, type Source } from '../types'
import { buildSearchUrl, queryPreview } from '../lib/searchUrl'
import { groupSourcesByCountry } from '../lib/groupSources'

interface WorkbenchProps {
  skills: Skill[]
  selectedSkillId: string
  onSelectSkill: (id: string) => void
  scannedSourceIds: string[]
  onToggleScanned: (sourceId: string) => void
  onClearScan: () => void
  onSaveSkill: (skill: Skill) => void
  onResetSkill: (skillId: string) => void
  /** True when the selected built-in recipe has a local edited copy. */
  isSkillEdited: boolean
  onSaveToInbox: (prefill: { title?: string; url?: string; sourceId?: string }) => void
  allSources: Source[]
  customSources: Source[]
  skillExtras: string[]
  onSaveSource: (source: Source, attachSkillId?: string) => void
  onDeleteSource: (id: string) => void
  onResetSource: (id: string) => void
  onPinSource: (sourceId: string) => void
  llm: LlmSettings
  onOpenSettings: () => void
}

function resolveSources(
  skill: Skill,
  extras: string[],
  catalog: Source[],
): Source[] {
  const ids = [...skill.sources, ...extras]
  const seen = new Set<string>()
  const result: Source[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    const source = catalog.find((s) => s.id === id)
    if (source) result.push(source)
  }
  return result
}

export function Workbench({
  skills,
  selectedSkillId,
  onSelectSkill,
  scannedSourceIds,
  onToggleScanned,
  onClearScan,
  onSaveSkill,
  onResetSkill,
  isSkillEdited,
  onSaveToInbox,
  allSources,
  customSources,
  skillExtras,
  onSaveSource,
  onDeleteSource,
  onResetSource,
  onPinSource,
  llm,
  onOpenSettings,
}: WorkbenchProps) {
  const [editing, setEditing] = useState(false)
  const skill = skills.find((s) => s.id === selectedSkillId) ?? skills[0]
  if (!skill) {
    return <p className="empty">暂无检索配方</p>
  }

  const skillSources = resolveSources(skill, skillExtras, allSources)
  const skillSourceIds = [...new Set([...skill.sources, ...skillExtras])]

  const removeFromSkill = (sourceId: string) => {
    onSaveSkill({
      ...skill,
      sources: skillSourceIds.filter((id) => id !== sourceId),
    })
  }

  const clearSkill = () => {
    if (!confirm(`清空配方「${skill.title}」的关键词、排除词、提示和全部源？`)) {
      return
    }
    onSaveSkill({
      ...skill,
      description: '',
      keywords: [],
      exclude: [],
      tips: [],
      sources: [],
    })
    setEditing(true)
  }
  const scannedCount = skillSources.filter((s) =>
    scannedSourceIds.includes(s.id),
  ).length

  const openAll = () => {
    skillSources.forEach((source) => {
      window.open(buildSearchUrl(source, skill), '_blank', 'noopener,noreferrer')
    })
  }

  return (
    <section className="panel workbench">
      <header className="panel-header">
        <div>
          <h2>检索工作台</h2>
          <p className="muted">
            选配方 → 打开外部搜索 → 把感兴趣的岗位存入本地收件箱
          </p>
        </div>
      </header>

      <div className="skill-picker">
        <label htmlFor="skill-select">检索配方</label>
        <select
          id="skill-select"
          value={skill.id}
          onChange={(e) => {
            setEditing(false)
            onSelectSkill(e.target.value)
          }}
        >
          {skills.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setEditing(true)}
          >
            编辑配方
          </button>
          <button type="button" className="btn btn-ghost danger" onClick={clearSkill}>
            清空配方
          </button>
          {isSkillEdited && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                if (confirm(`将配方「${skill.title}」恢复为内置默认？`)) {
                  setEditing(false)
                  onResetSkill(skill.id)
                }
              }}
            >
              恢复默认
            </button>
          )}
        </div>
      </div>

      {editing && (
        <SkillEditor
          key={skill.id}
          skill={skill}
          onSave={(next) => {
            onSaveSkill({ ...next, sources: skillSourceIds })
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      <div className="skill-detail">
        {skill.description && <p>{skill.description}</p>}
        <div className="chip-row">
          <span className="chip-label">关键词</span>
          {skill.keywords.length === 0 && (
            <span className="muted small">未设置</span>
          )}
          {skill.keywords.map((k) => (
            <span key={k} className="chip">
              {k}
            </span>
          ))}
        </div>
        {skill.exclude.length > 0 && (
          <div className="chip-row">
            <span className="chip-label">排除</span>
            {skill.exclude.map((k) => (
              <span key={k} className="chip chip-exclude">
                {k}
              </span>
            ))}
          </div>
        )}
        <p className="mono query-preview">查询预览：{queryPreview(skill)}</p>
        {skill.tips.length > 0 && (
          <ul className="tips">
            {skill.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="scan-bar">
        <span>
          本次扫描进度：{scannedCount}/{skillSources.length}
        </span>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={openAll}
            disabled={skillSources.length === 0}
          >
            打开全部源
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClearScan}>
            清除扫描记录
          </button>
        </div>
      </div>

      {skillSources.length === 0 && (
        <p className="empty">
          配方中还没有源。展开下方“管理检索源 → 内置源目录”，点“加入当前配方”添加。
        </p>
      )}

      {groupSourcesByCountry(skillSources).map((group) => (
        <div key={group.key} className="source-group">
          <h3 className="source-group-title">
            {group.label} · {group.sources.length}
          </h3>
          <ul className="source-list">
            {group.sources.map((source) => {
              const scanned = scannedSourceIds.includes(source.id)
              const searchUrl = buildSearchUrl(source, skill)
              const isBuiltin = builtinSources.some((b) => b.id === source.id)
              const isLocal = customSources.some((c) => c.id === source.id)
              return (
                <li key={source.id} className={scanned ? 'scanned' : ''}>
                  <div className="source-main">
                    <div className="source-title-row">
                      <h3>{source.name}</h3>
                      <span className="badge">{SOURCE_TYPE_LABELS[source.type]}</span>
                      {isBuiltin && isLocal && (
                        <span className="badge">已修改</span>
                      )}
                      <span className="badge badge-soft">
                        {source.countries.join(' · ')}
                      </span>
                    </div>
                    <p className="muted small">{source.howToSearch}</p>
                    <p className="small">{source.csNotes}</p>
                  </div>
                  <div className="source-actions">
                    <a
                      className="btn btn-primary"
                      href={searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (!scanned) onToggleScanned(source.id)
                      }}
                    >
                      打开搜索
                    </a>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() =>
                        onSaveToInbox({ sourceId: source.id, url: '' })
                      }
                    >
                      存入收件箱
                    </button>
                    <label className="check-inline">
                      <input
                        type="checkbox"
                        checked={scanned}
                        onChange={() => onToggleScanned(source.id)}
                      />
                      已扫过
                    </label>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => removeFromSkill(source.id)}
                    >
                      移出配方
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      <SourceManager
        customSources={customSources}
        currentSkillId={skill.id}
        skillExtras={skillSourceIds}
        onSave={onSaveSource}
        onDelete={onDeleteSource}
        onReset={onResetSource}
        onPin={onPinSource}
        onUnpin={removeFromSkill}
        llm={llm}
        onOpenSettings={onOpenSettings}
      />
    </section>
  )
}
