import { useTranslation } from 'react-i18next'

import type { ContextFamily, HistoryEntry } from '../../stores/appStore'
import { AppLogo } from '../AppLogo'

interface Props {
  iconKey: string
  family: ContextFamily
  label: string
  time: string
  providerKind: HistoryEntry['provider_kind']
}

export function AppContextMeta({ iconKey, family, label, time, providerKind }: Props) {
  const { t } = useTranslation()

  return (
    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-text-tertiary">
      <AppLogo iconKey={iconKey} family={family} />
      <span className="min-w-0 truncate">{label}</span>
      <span aria-hidden="true" className="shrink-0">
        ·
      </span>
      <span className="shrink-0">{time}</span>
      <span aria-hidden="true" className="shrink-0 max-[419px]:hidden">
        ·
      </span>
      <span className="shrink-0 max-[419px]:hidden">
        {t(`history.providers.${providerKind}`)}
      </span>
    </div>
  )
}
