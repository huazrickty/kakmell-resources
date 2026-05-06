import { useLanguage } from '@/context/LanguageContext'

export default function Checklist() {
  const { t } = useLanguage()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('checklist.title')}</h1>
    </div>
  )
}
