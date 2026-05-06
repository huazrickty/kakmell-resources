import { useLanguage } from '@/context/LanguageContext'

export default function Dashboard() {
  const { t } = useLanguage()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('dashboard.title')}</h1>
    </div>
  )
}
