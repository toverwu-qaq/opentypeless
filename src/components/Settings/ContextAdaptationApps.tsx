import { useTranslation } from 'react-i18next'
import { AppLogo } from '../AppLogo'
import type { ContextFamily } from '../../stores/appStore'

interface RepresentativeApp {
  label: string
  iconKey: string
  family: ContextFamily
}

const REPRESENTATIVE_APPS: readonly RepresentativeApp[] = [
  { label: 'Gmail', iconKey: 'gmail', family: 'email' },
  { label: 'Slack', iconKey: 'slack', family: 'work_chat' },
  { label: 'Lark', iconKey: 'lark', family: 'work_chat' },
  { label: 'WeChat', iconKey: 'wechat', family: 'personal_chat' },
  { label: 'Google Docs', iconKey: 'google-docs', family: 'document' },
  { label: 'Notion', iconKey: 'notion', family: 'document' },
  { label: 'GitHub', iconKey: 'github', family: 'developer_collaboration' },
  { label: 'Cursor', iconKey: 'cursor', family: 'prompt_or_code' },
]

export function ContextAdaptationApps({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation()

  return (
    <div
      role="group"
      aria-label={t('settings.contextAdaptationApps')}
      className={`mt-2 ml-[52px] flex min-w-0 items-center gap-1.5 transition-opacity ${disabled ? 'opacity-40' : 'opacity-100'}`}
    >
      {REPRESENTATIVE_APPS.map((app) => (
        <span
          key={app.iconKey}
          role="img"
          aria-label={app.label}
          title={app.label}
          className="grid h-5 w-5 shrink-0 place-items-center rounded-[4px]"
        >
          <AppLogo iconKey={app.iconKey} family={app.family} />
        </span>
      ))}
      <span className="ml-0.5 text-[11px] text-text-tertiary">+63</span>
    </div>
  )
}
