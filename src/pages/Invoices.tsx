import { useLanguage } from '@/context/LanguageContext'

export default function Invoices() {
  const { t } = useLanguage()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('invoice.title')}</h1>
    </div>
  )
}
