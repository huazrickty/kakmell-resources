import { Globe } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export default function LanguageSwitcher({ className }: Props) {
  const { lang, setLang } = useLanguage()

  return (
    <div className={cn('inline-flex items-center border border-line rounded-lg overflow-hidden', className)}>
      <Globe size={12} strokeWidth={1.8} className="ml-2 text-ink-soft shrink-0" />
      <button
        type="button"
        onClick={() => setLang('en')}
        className={cn(
          'px-2.5 py-1 text-xs font-semibold transition-colors',
          lang === 'en'
            ? 'bg-ink text-white'
            : 'text-ink-soft hover:text-ink hover:bg-ink/5'
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('ms')}
        className={cn(
          'px-2.5 py-1 text-xs font-semibold transition-colors',
          lang === 'ms'
            ? 'bg-ink text-white'
            : 'text-ink-soft hover:text-ink hover:bg-ink/5'
        )}
      >
        BM
      </button>
    </div>
  )
}
