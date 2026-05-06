import { useLanguage } from '@/context/LanguageContext'

export default function Ingredients() {
  const { t } = useLanguage()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t('ingredients.title')}</h1>
    </div>
  )
}
