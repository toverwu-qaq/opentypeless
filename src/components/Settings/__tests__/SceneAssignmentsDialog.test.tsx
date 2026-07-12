import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FamilySceneAssignment } from '../../../stores/appStore'
import type { CustomAppMappingView } from '../../../lib/tauri'
import * as tauri from '../../../lib/tauri'
import { SceneAssignmentsDialog } from '../SceneAssignmentsDialog'

vi.mock('../../../lib/tauri')

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'scenes.assignAppTypes': 'Assign app types',
        'scenes.assignedExactApps': 'Exact app overrides',
        'scenes.noExactApps': 'No exact app overrides',
        'scenes.assignmentSaveFailed': 'Could not save app assignments',
        'common.cancel': 'Cancel',
        'common.save': 'Save',
        'common.saving': 'Saving...',
        'contextFamilies.email': 'Email',
        'contextFamilies.work_chat': 'Work chat',
        'contextFamilies.personal_chat': 'Personal chat',
        'contextFamilies.document': 'Document',
        'contextFamilies.project_management': 'Project management',
        'contextFamilies.developer_collaboration': 'Developer collaboration',
        'contextFamilies.prompt_or_code': 'Prompt or code',
        'contextFamilies.support': 'Support',
        'contextFamilies.social': 'Social',
      })[key] || key,
  }),
}))

const assignments: FamilySceneAssignment[] = [
  { family: 'email', scene_id: 'builtin_professional_email' },
  { family: 'document', scene_id: 'builtin_clean_dictation' },
]

const appMappings: CustomAppMappingView[] = [
  {
    id: 'mapping-slack',
    label: 'Work Slack',
    matcherType: 'native_bundle_id',
    displayValue: 'com.tinyspeck.slackmacgap',
    family: 'work_chat',
    sceneId: 'builtin_professional_email',
    enabled: true,
    iconKey: 'slack',
  },
  {
    id: 'mapping-gmail',
    label: 'Gmail',
    matcherType: 'exact_web_host',
    displayValue: 'mail.google.com',
    family: 'email',
    sceneId: 'builtin_clean_dictation',
    enabled: true,
    iconKey: 'gmail',
  },
]

describe('SceneAssignmentsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(tauri.setFamilySceneAssignment).mockResolvedValue(assignments)
  })

  afterEach(cleanup)

  it('preselects assigned families and shows only safe exact-app summaries', () => {
    const { container } = render(
      <SceneAssignmentsDialog
        sceneId="builtin_professional_email"
        sceneName="Professional Email"
        assignments={assignments}
        appMappings={appMappings}
        onCancel={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Assign app types' })).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(9)
    expect(screen.getByRole('checkbox', { name: 'Email' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Document' })).not.toBeChecked()
    expect(screen.getByText('Work Slack')).toBeInTheDocument()
    expect(screen.queryByText('Gmail')).toBeNull()
    expect(screen.queryByText('com.tinyspeck.slackmacgap')).toBeNull()
    expect(container.querySelector('img')).not.toBeNull()
  })

  it('saves only changed families and returns the last persisted assignment list', async () => {
    const firstResult: FamilySceneAssignment[] = [
      { family: 'document', scene_id: 'builtin_clean_dictation' },
    ]
    const finalResult: FamilySceneAssignment[] = [
      ...firstResult,
      { family: 'work_chat', scene_id: 'builtin_professional_email' },
    ]
    vi.mocked(tauri.setFamilySceneAssignment)
      .mockResolvedValueOnce(firstResult)
      .mockResolvedValueOnce(finalResult)
    const onSaved = vi.fn()

    render(
      <SceneAssignmentsDialog
        sceneId="builtin_professional_email"
        sceneName="Professional Email"
        assignments={assignments}
        appMappings={appMappings}
        onCancel={vi.fn()}
        onSaved={onSaved}
      />,
    )

    fireEvent.click(screen.getByRole('checkbox', { name: 'Email' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Work chat' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(tauri.setFamilySceneAssignment).toHaveBeenCalledTimes(2)
      expect(tauri.setFamilySceneAssignment).toHaveBeenNthCalledWith(1, 'email', null)
      expect(tauri.setFamilySceneAssignment).toHaveBeenNthCalledWith(
        2,
        'work_chat',
        'builtin_professional_email',
      )
      expect(onSaved).toHaveBeenCalledWith(finalResult)
    })
  })

  it('does not persist unchanged families and closes on Escape', async () => {
    const onCancel = vi.fn()
    const onSaved = vi.fn()
    render(
      <SceneAssignmentsDialog
        sceneId="builtin_professional_email"
        sceneName="Professional Email"
        assignments={assignments}
        appMappings={appMappings}
        onCancel={onCancel}
        onSaved={onSaved}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(assignments)
      expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
    })
    expect(tauri.setFamilySceneAssignment).not.toHaveBeenCalled()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
