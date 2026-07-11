import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  AppConfig,
  ContextFamily,
  ContextProfileSummary,
} from '../../stores/appStore'
import {
  saveCustomAppMapping,
  setFamilySceneAssignment,
  updateCustomAppMapping,
} from '../../lib/tauri'
import type { CustomAppMappingView, MappingCandidateView } from '../../lib/tauri'
import { BUILTIN_SCENES } from '../../lib/scenes/builtinScenes'
import { AppLogo } from '../AppLogo'

const CONTEXT_FAMILIES: ContextFamily[] = [
  'email',
  'work_chat',
  'personal_chat',
  'document',
  'project_management',
  'developer_collaboration',
  'prompt_or_code',
  'support',
  'social',
  'general',
]

type MappingConfig = Pick<AppConfig, 'custom_scenes' | 'family_scene_assignments'>
type Scope = 'app' | 'family'

interface AppStyleMappingDialogProps {
  candidate: MappingCandidateView | null
  mapping?: CustomAppMappingView | null
  context: ContextProfileSummary
  config: MappingConfig
  onCancel: () => void
  onSaved: () => void | Promise<void>
}

function clampLabel(value: string) {
  return Array.from(value).slice(0, 40).join('')
}

export function AppStyleMappingDialog({
  candidate,
  mapping = null,
  context,
  config,
  onCancel,
  onSaved,
}: AppStyleMappingDialogProps) {
  const { t } = useTranslation()
  const editing = Boolean(mapping)
  const [scope, setScope] = useState<Scope>(candidate || mapping ? 'app' : 'family')
  const [label, setLabel] = useState(mapping?.label ?? candidate?.suggestedLabel ?? context.appLabel)
  const [family, setFamily] = useState<ContextFamily>(
    mapping?.family ?? candidate?.currentFamily ?? context.family,
  )
  const existingFamilyScene = config.family_scene_assignments.find(
    (assignment) => assignment.family === (mapping?.family ?? candidate?.currentFamily ?? context.family),
  )?.scene_id
  const [sceneId, setSceneId] = useState(mapping?.sceneId ?? existingFamilyScene ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const labelRef = useRef<HTMLInputElement>(null)

  const displayValue = mapping?.displayValue ?? candidate?.displayValue ?? context.appLabel
  const iconKey = mapping?.iconKey ?? candidate?.iconKey ?? context.iconKey
  const matcherType = mapping?.matcherType ?? candidate?.matcherType
  const canSave =
    !saving &&
    (scope === 'family' ? Boolean(sceneId) : Boolean(label.trim()) && Boolean(mapping || candidate))

  const sceneOptions = useMemo(
    () => [
      ...BUILTIN_SCENES.map((scene) => ({
        id: scene.id,
        label: t(scene.nameKey),
      })),
      ...config.custom_scenes.map((scene) => ({ id: scene.id, label: scene.name })),
    ],
    [config.custom_scenes, t],
  )

  useEffect(() => {
    labelRef.current?.focus()
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

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      if (scope === 'family') {
        await setFamilySceneAssignment(family, sceneId)
      } else if (mapping) {
        await updateCustomAppMapping({
          id: mapping.id,
          label: label.trim(),
          family,
          sceneId: sceneId || null,
          enabled: mapping.enabled,
        })
      } else if (candidate) {
        await saveCustomAppMapping({
          candidateGeneration: candidate.generation,
          label: label.trim(),
          family,
          sceneId: sceneId || null,
        })
      }
      await onSaved()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError))
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
        aria-label={t(editing ? 'settings.editAppMappingTitle' : 'settings.appStyleDialogTitle')}
        className="relative z-10 w-full max-w-[420px] rounded-[10px] border border-border bg-bg-primary shadow-float"
      >
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-[14px] font-medium text-text-primary">
            {t(editing ? 'settings.editAppMappingTitle' : 'settings.appStyleDialogTitle')}
          </h3>
        </div>

        <div className="space-y-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <AppLogo iconKey={iconKey} family={family} />
            <div className="min-w-0">
              {matcherType && (
                <p className="text-[11px] text-text-tertiary">
                  {t(
                    matcherType === 'exact_web_host'
                      ? 'settings.mappingMatcherWeb'
                      : 'settings.mappingMatcherNative',
                  )}
                </p>
              )}
              <p className="truncate text-[12px] text-text-secondary">{displayValue}</p>
            </div>
          </div>

          {!editing && (
            <div>
              <p className="mb-1 text-[11px] text-text-secondary">{t('settings.mappingScope')}</p>
              <div className="grid grid-cols-2 rounded-[8px] border border-border bg-bg-secondary p-0.5">
                <button
                  type="button"
                  aria-pressed={scope === 'app'}
                  disabled={!candidate}
                  onClick={() => setScope('app')}
                  className={`min-h-8 rounded-[6px] px-2 text-[11px] transition-colors disabled:opacity-40 ${
                    scope === 'app'
                      ? 'bg-bg-primary text-text-primary shadow-sm'
                      : 'bg-transparent text-text-tertiary'
                  }`}
                >
                  {t('settings.mappingScopeApp')}
                </button>
                <button
                  type="button"
                  aria-pressed={scope === 'family'}
                  onClick={() => setScope('family')}
                  className={`min-h-8 rounded-[6px] px-2 text-[11px] transition-colors ${
                    scope === 'family'
                      ? 'bg-bg-primary text-text-primary shadow-sm'
                      : 'bg-transparent text-text-tertiary'
                  }`}
                >
                  {t('settings.mappingScopeFamily')}
                </button>
              </div>
            </div>
          )}

          {scope === 'app' && (
            <label className="block text-[11px] text-text-secondary">
              {t('settings.mappingLabel')}
              <input
                ref={labelRef}
                value={label}
                onChange={(event) => setLabel(clampLabel(event.target.value))}
                className="mt-1 w-full rounded-[8px] border border-border bg-bg-secondary px-3 py-2 text-[13px] text-text-primary outline-none focus:border-border-focus"
              />
            </label>
          )}

          <label className="block text-[11px] text-text-secondary">
            {t('settings.mappingFamily')}
            <select
              value={family}
              onChange={(event) => setFamily(event.target.value as ContextFamily)}
              className="mt-1 w-full rounded-[8px] border border-border bg-bg-secondary px-3 py-2 text-[13px] text-text-primary outline-none focus:border-border-focus"
            >
              {CONTEXT_FAMILIES.map((value) => (
                <option key={value} value={value}>
                  {t(`contextFamilies.${value}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-[11px] text-text-secondary">
            {t('settings.mappingScene')}
            <select
              value={sceneId}
              onChange={(event) => setSceneId(event.target.value)}
              className="mt-1 w-full rounded-[8px] border border-border bg-bg-secondary px-3 py-2 text-[13px] text-text-primary outline-none focus:border-border-focus"
            >
              <option value="">
                {scope === 'family'
                  ? t('settings.mappingFamilyRequiresScene')
                  : t('settings.mappingNoScene')}
              </option>
              {sceneOptions.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.label}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="text-[11px] text-error">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-[8px] border border-border bg-transparent px-3 py-1.5 text-[12px] text-text-secondary hover:text-text-primary disabled:opacity-50"
          >
            {t('settings.mappingCancel')}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={!canSave}
            className="rounded-[8px] border-none bg-accent px-3 py-1.5 text-[12px] text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {t('settings.mappingSave')}
          </button>
        </div>
      </div>
    </div>
  )
}
