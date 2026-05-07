import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { toast } from 'sonner'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useHalls } from '@/hooks/useHalls'
import { useMenuOptions } from '@/hooks/useMenuOptions'
import { cn } from '@/lib/utils'
import { logActivity } from '@/lib/activity-logger'

// ── Sub-components ──────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
      {children}
    </label>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  min,
}: {
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  min?: number
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      min={min}
      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white"
    />
  )
}

function MenuPill({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2.5 rounded-lg border text-sm font-medium transition-all text-left',
        selected
          ? 'border-red-600 bg-red-50 text-red-700'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
      )}
    >
      {label}
    </button>
  )
}

function StepIndicator({ step }: { step: 1 | 2 }) {
  const { t } = useLanguage()
  return (
    <div className="flex items-center mb-8">
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold text-white">
          1
        </div>
        <span className={cn('text-sm font-medium', step === 1 ? 'text-gray-900' : 'text-gray-400')}>
          {t('events.stepDetails')}
        </span>
      </div>
      <div className={cn('flex-1 h-px mx-4 transition-colors', step === 2 ? 'bg-red-600' : 'bg-gray-200')} />
      <div className="flex items-center gap-2 shrink-0">
        <div
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
            step === 2 ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-500'
          )}
        >
          2
        </div>
        <span className={cn('text-sm font-medium', step === 2 ? 'text-gray-900' : 'text-gray-400')}>
          {t('events.menuSelection')}
        </span>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────

