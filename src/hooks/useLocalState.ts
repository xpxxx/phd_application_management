import { useCallback, useEffect, useState } from 'react'
import type { AppSettings, LocalState, Opportunity, Skill, Source } from '../types'
import {
  attachSourceToSkill,
  clearSkillSourceExtras,
  detachSourceFromSkill,
  exportLocalState,
  exportSourceCatalog,
  loadLocalState,
  mergeImportedSources,
  parseImportJson,
  removeCustomSkill,
  removeCustomSource,
  removeOpportunity,
  removeSourceOverride,
  saveCustomSkill,
  type SourceImportSummary,
  saveLocalState,
  setScanSession,
  toggleScannedSource,
  updateSettings,
  upsertCustomSource,
  upsertOpportunity,
} from '../lib/storage'

function downloadJson(json: string, fileName: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

const today = () => new Date().toISOString().slice(0, 10)

export function useLocalState() {
  const [state, setState] = useState<LocalState>(() => loadLocalState())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setState(loadLocalState())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveLocalState(state)
  }, [state, hydrated])

  const saveOpportunity = useCallback((opp: Opportunity) => {
    setState((prev) => upsertOpportunity(prev, opp))
  }, [])

  const deleteOpportunity = useCallback((id: string) => {
    setState((prev) => removeOpportunity(prev, id))
  }, [])

  const markSourceScanned = useCallback((skillId: string, sourceId: string) => {
    setState((prev) => toggleScannedSource(prev, skillId, sourceId))
  }, [])

  const clearScanSession = useCallback(() => {
    setState((prev) => setScanSession(prev, null))
  }, [])

  const addCustomSkill = useCallback((skill: Skill) => {
    setState((prev) => saveCustomSkill(prev, skill))
  }, [])

  /** skill.sources must already include any pinned extras; extras are reset. */
  const saveSkill = useCallback((skill: Skill) => {
    setState((prev) =>
      clearSkillSourceExtras(saveCustomSkill(prev, skill), skill.id),
    )
  }, [])

  const resetSkill = useCallback((skillId: string) => {
    setState((prev) =>
      clearSkillSourceExtras(removeCustomSkill(prev, skillId), skillId),
    )
  }, [])

  const saveSource = useCallback((source: Source, attachSkillId?: string) => {
    setState((prev) => {
      let next = upsertCustomSource(prev, source)
      if (attachSkillId) {
        next = attachSourceToSkill(next, attachSkillId, source.id)
      }
      return next
    })
  }, [])

  const deleteSource = useCallback((id: string) => {
    setState((prev) => removeCustomSource(prev, id))
  }, [])

  const resetSource = useCallback((id: string) => {
    setState((prev) => removeSourceOverride(prev, id))
  }, [])

  const pinSourceToSkill = useCallback((skillId: string, sourceId: string) => {
    setState((prev) => attachSourceToSkill(prev, skillId, sourceId))
  }, [])

  const unpinSourceFromSkill = useCallback(
    (skillId: string, sourceId: string) => {
      setState((prev) => detachSourceFromSkill(prev, skillId, sourceId))
    },
    [],
  )

  const saveSettings = useCallback((settings: AppSettings) => {
    setState((prev) => updateSettings(prev, settings))
  }, [])

  const replaceState = useCallback((next: LocalState) => {
    setState(next)
  }, [])

  const downloadExport = useCallback(() => {
    downloadJson(exportLocalState(state), `phd-inbox-export-${today()}.json`)
  }, [state])

  const downloadSourcesExport = useCallback(() => {
    downloadJson(exportSourceCatalog(state), `phd-sources-${today()}.json`)
  }, [state])

  const importSourcesFromFile = useCallback(
    async (file: File): Promise<SourceImportSummary> => {
      const text = await file.text()
      const { state: next, summary } = mergeImportedSources(state, text)
      setState(next)
      return summary
    },
    [state],
  )

  const importFromFile = useCallback(async (file: File) => {
    const text = await file.text()
    const next = parseImportJson(text)
    setState((prev) => ({
      ...next,
      settings: {
        ...next.settings,
        llm: {
          ...next.settings.llm,
          // Preserve current API key if export had it stripped
          apiKey: next.settings.llm.apiKey || prev.settings.llm.apiKey,
        },
      },
    }))
  }, [])

  return {
    state,
    saveOpportunity,
    deleteOpportunity,
    markSourceScanned,
    clearScanSession,
    addCustomSkill,
    saveSkill,
    resetSkill,
    saveSource,
    deleteSource,
    resetSource,
    pinSourceToSkill,
    unpinSourceFromSkill,
    saveSettings,
    replaceState,
    downloadExport,
    importFromFile,
    downloadSourcesExport,
    importSourcesFromFile,
  }
}
