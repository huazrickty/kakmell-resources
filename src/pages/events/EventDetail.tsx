import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  ArrowLeft, Sun, Moon, MapPin, Users, Calendar,
  Printer, Pencil, Trash2, CheckCircle, XCircle, RotateCcw,
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useEvent } from '@/hooks/useEvent'
import { useHalls } from '@/hooks/useHalls'
import { useMenuOptions } from '@/hooks/useMenuOptions'
import { calculateIngredients, type IngredientResult } from '@/lib/ingredient-calculator'
import { cn } from '@/lib/utils'
import type { MenuSelection, EventDoc } from '@/hooks/useEvents'

// ── Sub-components ──────────────────────────────────────────────────────────

function InfoCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3.5">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="text-sm font-semibold text-gray-900">{children}</div>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mt-6 mb-0.5">
      <span className="text-[10px] font-bold text-red-600 uppercase tracking-[0.15em] shrink-0">{title}</span>
      <div className="flex-1 h-px bg-red-100" />
    </div>
  )
}

function IngRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex justify-between items-baseline py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-bold text-gray-900 tabular-nums">{value}</span>
    </div>
  )
}

function MenuChip({ label }: { label: string }) {
  return (
    <span className="inline-flex px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold border border-red-100">
      {label}
    </span>
  )
}

function Pill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-2 rounded-lg border text-sm font-medium transition-all',
        selected
          ? 'border-red-600 bg-red-50 text-red-700'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
      )}
    >
      {label}
    </button>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
      {children}
    </label>
  )
}

// ── Print layout ───────────────────────────────────────────────────────────

const PRINT_PAGE_CSS = `
  @page { size: A4; margin: 12mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .print-no-break { page-break-inside: avoid; }
  }
`

const PS = {
  sectionHeader: {
    fontSize: '7.5pt',
    fontWeight: 800 as const,
    color: '#dc2626',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginTop: '8pt',
    marginBottom: '1.5pt',
    borderBottom: '0.75pt solid #fca5a5',
    paddingBottom: '1.5pt',
  },
  row: {
    display: 'flex' as const,
    alignItems: 'baseline' as const,
    padding: '1.5pt 0',
    fontSize: '9.5pt',
    lineHeight: '1.3',
    borderBottom: '0.5pt dotted #e5e7eb',
  },
}

function PSectionHeader({ children }: { children: React.ReactNode }) {
  return <div style={PS.sectionHeader}>{children}</div>
}

function PRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={PS.row}>
      <span style={{ color: '#374151' }}>{label}</span>
      <span style={{ flex: 1 }} />
      <span style={{ fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}

function PrintView({
  event,
  ingr,
  menu,
}: {
  event: EventDoc
  ingr: IngredientResult | null
  menu: MenuSelection
}) {
  const buburRow = (() => {
    if (!ingr) return null
    const b = menu.bubur
    if (b === 'Bubur Pulut Hitam')
      return { label: 'Pulut Hitam', value: `${ingr.bubur.pulut_hitam.beras_pulut_kg}kg + ${ingr.bubur.pulut_hitam.santan_tin} tin santan` }
    if (b === 'Bubur Kacang Hijau')
      return { label: 'Kacang Hijau', value: `${ingr.bubur.kacang_hijau.kacang_kg}kg + ${ingr.bubur.kacang_hijau.santan_tin} tin santan` }
    if (b === 'Bubur Jagung')
      return { label: 'Bubur Jagung', value: `${ingr.bubur.jagung.beg} beg (${ingr.bubur.jagung.beras_kg}kg) + ${ingr.bubur.jagung.santan_kotak} kota stn` }
    return null
  })()

  return (
    <div className="hidden print:block" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <style>{PRINT_PAGE_CSS}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', borderBottom: '1.5pt solid #dc2626', paddingBottom: '6pt', marginBottom: '8pt' }}>
        <img src="/logo.png" alt="" style={{ height: '30pt', objectFit: 'contain', marginRight: '8pt' }} />
        <div>
          <div style={{ fontSize: '13pt', fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>
            KAKMELL RESOURCES
          </div>
          <div style={{ fontSize: '9.5pt', color: '#374151', marginTop: '1pt', lineHeight: 1.35 }}>
            {event.nama_majlis} — {event.hall_name}
          </div>
          <div style={{ fontSize: '8.5pt', color: '#6b7280', marginTop: '1pt', lineHeight: 1.35 }}>
            {format(event.tarikh.toDate(), 'd MMMM yyyy')} | {event.sesi === 'siang' ? 'Siang' : 'Malam'} | {event.pax} pax{ingr ? ` (Bracket ${ingr.bracket})` : ''}
          </div>
        </div>
      </div>

      {/* Body */}
      {!ingr ? (
        <div style={{ fontSize: '10pt', color: '#6b7280', textAlign: 'center', padding: '20pt 0' }}>
          Pax melebihi 1,000 — kuantiti tersuai. Hubungi pengurusan.
        </div>
      ) : (
        <div className="print-no-break" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16pt' }}>

          {/* Left: Bahan Utama + Kotak Daging */}
          <div>
            <PSectionHeader>Bahan Utama</PSectionHeader>
            <PRow label="Beras" value={`${ingr.main.beras_bag} bag`} />
            <PRow label="Ayam" value={`${ingr.main.ayam_ekor} ekor`} />
            <PRow label="Daging" value={`${ingr.main.daging_kg} kg`} />
            <PRow label="Paceri Nenas" value={`${ingr.main.paceri_nenas_biji} biji`} />
            <PRow label="Oren" value={`${ingr.main.oren_biji} biji`} />
            <PRow label="Gula" value={`${ingr.main.gula_liter} L`} />

            <PSectionHeader>Kotak Daging</PSectionHeader>
            <PRow label="Slice (potong)" value={`${ingr.daging_box.slice_boxes} kotak`} />
            <PRow label="Trim" value={`${ingr.daging_box.trim_boxes} kotak`} />
            <PRow label="Lebihan" value={`${ingr.daging_box.variance_kg} kg`} />
          </div>

          {/* Right: Dalca + Bubur + Acar */}
          <div>
            <PSectionHeader>Dalca</PSectionHeader>
            <PRow label="Kacang Dall" value={ingr.dalca.kacang_dall} />
            <PRow label="Terung" value={ingr.dalca.terung} />
            <PRow label="Kentang" value={ingr.dalca.kentang} />
            <PRow label="Karot" value={ingr.dalca.karot} />
            <PRow label="Kacang Panjang" value={ingr.dalca.kacang_panjang} />
            <PRow label="Serbuk Kari" value={ingr.dalca.serbuk_kari} />

            <PSectionHeader>Bubur</PSectionHeader>
            {buburRow ? (
              <PRow label={buburRow.label} value={buburRow.value} />
            ) : (
              <>
                <PRow label="Pulut Hitam" value={`${ingr.bubur.pulut_hitam.beras_pulut_kg}kg + ${ingr.bubur.pulut_hitam.santan_tin} tin santan`} />
                <PRow label="Kacang Hijau" value={`${ingr.bubur.kacang_hijau.kacang_kg}kg + ${ingr.bubur.kacang_hijau.santan_tin} tin santan`} />
                <PRow label="Jagung" value={`${ingr.bubur.jagung.beg} beg (${ingr.bubur.jagung.beras_kg}kg) + ${ingr.bubur.jagung.santan_kotak} kotak stn`} />
              </>
            )}

            <PSectionHeader>Acar</PSectionHeader>
            <PRow label="Timun" value={ingr.acar.timun_kg !== null ? `${ingr.acar.timun_kg} kg` : null} />
            <PRow label="Nenas" value={ingr.acar.nenas_biji !== null ? `${ingr.acar.nenas_biji} biji` : null} />
            <PRow label="Paceri Nenas" value={`${ingr.acar.paceri_nenas_biji} biji`} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '10pt', borderTop: '0.5pt solid #e5e7eb', paddingTop: '4pt', display: 'flex', justifyContent: 'space-between', fontSize: '7.5pt', color: '#9ca3af' }}>
        <span>Dijana: {format(new Date(), 'd MMM yyyy, HH:mm')}</span>
        <span>KAKMELL RESOURCES</span>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

const EMPTY_MENU: MenuSelection = { nasi: '', ayam: '', daging: '', acar: '', bubur: '', air_panas: '' }

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, userDoc } = useAuth()
  const { t } = useLanguage()
  const isAdmin = userDoc?.role === 'admin'

  const { event, loading } = useEvent(id!)
  const { halls } = useHalls(!!user)
  const { options } = useMenuOptions(!!user)

  const [tab, setTab] = useState<'details' | 'ingredients'>('details')
  const [isEditing, setIsEditing] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [editForm, setEditForm] = useState({
    nama_majlis: '',
    hall_name: '',
    tarikh: '',
    sesi: 'siang' as 'siang' | 'malam',
    pax: 0,
    status: 'upcoming' as 'upcoming' | 'completed' | 'cancelled',
    remarks: '',
    menu: EMPTY_MENU,
  })

  function enterEditMode() {
    if (!event) return
    setEditForm({
      nama_majlis: event.nama_majlis,
      hall_name: event.hall_name,
      tarikh: format(event.tarikh.toDate(), 'yyyy-MM-dd'),
      sesi: event.sesi,
      pax: event.pax,
      status: event.status,
      remarks: event.remarks || '',
      menu: { ...(event.menu_selection ?? EMPTY_MENU) },
    })
    setIsEditing(true)
  }

  async function handleSave() {
    if (!editForm.nama_majlis.trim()) { toast.error('Sila masukkan nama majlis.'); return }
    if (!editForm.hall_name) { toast.error('Sila pilih dewan.'); return }
    if (!editForm.tarikh) { toast.error('Sila pilih tarikh.'); return }
    if (!editForm.pax || editForm.pax < 1) { toast.error('Sila masukkan bilangan pax.'); return }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'events', id!), {
        nama_majlis: editForm.nama_majlis.trim(),
        hall_name: editForm.hall_name,
        tarikh: Timestamp.fromDate(new Date(editForm.tarikh)),
        sesi: editForm.sesi,
        pax: Number(editForm.pax),
        status: editForm.status,
        remarks: editForm.remarks.trim(),
        menu_selection: editForm.menu,
      })
      toast.success('Acara dikemaskini.')
      setIsEditing(false)
    } catch {
      toast.error('Ralat. Cuba lagi.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'events', id!))
      toast.success('Acara dipadam.')
      navigate('/events')
    } catch {
      toast.error('Ralat. Cuba lagi.')
      setDeleting(false)
    }
  }

  async function handleStatusChange(status: 'upcoming' | 'completed' | 'cancelled') {
    try {
      await updateDoc(doc(db, 'events', id!), { status })
      toast.success('Status dikemaskini.')
    } catch {
      toast.error('Ralat. Cuba lagi.')
    }
  }

  // ── Loading / not found ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-red-600" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center py-24">
        <p className="text-gray-400 text-sm">{t('events.eventNotFound')}</p>
        <button
          onClick={() => navigate('/events')}
          className="mt-4 text-red-600 text-sm font-medium hover:underline"
        >
          ← {t('nav.events')}
        </button>
      </div>
    )
  }

  const ingr = calculateIngredients(event.pax)
  const menu = event.menu_selection ?? EMPTY_MENU

  const statusLabel = t(
    `events.status${event.status.charAt(0).toUpperCase() + event.status.slice(1)}` as Parameters<typeof t>[0]
  )

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* ── Screen header ── */}
      <div className="flex items-start gap-3 mb-5 print:hidden">
        <button
          onClick={() => navigate('/events')}
          className="mt-1 text-gray-400 hover:text-gray-700 transition-colors shrink-0"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-gray-900 leading-snug">{event.nama_majlis}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(event.tarikh.toDate(), 'd MMMM yyyy')} · {event.sesi === 'siang' ? 'Siang' : 'Malam'}
          </p>
        </div>
        <span className={cn(
          'shrink-0 mt-1 text-[10px] font-bold px-2.5 py-1 rounded-full border',
          event.status === 'upcoming'  && 'bg-red-50 text-red-700 border-red-200',
          event.status === 'completed' && 'bg-green-50 text-green-700 border-green-200',
          event.status === 'cancelled' && 'bg-gray-100 text-gray-500 border-gray-200',
        )}>
          {statusLabel}
        </span>
      </div>

      {/* ── Print header (only visible when printing) ── */}
      <div className="hidden print:block mb-6 border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">{event.nama_majlis}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {format(event.tarikh.toDate(), 'd MMMM yyyy')} ·{' '}
          {event.sesi === 'siang' ? 'Siang' : 'Malam'} · {event.pax} pax ·{' '}
          {event.hall_name}
        </p>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 print:hidden">
        {(['details', 'ingredients'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => { setTab(tabKey); setIsEditing(false); setDeleteConfirm(false) }}
            className={cn(
              'flex-1 py-2 text-sm font-semibold rounded-lg transition-all',
              tab === tabKey
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {tabKey === 'details' ? t('events.tabDetails') : t('events.tabIngredients')}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════
          Details Tab
      ════════════════════════════════════════ */}
      {tab === 'details' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6">

          {!isEditing ? (
            <>
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2.5 mb-5">
                <InfoCell label={t('events.hall')}>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} strokeWidth={1.8} className="text-gray-400 shrink-0" />
                    {event.hall_name || '—'}
                  </span>
                </InfoCell>
                <InfoCell label={t('events.date')}>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} strokeWidth={1.8} className="text-gray-400 shrink-0" />
                    {format(event.tarikh.toDate(), 'd MMM yyyy')}
                  </span>
                </InfoCell>
                <InfoCell label={t('events.session')}>
                  <span className="flex items-center gap-1.5">
                    {event.sesi === 'siang'
                      ? <Sun size={13} strokeWidth={1.8} className="text-amber-500 shrink-0" />
                      : <Moon size={13} strokeWidth={1.8} className="text-indigo-400 shrink-0" />
                    }
                    {event.sesi === 'siang' ? t('events.sessionMorning') : t('events.sessionEvening')}
                  </span>
                </InfoCell>
                <InfoCell label={t('events.pax')}>
                  <span className="flex items-center gap-1.5">
                    <Users size={13} strokeWidth={1.8} className="text-gray-400 shrink-0" />
                    {event.pax} pax
                  </span>
                </InfoCell>
              </div>

              {/* Menu chips */}
              {(() => {
                const items = [
                  { cat: 'Nasi', val: menu.nasi },
                  { cat: 'Ayam', val: menu.ayam },
                  { cat: 'Daging', val: menu.daging },
                  { cat: 'Acar', val: menu.acar },
                  { cat: 'Bubur', val: menu.bubur },
                  { cat: 'Air Panas', val: menu.air_panas },
                ].filter((item) => item.val)
                return items.length > 0 ? (
                  <div className="mb-5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
                      {t('events.selectedMenu')}
                    </p>
                    <div className="space-y-2">
                      {items.map(({ cat, val }) => (
                        <div key={cat} className="flex items-center gap-2.5">
                          <span className="text-xs text-gray-400 w-20 shrink-0">{cat}</span>
                          <MenuChip label={val} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}

              {/* Remarks */}
              <div className="mb-5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                  {t('common.remarks')}
                </p>
                {event.remarks ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.remarks}</p>
                ) : (
                  <p className="text-sm text-gray-300 italic">{t('events.noRemarks')}</p>
                )}
              </div>

              {/* Admin actions */}
              {isAdmin && (
                <div className="border-t border-gray-100 pt-4 space-y-3">

                  {/* Status change */}
                  {event.status === 'upcoming' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleStatusChange('completed')}
                        className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                      >
                        <CheckCircle size={14} strokeWidth={2} />
                        {t('events.markCompleted')}
                      </button>
                      <button
                        onClick={() => handleStatusChange('cancelled')}
                        className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                      >
                        <XCircle size={14} strokeWidth={2} />
                        {t('events.markCancelled')}
                      </button>
                    </div>
                  )}
                  {(event.status === 'completed' || event.status === 'cancelled') && (
                    <button
                      onClick={() => handleStatusChange('upcoming')}
                      className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <RotateCcw size={14} strokeWidth={2} />
                      {t('events.reopen')}
                    </button>
                  )}

                  {/* Edit + Delete row */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <button
                      onClick={enterEditMode}
                      className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Pencil size={14} strokeWidth={2} />
                      {t('events.editEvent')}
                    </button>

                    {!deleteConfirm ? (
                      <button
                        onClick={() => setDeleteConfirm(true)}
                        className="flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} strokeWidth={2} />
                        {t('events.deleteEvent')}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Pasti padam?</span>
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                        >
                          {deleting ? '...' : 'Ya, Padam'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(false)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (

            /* ── Edit form ── */
            <div className="space-y-4">
              <h2 className="text-base font-bold text-gray-900">{t('events.editEvent')}</h2>

              {/* Nama Majlis */}
              <div>
                <FieldLabel>{t('events.eventName')}</FieldLabel>
                <input
                  type="text"
                  value={editForm.nama_majlis}
                  onChange={(e) => setEditForm((f) => ({ ...f, nama_majlis: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* Hall */}
              <div>
                <FieldLabel>{t('events.hall')}</FieldLabel>
                <select
                  value={editForm.hall_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, hall_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white"
                >
                  <option value="">— Pilih Dewan —</option>
                  {halls.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {/* Tarikh + Sesi */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>{t('events.date')}</FieldLabel>
                  <input
                    type="date"
                    value={editForm.tarikh}
                    onChange={(e) => setEditForm((f) => ({ ...f, tarikh: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>
                <div>
                  <FieldLabel>{t('events.session')}</FieldLabel>
                  <div className="flex gap-2">
                    {(['siang', 'malam'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setEditForm((f) => ({ ...f, sesi: s }))}
                        className={cn(
                          'flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-colors',
                          editForm.sesi === s
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

              {/* Pax + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>{t('events.pax')}</FieldLabel>
                  <input
                    type="number"
                    value={editForm.pax}
                    min={1}
                    onChange={(e) => setEditForm((f) => ({ ...f, pax: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>
                <div>
                  <FieldLabel>{t('common.status')}</FieldLabel>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as typeof f.status }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white"
                  >
                    <option value="upcoming">{t('events.statusUpcoming')}</option>
                    <option value="completed">{t('events.statusCompleted')}</option>
                    <option value="cancelled">{t('events.statusCancelled')}</option>
                  </select>
                </div>
              </div>

              {/* Menu pills */}
              {(['nasi', 'ayam', 'daging', 'acar', 'bubur'] as const).map((cat) =>
                options[cat].length > 0 ? (
                  <div key={cat}>
                    <FieldLabel>{cat.charAt(0).toUpperCase() + cat.slice(1)}</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {options[cat].map((opt) => (
                        <Pill
                          key={opt}
                          label={opt}
                          selected={editForm.menu[cat] === opt}
                          onClick={() => setEditForm((f) => ({ ...f, menu: { ...f.menu, [cat]: opt } }))}
                        />
                      ))}
                    </div>
                  </div>
                ) : null
              )}

              {/* Air Panas */}
              <div>
                <FieldLabel>Air Panas</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {(options.air.length > 0 ? options.air : ['Teh O', 'Kopi O']).map((opt) => (
                    <Pill
                      key={opt}
                      label={opt}
                      selected={editForm.menu.air_panas === opt}
                      onClick={() => setEditForm((f) => ({ ...f, menu: { ...f.menu, air_panas: opt } }))}
                    />
                  ))}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <FieldLabel>{t('common.remarks')}</FieldLabel>
                <textarea
                  value={editForm.remarks}
                  onChange={(e) => setEditForm((f) => ({ ...f, remarks: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
                >
                  {saving ? t('common.loading') : t('common.save')}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-gray-500 hover:text-gray-700 font-medium px-4 py-2.5 text-sm transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════
          Ingredients Tab
      ════════════════════════════════════════ */}
      {tab === 'ingredients' && (
        <div>
          {/* Print action */}
          <div className="flex items-center justify-between mb-4 print:hidden">
            <p className="text-xs text-gray-400">
              Dikira berdasarkan{' '}
              <span className="font-semibold text-gray-600">{event.pax} pax</span>
            </p>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
            >
              <Printer size={14} strokeWidth={2} />
              {t('events.print')}
            </button>
          </div>

          {!ingr ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center print:hidden">
              <p className="text-sm text-gray-400">{t('events.customPax')}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 print:hidden">
              {/* Bracket */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{t('ingredients.bracket')}</span>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                  {ingr.bracket} pax
                </span>
              </div>

              {/* Bahan Utama */}
              <SectionHeader title="Bahan Utama" />
              <IngRow label="Beras" value={`${ingr.main.beras_bag} bag`} />
              <IngRow label="Ayam" value={`${ingr.main.ayam_ekor} ekor`} />
              <IngRow label="Daging" value={`${ingr.main.daging_kg} kg`} />
              <IngRow label="Paceri Nenas" value={`${ingr.main.paceri_nenas_biji} biji`} />
              <IngRow label="Oren" value={`${ingr.main.oren_biji} biji`} />
              <IngRow label="Gula" value={`${ingr.main.gula_liter} L`} />

              {/* Kotak Daging */}
              <SectionHeader title="Kotak Daging" />
              <IngRow label="Slice (potong)" value={`${ingr.daging_box.slice_boxes} kotak`} />
              <IngRow label="Trim" value={`${ingr.daging_box.trim_boxes} kotak`} />
              <IngRow label="Lebihan" value={`${ingr.daging_box.variance_kg} kg`} />

              {/* Dalca */}
              <SectionHeader title="Dalca" />
              <IngRow label="Kacang Dall" value={ingr.dalca.kacang_dall} />
              <IngRow label="Terung" value={ingr.dalca.terung} />
              <IngRow label="Kentang" value={ingr.dalca.kentang} />
              <IngRow label="Karot" value={ingr.dalca.karot} />
              <IngRow label="Kacang Panjang" value={ingr.dalca.kacang_panjang} />
              <IngRow label="Serbuk Kari" value={ingr.dalca.serbuk_kari} />

              {/* Bubur */}
              <SectionHeader title="Bubur" />
              <IngRow
                label="Pulut Hitam"
                value={`${ingr.bubur.pulut_hitam.beras_pulut_kg}kg + ${ingr.bubur.pulut_hitam.santan_tin} tin santan`}
              />
              <IngRow
                label="Kacang Hijau"
                value={`${ingr.bubur.kacang_hijau.kacang_kg}kg + ${ingr.bubur.kacang_hijau.santan_tin} tin santan`}
              />
              <IngRow
                label="Bubur Jagung"
                value={`${ingr.bubur.jagung.beg} beg (${ingr.bubur.jagung.beras_kg}kg) + ${ingr.bubur.jagung.santan_kotak} kotak santan`}
              />

              {/* Acar */}
              <SectionHeader title="Acar" />
              <IngRow
                label="Timun"
                value={ingr.acar.timun_kg !== null ? `${ingr.acar.timun_kg} kg` : null}
              />
              <IngRow
                label="Nenas"
                value={ingr.acar.nenas_biji !== null ? `${ingr.acar.nenas_biji} biji` : null}
              />
            </div>
          )}

          <PrintView event={event} ingr={ingr} menu={menu} />
        </div>
      )}
    </div>
  )
}
