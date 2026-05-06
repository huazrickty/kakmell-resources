import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export default function LanguageSwitcher({ className }: Props) {
  const { t, toggleLang } = useLanguage()
  return (
    <button
      onClick={toggleLang}
      type="button"
      className={cn(
        'text-xs font-semibold px-2 py-1 rounded border border-[#1B4332]/30 text-[#1B4332] hover:bg-[#1B4332]/5 transition-colors select-none',
        className
      )}
    >
      {t('lang.toggle')}
    </button>
  )
}
