import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { ChevronDown, Check } from 'lucide-react'
import { toast } from 'sonner'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useHalls } from '@/hooks/useHalls'
import { useMenuOptions } from '@/hooks/useMenuOptions'
import { useMenuTypeItems } from '@/hooks/useMenuTypeItems'
import { MENU_TYPES, MENU_TYPE_LABEL_KEYS, type MenuType } from '@/lib/menu-types'
import { calculateIngredients } from '@/lib/ingredient-calculator'
import { Button, Card, Input, Textarea, Select, SectionHeader, Pill, Segmented } from '@/components/ui-kit'
import { cn } from '@/lib/utils'
import { logActivity } from '@/lib/activity-logger'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wide mb-1.5">
      {children}
    </label>
  )
}

// Minimal step indicator: "1 — 2" ink dots + bar
function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <span className={cn(
        'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold tabular-nums',
        'bg-ink text-white',
      )}>
        1
      </span>
      <span className={cn('h-0.5 w-8 rounded-full', step === 2 ? 'bg-ink' : 'bg-line')} />
      <span className={cn(
        'h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold tabular-nums',
        step === 2 ? 'bg-ink text-white' : 'bg-ink/10 text-ink-soft',
      )}>
        2
      </span>
    </div>
  )
}

export default function NewEvent() {
  const navigate = useNavigate()
  const { user, userDoc } = useAuth()
  const { t } = useLanguage()
  const { halls, loading: hallsLoading } = useHalls(!!user)
  const { options, loading: menuLoading } = useMenuOptions(!!user)

  const [step, setStep] = useState<1 | 2>(1)
  const [submitting, setSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

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
    hot_drinks: ['Teh O'] as string[],
    cold_drinks: [] as string[],
  })

  function toggleDrink(kind: 'hot_drinks' | 'cold_drinks', drink: string) {
    setStep2((s) => ({
      ...s,
      [kind]: s[kind].includes(drink)
        ? s[kind].filter((d) => d !== drink)
        : [...s[kind], drink],
    }))
  }

  const [menuType, setMenuType] = useState<MenuType>('kahwin')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [menuTambahan, setMenuTambahan] = useState('')
  const { items: typeItems, loading: typeItemsLoading } = useMenuTypeItems(menuType, !!user)

  // Non-kahwin default: full package pre-selected, admin unticks exceptions
  function changeMenuType(mt: MenuType) {
    setMenuType(mt)
    setSelectedItems([])
  }

  useEffect(() => {
    if (menuType !== 'kahwin') setSelectedItems(typeItems)
  }, [typeItems, menuType])

  function toggleItem(item: string) {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    )
  }

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
      const EMPTY_MENU = { nasi: '', ayam: '', daging: '', acar: '', bubur: '', hot_drinks: [], cold_drinks: [] }
      const docRef = await addDoc(collection(db, 'events'), {
        nama_majlis: step1.nama_majlis.trim(),
        hall_name: step1.hall_name,
        tarikh: Timestamp.fromDate(new Date(step1.tarikh)),
        sesi: step1.sesi,
        pax: Number(step1.pax),
        status: 'upcoming',
        menu_type: menuType,
        // Kahwin keeps its structured selection; non-kahwin stores a flat item
        // list (menu_selection stays present-but-empty so existing consumers
        // of that field never see undefined)
        menu_selection: menuType === 'kahwin' ? step2 : EMPTY_MENU,
        ...(menuType !== 'kahwin' && { selected_items: selectedItems }),
        ...(menuTambahan.trim() && { menu_tambahan: menuTambahan.trim() }),
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

  // Live ingredient preview (kahwin) — display only, same calculator as detail
  const previewIngr = menuType === 'kahwin' && step1.pax
    ? calculateIngredients(Number(step1.pax), step2.acar)
    : null

  const KAHWIN_CATEGORIES = [
    { key: 'nasi' as const,   label: 'Nasi' },
    { key: 'ayam' as const,   label: 'Ayam' },
    { key: 'daging' as const, label: 'Daging' },
    { key: 'acar' as const,   label: 'Acar' },
    { key: 'bubur' as const,  label: 'Bubur' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-28 md:pb-6">
      <h1 className="text-xl font-bold tracking-tight text-ink mb-4">{t('events.new')}</h1>

      <StepIndicator step={step} />

      {/* ── Step 1: Event details ─────────────────────────────────────── */}
      {step === 1 && (
        <Card className="space-y-5">
          <div>
            <FieldLabel>{t('events.eventName')}</FieldLabel>
            <Input
              value={step1.nama_majlis}
              onChange={(e) => setStep1((s) => ({ ...s, nama_majlis: e.target.value }))}
              placeholder={t('events.namePlaceholder')}
            />
          </div>

          <div>
            <FieldLabel>{t('events.hall')}</FieldLabel>
            <Select
              value={step1.hall_name}
              onChange={(e) => setStep1((s) => ({ ...s, hall_name: e.target.value }))}
              disabled={hallsLoading}
            >
              <option value="">
                {hallsLoading ? t('common.loading') : t('events.selectHall')}
              </option>
              {halls.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>{t('events.date')}</FieldLabel>
              <Input
                type="date"
                value={step1.tarikh}
                onChange={(e) => setStep1((s) => ({ ...s, tarikh: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>{t('events.session')}</FieldLabel>
              <Segmented
                value={step1.sesi}
                onChange={(sesi) => setStep1((s) => ({ ...s, sesi }))}
                options={[
                  { value: 'siang', label: t('events.sessionMorning') },
                  { value: 'malam', label: t('events.sessionEvening') },
                ]}
              />
            </div>
          </div>

          <div>
            <FieldLabel>{t('events.pax')}</FieldLabel>
            <Input
              type="number"
              min={1}
              value={step1.pax}
              onChange={(e) => setStep1((s) => ({ ...s, pax: e.target.value === '' ? '' : Number(e.target.value) }))}
              placeholder={t('events.paxPlaceholder')}
            />
          </div>

          <div>
            <FieldLabel>{t('common.remarks')}</FieldLabel>
            <Textarea
              value={step1.remarks}
              onChange={(e) => setStep1((s) => ({ ...s, remarks: e.target.value }))}
              rows={3}
              placeholder={t('events.remarksPlaceholder')}
            />
          </div>
        </Card>
      )}

      {/* ── Step 2: Menu selection ────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Menu type */}
          <div>
            <FieldLabel>{t('events.menuType')}</FieldLabel>
            <Segmented
              value={menuType}
              onChange={changeMenuType}
              options={MENU_TYPES.map((mt) => ({ value: mt, label: t(MENU_TYPE_LABEL_KEYS[mt]) }))}
            />
          </div>

          {/* Non-kahwin: tick list */}
          {menuType !== 'kahwin' && (
            typeItemsLoading ? (
              <div className="text-sm text-ink-soft text-center py-8">{t('common.loading')}</div>
            ) : typeItems.length === 0 ? (
              <div className="text-sm text-ink-soft text-center py-8">{t('events.noItemsForType')}</div>
            ) : (
              <div>
                <SectionHeader>{t('events.selectItems')}</SectionHeader>
                <Card flush>
                  <div className="divide-y divide-line">
                    {typeItems.map((item) => {
                      const checked = selectedItems.includes(item)
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleItem(item)}
                          className="flex w-full items-center gap-3 px-4 py-3 min-h-12 text-left hover:bg-ink/[0.02] transition-colors"
                        >
                          <span className={cn(
                            'flex h-5 w-5 items-center justify-center rounded border-2 shrink-0 transition-colors',
                            checked ? 'bg-ink border-ink' : 'border-line',
                          )}>
                            {checked && <Check size={13} strokeWidth={3} className="text-white" />}
                          </span>
                          <span className="text-sm font-medium text-ink">{item}</span>
                        </button>
                      )
                    })}
                  </div>
                </Card>
              </div>
            )
          )}

          {/* Kahwin: category sections + drinks + preview */}
          {menuType === 'kahwin' && (menuLoading ? (
            <div className="text-sm text-ink-soft text-center py-8">{t('common.loading')}</div>
          ) : (
            <>
              {KAHWIN_CATEGORIES.map(({ key, label }) => (
                options[key].length > 0 && (
                  <div key={key}>
                    <SectionHeader>{label}</SectionHeader>
                    <div className="flex flex-wrap gap-2">
                      {options[key].map((opt) => (
                        <Pill
                          key={opt}
                          selected={step2[key] === opt}
                          onClick={() => setStep2((s) => ({ ...s, [key]: opt }))}
                        >
                          {opt}
                        </Pill>
                      ))}
                    </div>
                  </div>
                )
              ))}

              <div>
                <SectionHeader>{t('events.hotDrinks')}</SectionHeader>
                <div className="flex flex-wrap gap-2">
                  {(options.air_panas.length > 0 ? options.air_panas : ['Teh O', 'Kopi O', 'Air Sirap']).map((opt) => (
                    <Pill
                      key={opt}
                      selected={step2.hot_drinks.includes(opt)}
                      onClick={() => toggleDrink('hot_drinks', opt)}
                    >
                      {opt}
                    </Pill>
                  ))}
                </div>
              </div>

              <div>
                <SectionHeader>{t('events.coldDrinks')}</SectionHeader>
                <div className="flex flex-wrap gap-2">
                  {(options.air_sejuk.length > 0 ? options.air_sejuk : ['Air Anggur/Kordial', 'Air Sirap']).map((opt) => (
                    <Pill
                      key={opt}
                      selected={step2.cold_drinks.includes(opt)}
                      onClick={() => toggleDrink('cold_drinks', opt)}
                    >
                      {opt}
                    </Pill>
                  ))}
                </div>
              </div>

              {/* Ingredient preview — collapsed by default */}
              <Card flush>
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 min-h-12 text-sm font-semibold text-ink"
                >
                  <span>{t('events.previewIngredients')}</span>
                  <ChevronDown
                    size={16}
                    className={cn('text-ink-soft transition-transform duration-200', showPreview && 'rotate-180')}
                  />
                </button>
                {showPreview && (
                  <div className="border-t border-line px-4 py-3">
                    {!previewIngr ? (
                      <p className="text-sm text-ink-soft py-2">{t('events.customPax')}</p>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs text-ink-soft mb-2">
                          {t('ingredients.bracket')}: <span className="font-semibold text-ink tabular-nums">{previewIngr.bracket} pax</span>
                        </p>
                        {([
                          ['Beras',  `${previewIngr.main.beras_bag} bag`],
                          ['Ayam',   `${previewIngr.main.ayam_ekor} ekor`],
                          ['Daging', `${previewIngr.main.daging_kg} kg`],
                          ['Oren',   `${previewIngr.main.oren_biji} biji`],
                          ['Gula',   `${previewIngr.main.gula_liter} L`],
                          ['Kacang Dall', previewIngr.dalca.kacang_dall],
                          ['Terung',      previewIngr.dalca.terung],
                          ['Kentang',     previewIngr.dalca.kentang],
                          ['Karot',       previewIngr.dalca.karot],
                          ['Nenas',  `${previewIngr.acar.nenas_biji} biji`],
                        ] as [string, string][]).map(([k, v]) => (
                          <div key={k} className="flex items-baseline justify-between py-1 border-b border-line last:border-0">
                            <span className="text-sm text-ink-soft">{k}</span>
                            <span className="text-sm font-bold text-ink tabular-nums">{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </>
          ))}

          {/* Menu Tambahan */}
          <div>
            <FieldLabel>{t('events.menuTambahan')}</FieldLabel>
            <Textarea
              value={menuTambahan}
              onChange={(e) => setMenuTambahan(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder={t('events.menuTambahanPlaceholder')}
            />
            <p className="text-xs text-ink-soft text-right mt-1 tabular-nums">
              {menuTambahan.length}/300
            </p>
          </div>
        </div>
      )}

      {/* ── Sticky action bar — thumb-reachable, above the bottom nav ──── */}
      <div className="fixed md:sticky left-0 right-0 md:left-auto md:right-auto bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0 bg-bg/95 backdrop-blur border-t border-line px-4 py-3 md:mt-6 md:-mx-6 md:px-6 z-40">
        <div className="max-w-2xl mx-auto flex gap-3">
          {step === 2 ? (
            <>
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              >
                ← {t('common.back')}
              </Button>
              <Button className="flex-1" disabled={submitting} onClick={handleSubmit}>
                {submitting ? t('common.loading') : t('events.new')}
              </Button>
            </>
          ) : (
            <Button className="w-full" onClick={handleNext}>
              {t('events.next')} →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
