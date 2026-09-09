import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { ArrowLeft, ShieldOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { type StringKey } from '@/lib/i18n'
import MenuSettings from '@/pages/settings/MenuSettings'
import HallsSettings from '@/pages/settings/HallsSettings'
import IngredientsSettings from '@/pages/settings/IngredientsSettings'
import TasksSettings from '@/pages/settings/TasksSettings'
import UsersSettings from '@/pages/settings/UsersSettings'
import DeveloperSettings from '@/pages/settings/DeveloperSettings'

// Thin admin-gated wrapper hosting the existing settings sections under /more/*.
// The sections themselves get their visual migration in Phase 4.
const SECTIONS: Record<string, { labelKey: StringKey; component: React.ComponentType }> = {
  'menu':      { labelKey: 'settings.menu',        component: MenuSettings },
  'halls':     { labelKey: 'settings.halls',       component: HallsSettings },
  'ingredients': { labelKey: 'settings.ingredients', component: IngredientsSettings },
  'task-list': { labelKey: 'more.taskList',        component: TasksSettings },
  'users':     { labelKey: 'settings.users',       component: UsersSettings },
  'dev':       { labelKey: 'settings.devSettings', component: DeveloperSettings },
}

export default function MoreSection() {
  const { section } = useParams<{ section: string }>()
  const navigate = useNavigate()
  const { userDoc } = useAuth()
  const { t } = useLanguage()

  const entry = section ? SECTIONS[section] : undefined
  if (!entry) return <Navigate to="/more" replace />

  if (userDoc?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center px-6">
        <ShieldOff size={36} className="text-ink-soft/40" />
        <p className="text-sm font-semibold text-ink-soft">{t('settings.adminOnly')}</p>
      </div>
    )
  }

  const Section = entry.component

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate('/more')}
          className="flex h-12 w-12 -ml-2 items-center justify-center rounded-lg text-ink-soft hover:text-ink hover:bg-ink/5 transition-colors"
          aria-label={t('common.back')}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-ink">{t(entry.labelKey)}</h1>
      </div>
      <Section />
    </div>
  )
}
