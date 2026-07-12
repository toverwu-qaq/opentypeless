# OpenTypeless Desktop Settings Simplification Design

Date: 2026-07-12
Status: Approved for implementation
Approval: User reviewed the running macOS bundle and instructed implementation on 2026-07-12
Scope: Existing desktop Settings and signed-in password dialog only

## 1. Goal

Make the existing P0/P1 desktop capabilities feel quiet, obvious, and native to the current OpenTypeless UI. Preserve every shipped behavior while reducing default copy, duplicated status UI, disabled controls, and power-user management chrome.

## 2. Product Principles

- Default screens explain the next decision, not the implementation.
- Advanced controls appear only when the user has advanced state to manage.
- One system condition has one primary call to action.
- App adaptation remains a restrained feature signal, not an app gallery.
- Existing routes, tokens, spacing, typography, 10px-or-smaller radii, local logos, and compact dialogs remain authoritative.
- No password, account, cloud, quota, detector, prompt, intent, dictionary, shortcut persistence, or backup contract changes.

## 3. General Settings

### 3.1 Shortcut Rows

- A role with one binding shows only its label, the shortcut recorder, and the add action.
- Do not show `Primary`, move arrows, or a disabled remove action for a single binding.
- With multiple bindings, label only the first binding `Primary`.
- Replace the three always-visible move/remove controls with one More menu per manageable binding.
- A secondary binding menu offers `Make primary` when applicable and `Remove` when allowed.
- Adding a shortcut immediately starts capture. Never insert a passive `—` row that requires a second click.
- The adding row has a visible Cancel icon/button. Escape remains a valid standalone shortcut and is not treated as cancel while recording.
- Global conflict and registration behavior remains unchanged.

### 3.2 Accessibility Permission

- The existing top application permission banner remains the only primary Grant Permission surface.
- Remove the duplicated macOS Accessibility section and second Grant Permission button from General.
- Keep platform and registration errors only when they add information beyond the top permission banner.

## 4. AI Polish

- Remove the always-visible `Context and thought-aware support is best effort` / certified status line from the main settings flow.
- Do not request model-capability status solely for this removed presentation.
- Remove helper paragraphs for `AI cleanup for dictation` and `Always translate output`.
- Keep one concise context-adaptation explanation because the behavior is not obvious.
- Keep the selected-text explanation because it communicates operation/token scope.
- The representative app-logo row is active only when both AI Polish and Context Adaptation are enabled.
- Disabled logo state remains visible but dimmed; its accessible label communicates that adaptation is off.

## 5. Translation

- Translation remains part of AI Polish because it serves Always Translate, the Translate shortcut, and capsule target switching.
- Rename the visible concept from `Target Language` to the shorter localized equivalent of `Translate to`.
- Place the compact target control directly beneath the Always Translate toggle.
- With one target, show one selector and an Add action. Do not show a radio, arrows, remove action, or a separate heavy section.
- With multiple targets, show the active target selector plus a `Manage languages` disclosure.
- Only the expanded management state shows per-target selectors, ordering, and removal.
- Preserve the one-to-five unique target contract and the active-target compatibility mirror.

## 6. Scenes And App Context

- Reuse the existing `family_scene_assignments` and exact detected-app mappings. Do not add a second mapping store.
- Scenes becomes the primary place to understand which contexts use a scene.
- Each built-in or custom scene row shows a compact usage summary when assigned.
- Expanded scene details expose an `Assign app types` action for the nine semantic app families.
- The assignment dialog uses existing localized family names and persists through `setFamilySceneAssignment`.
- Existing exact app mappings remain manageable and appear as local app logos/counts in the Scenes assignment surface.
- Creating a new exact matcher still requires a recent local detection candidate; this work does not expose matcher values or create a 71-app settings gallery.
- AI Polish retains the last-context shortcut for creating an exact app override.

## 7. Dictionary

- Add a compact segmented control for `Words` and `Corrections`.
- Show only the active editor and list.
- Search, import, export, editing, transactional import, and correction behavior remain shared and unchanged.
- Switching segments clears no input or data.

## 8. Password Dialog

- Preserve the approved compact 380px modal and current validation/mutation behavior.
- Trap forward and backward keyboard focus inside the dialog.
- Disabled controls are skipped while the focus cycle remains inside active fields/actions.
- Escape, backdrop close, busy-state prevention, first-field focus, and trigger-focus restoration remain unchanged.

## 9. Accessibility And Layout

- No invisible focusable management controls.
- Every icon-only action has an accessible name and tooltip.
- Menus close on Escape and restore focus to their trigger.
- Dialogs remain within the 720x480 minimum viewport.
- Settings panes must not introduce horizontal overflow at 720x480 or 900x700.
- Existing reduced-motion and token behavior remains unchanged.

## 10. Verification

- New behavior is developed test-first with focused Vitest suites.
- Existing 36-file / 320-test frontend suite remains green.
- Existing 434 Rust tests remain green.
- `npm run lint`, `npm run build`, and the debug macOS app bundle must pass.
- Packaged-app QA covers General, AI Polish enabled/disabled states, Translation single/multiple states, Dictionary segments, Scenes assignments, and password focus cycling.
- No real password is submitted and no macOS permission is changed during QA.

## 11. Definition Of Done

- General no longer shows repeated Primary labels or disabled arrow/trash controls in the default single-binding state.
- The duplicate General accessibility CTA is removed.
- AI Polish default copy is materially shorter.
- Context logos accurately reflect the context-adaptation toggle.
- Translation is compact for the common one-language case.
- Scene rows expose existing family/app usage without a persistent app gallery.
- Dictionary shows one maintenance mode at a time.
- Password focus cannot escape behind the modal.
- Focused, full frontend, Rust, lint, build, and packaged visual gates pass.
