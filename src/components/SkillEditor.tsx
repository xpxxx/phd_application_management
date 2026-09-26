import { useState, type FormEvent } from 'react'
import type { Skill } from '../types'

interface SkillEditorProps {
  skill: Skill
  onSave: (skill: Skill) => void
  onCancel: () => void
}

const splitList = (text: string) =>
  text
    .split(/[,，\n]/)
    .map((t) => t.trim())
    .filter(Boolean)

export function SkillEditor({ skill, onSave, onCancel }: SkillEditorProps) {
  const [title, setTitle] = useState(skill.title)
  const [description, setDescription] = useState(skill.description)
  const [keywords, setKeywords] = useState(skill.keywords.join(', '))
  const [exclude, setExclude] = useState(skill.exclude.join(', '))
  const [tips, setTips] = useState(skill.tips.join('\n'))
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('配方名称不能为空')
      return
    }
    onSave({
      ...skill,
      title: title.trim(),
      description: description.trim(),
      keywords: splitList(keywords),
      exclude: splitList(exclude),
      tips: tips
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean),
    })
  }

  return (
    <form className="opp-form" onSubmit={submit}>
      <h3>编辑配方</h3>
      {error && <p className="error">{error}</p>}
      <div className="form-grid">
        <label>
          名称 *
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          说明
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="full">
          关键词（逗号分隔，会拼进搜索链接）
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="PhD, software testing, LLM"
          />
        </label>
        <label className="full">
          排除词（逗号分隔，仅作提醒）
          <input
            value={exclude}
            onChange={(e) => setExclude(e.target.value)}
            placeholder="postdoc, internship"
          />
        </label>
        <label className="full">
          提示（每行一条）
          <textarea
            rows={3}
            value={tips}
            onChange={(e) => setTips(e.target.value)}
          />
        </label>
      </div>
      <p className="muted small">
        源在下方列表中增删：目录里点“加入当前配方”，源卡片上点“移出配方”。
      </p>
      <div className="btn-row">
        <button type="submit" className="btn btn-primary">
          保存
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          取消
        </button>
      </div>
    </form>
  )
}
