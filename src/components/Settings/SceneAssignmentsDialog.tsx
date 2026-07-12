import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ContextFamily, FamilySceneAssignment } from '../../stores/appStore'
import { setFamilySceneAssignment, type CustomAppMappingView } from '../../lib/tauri'
import { AppLogo } from '../AppLogo'

const ASSIGNABLE_FAMILIES: ContextFamily[] = [
  'email',
  'work_chat',
  'personal_chat',
  'document',
  'project_management',
  'developer_collaboration',
  'prompt_or_code',
  'support',
  'social',
]

interface SceneAssignmentsDialogProps {
  sceneId: string
  sceneName: string
  assignments: FamilySceneAssignment[]
  appMappings: CustomAppMappingView[]
  onCancel: () => void
  onSaved: (assignments: FamilySceneAssignment[]) => void | Promise<void>
}

export function SceneAssignmentsDialog({
  sceneId,
  sceneName,
  assignments,
  appMappings,
  onCancel,
  onSaved,
}: SceneAssignmentsDialogProps) {
  const { t } = useTranslation()
  const initialFamilies = useMemo(
    () =>
      new Set(
        assignments
          .filter((assignment) => assignment.scene_id === sceneId)
          .map((assignment) => assignment.family),
      ),
    [assignments, sceneId],
  )
  const [selectedFamilies, setSelectedFamilies] = useState(initialFamilies)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firstCheckboxRef = useRef<HTMLInputElement>(null)
  const exactMappings = appMappings.filter(
    (mapping) => mapping.enabled && mapping.sceneId === sceneId,
  )

  useEffect(() => {
    firstCheckboxRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || saving) return
      event.preventDefault()
      onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, saving])

  const toggleFamily = (family: ContextFamily) => {
    setSelectedFamilies((current) => {
      const next = new Set(current)
      if (next.has(family)) next.delete(family)
      else next.add(family)
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    let latestAssignments = assignments
    try {
      for (const family of ASSIGNABLE_FAMILIES) {
        const wasAssigned = initialFamilies.has(family)
        const shouldAssign = selectedFamilies.has(family)
        if (wasAssigned === shouldAssign) continue
        latestAssignments = await setFamilySceneAssignment(family, shouldAssign ? sceneId : null)
      }
      await onSaved(latestAssignments)
    } catch {
      setError(t('scenes.assignmentSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 px-5">
      <div className="fixed inset-0" onClick={saving ? undefined : onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('scenes.assignAppTypes')}
        className="relative z-10 flex max-h-[72vh] w-full max-w-[420px] flex-col rounded-[10px] border border-border bg-bg-primary shadow-float"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-[14px] font-medium text-text-primary">
              {t('scenes.assignAppTypes')}
            </h3>
            <p className="truncate text-[11px] text-text-tertiary">{sceneName}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            aria-label={t('common.cancel')}
            className="grid h-7 w-7 flex-none place-items-center rounded-[6px] border-none bg-transparent text-text-tertiary hover:bg-bg-hover hover:text-text-primary disabled:opacity-40"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 space-y-4 overflow-y-auto px-4 py-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {ASSIGNABLE_FAMILIES.map((family, index) => (
              <label
                key={family}
                className="flex min-w-0 items-center gap-2 text-[12px] text-text-secondary"
              >
                <input
                  ref={index === 0 ? firstCheckboxRef : undefined}
                  type="checkbox"
                  checked={selectedFamilies.has(family)}
                  disabled={saving}
                  onChange={() => toggleFamily(family)}
                  className="h-4 w-4 flex-none accent-accent"
                />
                <span className="min-w-0 truncate">{t(`contextFamilies.${family}`)}</span>
              </label>
            ))}
          </div>

          <div className="border-t border-border pt-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-text-secondary">
                {t('scenes.assignedExactApps')}
              </p>
              <span className="text-[11px] tabular-nums text-text-tertiary">
                {exactMappings.length}
              </span>
            </div>
            {exactMappings.length === 0 ? (
              <p className="text-[11px] text-text-tertiary">{t('scenes.noExactApps')}</p>
            ) : (
              <div className="max-h-[120px] divide-y divide-border overflow-y-auto">
                {exactMappings.map((mapping) => (
                  <div key={mapping.id} className="flex min-w-0 items-center gap-2 py-2">
                    <AppLogo iconKey={mapping.iconKey} family={mapping.family} />
                    <span className="truncate text-[12px] text-text-primary">{mapping.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-[11px] text-error">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-[8px] border border-border bg-transparent px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-[8px] border-none bg-accent px-3 py-1.5 text-[12px] text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {t(saving ? 'common.saving' : 'common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
