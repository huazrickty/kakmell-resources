import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CalendarDays } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useEvents } from '@/hooks/useEvents'
import { Button, Segmented, EmptyState, Card } from '@/components/ui-kit'
import EventSummaryCard from '@/components/EventSummaryCard'

type Filter = 'upcoming' | 'completed' | 'all'

function SkeletonCard() {
  return <div className="h-[76px] bg-ink/5 rounded-xl animate-pulse" />
}

export default function Events() {
  const { t } = useLanguage()
  const { userDoc } = useAuth()
  const navigate = useNavigate()
  const isAdmin = userDoc?.role === 'admin'
  const { events, loading } = useEvents()
  const [filter, setFilter] = useState<Filter>('upcoming')

  const visible = events.filter((e) => {
    if (filter === 'upcoming')  return e.status === 'upcoming'
    if (filter === 'completed') return e.status === 'completed'
    return true
  })

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold tracking-tight text-ink">{t('events.title')}</h1>
        {isAdmin && (
          <Button size="sm" onClick={() => navigate('/events/new')}>
            <Plus size={15} />
            {t('events.new')}
          </Button>
        )}
      </div>

      <Segmented
        className="mb-5"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'upcoming',  label: t('events.statusUpcoming') },
          { value: 'completed', label: t('events.statusCompleted') },
          { value: 'all',       label: t('events.filterAll') },
        ]}
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : visible.length === 0 ? (
        <Card flush>
          <EmptyState icon={CalendarDays} message={t('events.noEvents')} />
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((e) => (
            <EventSummaryCard
              key={e.id}
              event={e}
              onClick={() => navigate(`/events/${e.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
