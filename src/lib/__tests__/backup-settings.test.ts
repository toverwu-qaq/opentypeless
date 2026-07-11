import { describe, expect, it } from 'vitest'
import type { AppConfig } from '../../stores/appStore'
import { createBackupSettings } from '../backup-settings'

describe('createBackupSettings', () => {
  it('uses an explicit allow list and keeps only sync-safe family scene assignments', () => {
    const malicious = {
      stt_provider: 'glm-asr',
      stt_api_key: 'stt-secret',
      stt_custom_api_key: 'custom-secret',
      stt_language: 'multi',
      llm_provider: 'openrouter',
      llm_api_key: 'llm-secret',
      llm_model: 'test-model',
      llm_base_url: 'https://example.com/v1',
      context_adaptation_enabled: true,
      custom_scenes: [],
      active_scene: null,
      family_scene_assignments: [
        { family: 'email', scene_id: 'builtin_professional_email' },
      ],
      custom_app_mappings: [{ matcher: { exactWebHost: 'private.example.com' } }],
      customAppMappings: [{ nativeBundleId: 'com.private.writer' }],
      matcher: { executable: 'private.exe' },
      windowTitle: 'Private document title',
      browserHost: 'private.example.com',
    } as unknown as AppConfig

    const settings = createBackupSettings(malicious)
    const serialized = JSON.stringify(settings)

    expect(settings.family_scene_assignments).toEqual([
      { family: 'email', scene_id: 'builtin_professional_email' },
    ])
    expect(settings.context_adaptation_enabled).toBe(true)
    for (const forbidden of [
      'stt-secret',
      'custom-secret',
      'llm-secret',
      'custom_app_mappings',
      'customAppMappings',
      'matcher',
      'exactWebHost',
      'nativeBundleId',
      'executable',
      'windowTitle',
      'browserHost',
      'private.example.com',
      'com.private.writer',
      'private.exe',
    ]) {
      expect(serialized).not.toContain(forbidden)
    }
  })
})