export default function NewEvent() {
  const navigate = useNavigate()
  const { user, userDoc } = useAuth()
  const { t } = useLanguage()
  const { halls, loading: hallsLoading } = useHalls(!!user)
  const { options, loading: menuLoading } = useMenuOptions(!!user)

  const [step, setStep] = useState<1 | 2>(1)
  const [submitting, setSubmitting] = useState(false)

  const [step1, setStep1] = useState({
    nama_majlis: '',
    hall_name: '',
    tarikh: '',
    sesi: 'siang' as 'siang' | 'malam',
    pax: '' as number | '',
    remarks: '',
  })

  const [step2, setStep2] = useState({
    nasi: '',
    ayam: 'Ayam Masak Merah',
    daging: '',
    acar: '',
    bubur: '',
    air_panas: 'Teh O',
  })

  function handleNext() {
    if (!step1.nama_majlis.trim()) {
      toast.error(t('events.validation.name'))
      return
    }
    if (!step1.hall_name) {
      toast.error(t('events.validation.hall'))
      return
    }
    if (!step1.tarikh) {
      toast.error(t('events.validation.date'))
      return
    }
    if (!step1.pax || Number(step1.pax) < 1) {
      toast.error(t('events.validation.pax'))
      return
    }
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const docRef = await addDoc(collection(db, 'events'), {
        nama_majlis: step1.nama_majlis.trim(),
        hall_name: step1.hall_name,
        tarikh: Timestamp.fromDate(new Date(step1.tarikh)),
        sesi: step1.sesi,
        pax: Number(step1.pax),
        status: 'upcoming',
        menu_selection: step2,
        remarks: step1.remarks.trim(),
        created_by: user!.uid,
        created_at: serverTimestamp(),
      })
      logActivity({
        action: 'event_created',
        category: 'event',
        description: `Acara baharu dicipta: ${step1.nama_majlis.trim()}`,
        entity_id: docRef.id,
        entity_name: step1.nama_majlis.trim(),
        performed_by: user!.uid,
        performed_by_name: userDoc?.full_name ?? user!.email ?? '',
      })
      toast.success(t('events.toast.created'))
      navigate('/events')
    } catch {
      toast.error(t('common.error'))
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('events.new')}</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <StepIndicator step={step} />

        {/* ── Step 1: Event Details ── */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Nama Majlis */}
            <div>
              <FieldLabel>{t('events.eventName')}</FieldLabel>
              <TextInput
                value={step1.nama_majlis}
                onChange={(v) => setStep1((s) => ({ ...s, nama_majlis: v }))}
                placeholder={t('events.namePlaceholder')}
                required
              />
            </div>

            {/* Dewan */}
            <div>
              <FieldLabel>{t('events.hall')}</FieldLabel>
              <select
                value={step1.hall_name}
                onChange={(e) => setStep1((s) => ({ ...s, hall_name: e.target.value }))}
                disabled={hallsLoading}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white"
              >
                <option value="">
                  {hallsLoading ? t('common.loading') : t('events.selectHall')}
                </option>
                {halls.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Tarikh + Sesi */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>{t('events.date')}</FieldLabel>
                <TextInput
                  type="date"
                  value={step1.tarikh}
                  onChange={(v) => setStep1((s) => ({ ...s, tarikh: v }))}
                  required
                />
              </div>
              <div>
                <FieldLabel>{t('events.session')}</FieldLabel>
                <div className="flex gap-2">
                  {(['siang', 'malam'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStep1((prev) => ({ ...prev, sesi: s }))}
                      className={cn(
                        'flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors',
                        step1.sesi === s
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {s === 'siang' ? t('events.sessionMorning') : t('events.sessionEvening')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pax */}
            <div>
              <FieldLabel>{t('events.pax')}</FieldLabel>
              <TextInput
                type="number"
                value={step1.pax}
                onChange={(v) => setStep1((s) => ({ ...s, pax: v === '' ? '' : Number(v) }))}
                placeholder={t('events.paxPlaceholder')}
                min={1}
                required
              />
            </div>

            {/* Catatan */}
            <div>
              <FieldLabel>{t('common.remarks')}</FieldLabel>
              <textarea
                value={step1.remarks}
                onChange={(e) => setStep1((s) => ({ ...s, remarks: e.target.value }))}
                rows={3}
                placeholder={t('events.remarksPlaceholder')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white resize-none"
              />
            </div>

            {/* Navigation */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleNext}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                {t('events.next')} →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Menu Selection ── */}
        {step === 2 && (
          <div className="space-y-6">
            {menuLoading ? (
              <div className="text-sm text-gray-400 text-center py-8">{t('common.loading')}</div>
            ) : (
              <>
                {/* Nasi */}
                <div>
                  <FieldLabel>Nasi</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {options.nasi.map((opt) => (
                      <MenuPill
                        key={opt}
                        label={opt}
                        selected={step2.nasi === opt}
                        onClick={() => setStep2((s) => ({ ...s, nasi: opt }))}
                      />
                    ))}
                  </div>
                </div>

                {/* Ayam */}
                <div>
                  <FieldLabel>Ayam</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {options.ayam.map((opt) => (
                      <MenuPill
                        key={opt}
                        label={opt}
                        selected={step2.ayam === opt}
                        onClick={() => setStep2((s) => ({ ...s, ayam: opt }))}
                      />
                    ))}
                  </div>
                </div>

                {/* Daging */}
                <div>
                  <FieldLabel>Daging</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {options.daging.map((opt) => (
                      <MenuPill
                        key={opt}
                        label={opt}
                        selected={step2.daging === opt}
                        onClick={() => setStep2((s) => ({ ...s, daging: opt }))}
                      />
                    ))}
                  </div>
                </div>

                {/* Acar */}
                <div>
                  <FieldLabel>Acar</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {options.acar.map((opt) => (
                      <MenuPill
                        key={opt}
                        label={opt}
                        selected={step2.acar === opt}
                        onClick={() => setStep2((s) => ({ ...s, acar: opt }))}
                      />
                    ))}
                  </div>
                </div>

                {/* Bubur */}
                <div>
                  <FieldLabel>Bubur</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {options.bubur.map((opt) => (
                      <MenuPill
                        key={opt}
                        label={opt}
                        selected={step2.bubur === opt}
                        onClick={() => setStep2((s) => ({ ...s, bubur: opt }))}
                      />
                    ))}
                  </div>
                </div>

                {/* Air Panas */}
                <div>
                  <FieldLabel>{t('events.airPanas')}</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {(options.air.length > 0 ? options.air : ['Teh O', 'Kopi O']).map((opt) => (
                      <MenuPill
                        key={opt}
                        label={opt}
                        selected={step2.air_panas === opt}
                        onClick={() => setStep2((s) => ({ ...s, air_panas: opt }))}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep(1)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2.5 transition-colors"
              >
                ← {t('common.back')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                {submitting ? t('common.loading') : t('events.new')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
