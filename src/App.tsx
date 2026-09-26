import { useMemo, useRef, useState } from 'react'
import { sources as builtinSources } from './data/sources'
import { skills as builtinSkills } from './data/skills'
import { Inbox } from './components/Inbox'
import { SettingsPanel } from './components/SettingsPanel'
import { Workbench } from './components/Workbench'
import { useLocalState } from './hooks/useLocalState'
import type { Opportunity } from './types'
import './App.css'

type Tab = 'workbench' | 'inbox' | 'settings'

export default function App() {
  const {
    state,
    saveOpportunity,
    deleteOpportunity,
    markSourceScanned,
    clearScanSession,
    saveSkill,
    resetSkill,
    saveSource,
    deleteSource,
    resetSource,
    pinSourceToSkill,
    saveSettings,
    downloadExport,
    importFromFile,
  } = useLocalState()

  const [tab, setTab] = useState<Tab>('workbench')
  const inboxLeaveGuard = useRef<((action: () => void) => void) | null>(null)

  const goTab = (next: Tab) => {
    if (next === tab) return
    const guard = tab === 'inbox' ? inboxLeaveGuard.current : null
    if (guard) guard(() => setTab(next))
    else setTab(next)
  }
  const [selectedSkillId, setSelectedSkillId] = useState(
    builtinSkills[0]?.id ?? '',
  )
  const [draftPrefill, setDraftPrefill] = useState<Partial<Opportunity> | null>(
    null,
  )

  const allSkills = useMemo(() => {
    const builtinIds = new Set(builtinSkills.map((s) => s.id))
    return [
      ...builtinSkills.map(
        (b) => state.customSkills.find((c) => c.id === b.id) ?? b,
      ),
      ...state.customSkills.filter((c) => !builtinIds.has(c.id)),
    ]
  }, [state.customSkills])

  const allSources = useMemo(() => {
    const builtinIds = new Set(builtinSources.map((s) => s.id))
    return [
      ...builtinSources.map(
        (b) => state.customSources.find((c) => c.id === b.id) ?? b,
      ),
      ...state.customSources.filter((c) => !builtinIds.has(c.id)),
    ]
  }, [state.customSources])

  const skillId = selectedSkillId || allSkills[0]?.id || ''
  const skillExtras = state.skillSourceExtras[skillId] ?? []

  const scannedForSkill =
    state.scanSession?.skillId === skillId
      ? state.scanSession.scannedSourceIds
      : []

  return (
    <div className="app">
      <div className="bg-grid" aria-hidden />
      <header className="topbar">
        <div className="brand">
          <p className="brand-name">PhD Scout</p>
          <p className="brand-sub">欧洲 CS 岗位制博士 · 发现工作台</p>
        </div>
        <nav className="tabs" aria-label="主导航">
          <button
            type="button"
            className={tab === 'workbench' ? 'tab active' : 'tab'}
            onClick={() => goTab('workbench')}
          >
            检索工作台
          </button>
          <button
            type="button"
            className={tab === 'inbox' ? 'tab active' : 'tab'}
            onClick={() => goTab('inbox')}
          >
            收件箱
            {state.opportunities.length > 0 && (
              <span className="tab-count">{state.opportunities.length}</span>
            )}
          </button>
          <button
            type="button"
            className={tab === 'settings' ? 'tab active' : 'tab'}
            onClick={() => goTab('settings')}
          >
            设置
          </button>
        </nav>
      </header>

      <main>
        {tab === 'workbench' && (
          <Workbench
            skills={allSkills}
            selectedSkillId={skillId}
            onSelectSkill={setSelectedSkillId}
            scannedSourceIds={scannedForSkill}
            onToggleScanned={(sourceId) =>
              markSourceScanned(skillId, sourceId)
            }
            onClearScan={clearScanSession}
            onSaveSkill={saveSkill}
            onResetSkill={resetSkill}
            isSkillEdited={state.customSkills.some(
              (c) =>
                c.id === skillId && builtinSkills.some((b) => b.id === c.id),
            )}
            onSaveToInbox={(prefill) => {
              setDraftPrefill(prefill)
              setTab('inbox')
            }}
            allSources={allSources}
            customSources={state.customSources}
            skillExtras={skillExtras}
            onSaveSource={saveSource}
            onDeleteSource={deleteSource}
            onResetSource={resetSource}
            onPinSource={(sourceId) => pinSourceToSkill(skillId, sourceId)}
            llm={state.settings.llm}
            onOpenSettings={() => setTab('settings')}
          />
        )}
        {tab === 'inbox' && (
          <Inbox
            opportunities={state.opportunities}
            allSources={allSources}
            settings={state.settings}
            onSave={saveOpportunity}
            onDelete={deleteOpportunity}
            draftPrefill={draftPrefill}
            onClearPrefill={() => setDraftPrefill(null)}
            onExport={downloadExport}
            onImport={importFromFile}
            onOpenSettings={() => goTab('settings')}
            leaveGuardRef={inboxLeaveGuard}
          />
        )}
        {tab === 'settings' && (
          <SettingsPanel settings={state.settings} onSave={saveSettings} />
        )}
      </main>

      <footer className="footer">
        <p>
          源目录与检索配方可共享；个人收件箱、自定义源、API Key
          仅存于本机 localStorage。
        </p>
      </footer>
    </div>
  )
}
