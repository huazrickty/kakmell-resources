import { useLanguage } from '@/context/LanguageContext'

export default function Events() {
  const { t } = useLanguage()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('events.title')}</h1>
    </div>
  )
}
