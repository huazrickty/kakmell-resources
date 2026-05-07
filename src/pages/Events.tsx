import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useEvents } from '@/hooks/useEvents'
import EventSummaryCard from '@/components/EventSummaryCard'

function SkeletonCard() {
  return <div className="h-[76px] bg-gray-100 rounded-xl animate-pulse" />
}

export default function Events() {
  const { t } = useLanguage()
  const { userDoc } = useAuth()
  const navigate = useNavigate()
  const isAdmin = userDoc?.role === 'admin'
  const { events, loading } = useEvents()

  const upcoming = events.filter((e) => e.status === 'upcoming')
  const past = events.filter((e) => e.status !== 'upcoming')

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('events.title')}</h1>
        {isAdmin && (
          <button
            onClick={() => navigate('/events/new')}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + {t('events.new')}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">{t('events.noEvents')}</div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="mb-8">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                {t('dashboard.upcomingEvents')} · {upcoming.length}
              </p>
              <div className="space-y-3">
                {upcoming.map((e) => (
                  <EventSummaryCard
                    key={e.id}
                    event={e}
                    onClick={() => navigate(`/events/${e.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                Lepas · {past.length}
              </p>
              <div className="space-y-3">
                {past.map((e) => (
                  <EventSummaryCard
                    key={e.id}
                    event={e}
                    onClick={() => navigate(`/events/${e.id}`)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
