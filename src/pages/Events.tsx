import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'

export default function Events() {
  const { t } = useLanguage()
  const { userDoc } = useAuth()
  const navigate = useNavigate()
  const isAdmin = userDoc?.role === 'admin'

  return (
    <div className="p-6 max-w-4xl mx-auto">
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
    </div>
  )
}
