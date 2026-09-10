import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UtensilsCrossed, Building2, Package, ListChecks, Users, ClipboardList,
  Wrench, Search, LogOut, User, FileText,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import GlobalSearch from '@/components/GlobalSearch'
import { Card, SectionHeader, ListRow, Badge } from '@/components/ui-kit'
import { version } from '../../package.json'

export default function More() {
  const navigate = useNavigate()
  const { userDoc, signOut } = useAuth()
  const { t } = useLanguage()
  const isAdmin = userDoc?.role === 'admin'
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6 pb-8">
      <h1 className="text-xl font-bold tracking-tight text-ink">{t('nav.more')}</h1>

      {/* Mobile: global search entry (Ctrl+K equivalent) */}
      <div className="md:hidden">
        <Card flush>
          <ListRow
            leading={<Search size={18} />}
            label={t('common.search')}
            onClick={() => setSearchOpen(true)}
          />
        </Card>
      </div>

      {/* ── Operations data — admin ──────────────────────────────────────── */}
      {isAdmin && (
        <section>
          <SectionHeader>{t('more.operations')}</SectionHeader>
          <Card flush>
            <div className="divide-y divide-line">
              <ListRow
                leading={<UtensilsCrossed size={18} />}
                label={t('settings.menu')}
                onClick={() => navigate('/more/menu')}
              />
              <ListRow
                leading={<Building2 size={18} />}
                label={t('settings.halls')}
                onClick={() => navigate('/more/halls')}
              />
              <ListRow
                leading={<Package size={18} />}
                label={t('settings.ingredients')}
                onClick={() => navigate('/more/ingredients')}
              />
              <ListRow
                leading={<ListChecks size={18} />}
                label={t('more.taskList')}
                onClick={() => navigate('/more/task-list')}
              />
              <ListRow
                leading={<FileText size={18} />}
                label={t('more.quotations')}
                onClick={() => navigate('/quotations')}
              />
            </div>
          </Card>
        </section>
      )}

      {/* ── System — admin ───────────────────────────────────────────────── */}
      {isAdmin && (
        <section>
          <SectionHeader>{t('more.system')}</SectionHeader>
          <Card flush>
            <div className="divide-y divide-line">
              <ListRow
                leading={<Users size={18} />}
                label={t('settings.users')}
                onClick={() => navigate('/more/users')}
              />
              <ListRow
                leading={<ClipboardList size={18} />}
                label={t('settings.activityLog')}
                onClick={() => navigate('/settings/activity-log')}
              />
              <ListRow
                leading={<Wrench size={18} />}
                label={t('settings.devSettings')}
                onClick={() => navigate('/more/dev')}
              />
            </div>
          </Card>
        </section>
      )}

      {/* ── General — all roles ──────────────────────────────────────────── */}
      <section>
        <SectionHeader>{t('more.general')}</SectionHeader>
        <Card flush>
          <div className="divide-y divide-line">
            <ListRow
              leading={<User size={18} />}
              label={userDoc?.full_name ?? ''}
              value={<Badge status="neutral">{userDoc?.role ?? ''}</Badge>}
              chevron={false}
            />
            <ListRow
              label={t('more.language')}
              value={<LanguageSwitcher />}
              chevron={false}
            />
            <ListRow
              leading={<LogOut size={18} />}
              label={t('settings.signOut')}
              onClick={signOut}
              chevron={false}
            />
          </div>
        </Card>
      </section>

      <p className="text-center text-xs text-ink-soft">
        KAKMELL RESOURCES · {t('more.version')} {version}
      </p>

      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} isAdmin={isAdmin} />
    </div>
  )
}
