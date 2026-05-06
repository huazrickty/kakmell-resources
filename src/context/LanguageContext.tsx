import { createContext, useContext, useState } from 'react'
import { type Lang, type StringKey, t as translate } from '@/lib/i18n'

interface LanguageContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  toggleLang: () => void
  t: (key: StringKey) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem('kakmell_lang')
    return stored === 'ms' ? 'ms' : 'en'
  })

  function setLang(newLang: Lang) {
    setLangState(newLang)
    localStorage.setItem('kakmell_lang', newLang)
  }

  function toggleLang() {
    setLang(lang === 'en' ? 'ms' : 'en')
  }

  function t(key: StringKey): string {
    return translate(lang, key)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}
