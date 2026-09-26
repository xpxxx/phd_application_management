import { useCallback, useEffect, useState } from 'react'
import type { AppSettings, LocalState, Opportunity, Skill, Source } from '../types'
import {
  attachSourceToSkill,
  clearSkillSourceExtras,
  detachSourceFromSkill,
  exportLocalState,
  loadLocalState,
  parseImportJson,
  removeCustomSkill,
  removeCustomSource,
  removeOpportunity,
  removeSourceOverride,
  saveCustomSkill,
  saveLocalState,
  setScanSession,
  toggleScannedSource,
  updateSettings,
  upsertCustomSource,
  upsertOpportunity,
} from '../lib/storage'

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
    const blob = new Blob([exportLocalState(state)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `phd-inbox-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [state])

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
  }
}
