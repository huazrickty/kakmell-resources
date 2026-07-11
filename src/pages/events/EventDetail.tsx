import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, updateDoc, deleteDoc, Timestamp, getDocs, query, collection, where } from 'firebase/firestore'
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
import { useMenuTypeItems } from '@/hooks/useMenuTypeItems'
import { resolveMenuType, MENU_TYPE_LABEL_KEYS, getHotDrinks, getColdDrinks } from '@/lib/menu-types'
import { type IngredientResult } from '@/lib/ingredient-calculator'
import { getIngredientOverrides, type OverrideMap } from '@/lib/ingredient-overrides'
import { calculateIngredientsWithOverrides } from '@/lib/ingredient-calculator-dynamic'
import { cn } from '@/lib/utils'
import type { MenuSelection, EventDoc } from '@/hooks/useEvents'
import { logActivity } from '@/lib/activity-logger'

// ── Screen sub-components ───────────────────────────────────────────────────

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

// ── Print: window.open HTML generation ─────────────────────────────────────

function esc(s: string | null | undefined): string {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function generatePrintHTML(
  event: EventDoc,
  ingr: IngredientResult | null,
  menu: MenuSelection,
): string {
  const logoUrl = `${window.location.origin}/logo.png`
  const dateStr = format(event.tarikh.toDate(), 'd MMMM yyyy')
  const sesi = event.sesi === 'siang' ? 'Siang' : 'Malam'
  const bracketStr = ingr ? ` (Bracket ${ingr.bracket})` : ''
  const printTime = format(new Date(), 'd MMM yyyy, HH:mm')

  const fmtSagu = (kg: number) => kg < 1 ? `${Math.round(kg * 1000)} g` : `${kg} kg`

  // Numbered main item; qty right-aligned. Numbering is dynamic — absent items
  // (no bubur / no drinks) simply don't consume a number.
  const ni = (num: number, name: string, qty?: string) =>
    `<div class="item"><span class="inum">${num}.</span><span class="iname">${esc(name)}</span>${qty ? `<span class="iq">${esc(qty)}</span>` : ''}</div>`

  const br = (label: string, value: string) =>
    `<div class="branch"><span class="bl">└ ${esc(label)}</span><span class="bq">${esc(value)}</span></div>`

  let bodyHTML: string
  if (!ingr) {
    bodyHTML = `<div class="custom-pax">Pax melebihi 1,000 — kuantiti tersuai. Hubungi pengurusan.</div>`
  } else {
    const { main, daging_box, dalca, acar, bubur } = ingr
    const trimVal = daging_box.trim_boxes === 0 ? '—' : `${daging_box.trim_boxes} kotak`
    const lebVal  = `${daging_box.variance_kg > 0 ? '+' : ''}${daging_box.variance_kg} kg`
    let n = 1
    const rows: string[] = []

    rows.push(ni(n++, menu.nasi || 'Nasi', `${main.beras_bag} bag`))
    rows.push(ni(n++, menu.ayam || 'Ayam', `${main.ayam_ekor} ekor`))
    rows.push(ni(n++, menu.daging || 'Daging', `${main.daging_kg} kg`))
    rows.push(br('Slice', `${daging_box.slice_boxes} kotak`))
    rows.push(br('Trimming', trimVal))
    rows.push(br('Lebihan', lebVal))
    rows.push(ni(n++, 'Dalca'))
    rows.push(br('Kacang Dall', dalca.kacang_dall))
    rows.push(br('Terung', dalca.terung))
    rows.push(br('Kentang', dalca.kentang))
    rows.push(br('Karot', dalca.karot))

    if (menu.acar === 'Pencuk') {
      rows.push(ni(n++, 'Pencuk (Acar Jelatah)'))
      if (acar.timun_kg !== null) rows.push(br('Timun', `${acar.timun_kg} kg`))
      rows.push(br('Nenas', `${acar.nenas_biji} biji`))
    } else {
      rows.push(ni(n++, 'Paceri Nenas', `${acar.nenas_biji} biji`))
    }

    if (menu.bubur === 'Bubur Pulut Hitam') {
      const b = bubur.pulut_hitam
      rows.push(ni(n++, 'Bubur Pulut Hitam'))
      rows.push(br('Pulut Hitam', `${b.beras_pulut_kg} kg`))
      rows.push(br('Santan', `${b.santan_kg} kg`))
      rows.push(br('Sagu', fmtSagu(b.sagu_kg)))
    } else if (menu.bubur === 'Bubur Kacang Hijau') {
      const b = bubur.kacang_hijau
      rows.push(ni(n++, 'Bubur Kacang Hijau'))
      rows.push(br('Kacang Hijau', `${b.kacang_kg} kg`))
      rows.push(br('Santan', `${b.santan_kg} kg`))
      rows.push(br('Sagu', fmtSagu(b.sagu_kg)))
    } else if (menu.bubur === 'Bubur Jagung') {
      const b = bubur.jagung
      rows.push(ni(n++, 'Bubur Jagung'))
      rows.push(br('Jagung', `${b.beras_kg} kg (${b.beg} beg)`))
      rows.push(br('Santan', `${b.santan_kg} kg`))
      rows.push(br('Sagu', fmtSagu(b.sagu_kg)))
    }

    // Air — hot + cold combined; legacy air_panas falls back via the helpers
    const drinks = [...getHotDrinks(menu), ...getColdDrinks(menu)]
    if (drinks.length > 0) rows.push(ni(n++, drinks.join(' · ')))

    rows.push(ni(n++, 'Buah Oren', `${main.oren_biji} biji`))
    rows.push(ni(n++, 'Air Gula', `${main.gula_liter} L`))

    bodyHTML = `<div class="list">${rows.join('')}</div>`
  }

  // Catatan / Menu Tambahan — full page available in print, no truncation needed
  const notesHTML = [
    event.remarks?.trim() ? `<div class="note"><b>Catatan:</b> ${esc(event.remarks.trim())}</div>` : '',
    event.menu_tambahan?.trim() ? `<div class="note"><b>Menu Tambahan:</b> ${esc(event.menu_tambahan.trim())}</div>` : '',
  ].join('')

  return `<!DOCTYPE html>
<html lang="ms">
<head>
<meta charset="utf-8">
<title>Bahan-bahan — ${esc(event.nama_majlis)}</title>
<style>
@page { size: A4 portrait; margin: 12mm; }
* { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.3; color: #374151; }
.header { display: flex; align-items: flex-start; border-bottom: 1.5pt solid #dc2626; padding-bottom: 6pt; margin-bottom: 8pt; }
.logo { height: 30pt; object-fit: contain; margin-right: 8pt; }
.brand { font-size: 13pt; font-weight: 800; color: #111827; line-height: 1.2; }
.ev-sub { font-size: 10pt; color: #374151; margin-top: 1pt; }
.ev-meta { font-size: 9pt; color: #6b7280; margin-top: 1pt; }
.list { margin-top: 2pt; }
.item { display: flex; align-items: baseline; padding: 3.5pt 0; border-bottom: 0.5pt solid #e5e7eb; }
.inum { font-weight: 800; color: #111827; font-size: 11pt; min-width: 18pt; flex-shrink: 0; }
.iname { font-weight: 800; color: #111827; font-size: 11pt; flex: 1; }
.iq { font-weight: 800; color: #111827; font-size: 13pt; white-space: nowrap; margin-left: 6pt; }
.branch { display: flex; align-items: baseline; padding: 2pt 0 2pt 14pt; border-bottom: 0.5pt dotted #f3f4f6; }
.bl { color: #333333; font-size: 9.5pt; flex: 1; }
.bq { font-weight: 700; color: #111827; font-size: 11pt; white-space: nowrap; }
.note { margin-top: 6pt; font-size: 9pt; color: #374151; }
.note b { color: #6b7280; }
.footer { margin-top: 10pt; border-top: 0.5pt solid #e5e7eb; padding-top: 4pt; display: flex; justify-content: space-between; font-size: 7.5pt; color: #9ca3af; }
.custom-pax { font-size: 10pt; color: #6b7280; text-align: center; padding: 20pt 0; }
</style>
</head>
<body>
<div class="header">
  <img class="logo" src="${logoUrl}" alt="">
  <div>
    <div class="brand">KAKMELL RESOURCES</div>
    <div class="ev-sub">${esc(event.nama_majlis)} — ${esc(event.hall_name)}</div>
    <div class="ev-meta">${esc(dateStr)} | ${sesi} | ${event.pax} pax${bracketStr}</div>
  </div>
</div>
${bodyHTML}
${notesHTML}
<div class="footer">
  <span>Dijana: ${esc(printTime)}</span>
  <span>KAKMELL RESOURCES</span>
</div>
</body>
</html>`
}

function printIngredients(event: EventDoc, ingr: IngredientResult | null, menu: MenuSelection, errorMsg: string) {
  const html = generatePrintHTML(event, ingr, menu)
  const w = window.open('', '_blank')
  if (!w) {
    toast.error(errorMsg)
    return
  }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print(); w.close() }, 300)
}

// ── Main component ──────────────────────────────────────────────────────────

const EMPTY_MENU: MenuSelection = { nasi: '', ayam: '', daging: '', acar: '', bubur: '', hot_drinks: [], cold_drinks: [] }

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, userDoc } = useAuth()
  const { t } = useLanguage()
  const isAdmin = userDoc?.role === 'admin'

  const { event, loading } = useEvent(id!)
  const { halls } = useHalls(!!user)
  const { options } = useMenuOptions(!!user)

  // 'kahwin' when missing — pre-Feature-A events are all weddings
  const menuType = resolveMenuType(event?.menu_type)
  const isKahwin = menuType === 'kahwin'
  const { items: typeItems } = useMenuTypeItems(menuType, !!user)

  const [existingInvoiceId, setExistingInvoiceId] = useState<string | null>(null)
  const [overrides, setOverrides] = useState<OverrideMap>({})

  useEffect(() => {
    if (!id || !isAdmin) return
    getDocs(query(collection(db, 'invoices'), where('event_id', '==', id))).then((snap) => {
      if (!snap.empty) setExistingInvoiceId(snap.docs[0].id)
    })
  }, [id, isAdmin])

  useEffect(() => {
    getIngredientOverrides().then(setOverrides).catch(() => {})
  }, [])

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
    menu_tambahan: '',
    menu: EMPTY_MENU,
    selected_items: [] as string[],
  })

  function enterEditMode() {
    if (!event) return
    const source = event.menu_selection ?? EMPTY_MENU
    setEditForm({
      nama_majlis: event.nama_majlis,
      hall_name: event.hall_name,
      tarikh: format(event.tarikh.toDate(), 'yyyy-MM-dd'),
      sesi: event.sesi,
      pax: event.pax,
      status: event.status,
      remarks: event.remarks || '',
      menu_tambahan: event.menu_tambahan ?? '',
      // Legacy air_panas string maps into hot_drinks on first edit
      menu: {
        ...source,
        hot_drinks: getHotDrinks(source),
        cold_drinks: getColdDrinks(source),
      },
      selected_items: [...(event.selected_items ?? [])],
    })
    setIsEditing(true)
  }

  async function handleSave() {
    if (!editForm.nama_majlis.trim()) { toast.error(t('events.validation.name')); return }
    if (!editForm.hall_name) { toast.error(t('events.validation.hall')); return }
    if (!editForm.tarikh) { toast.error(t('events.validation.date')); return }
    if (!editForm.pax || editForm.pax < 1) { toast.error(t('events.validation.pax')); return }
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
        menu_tambahan: editForm.menu_tambahan.trim(),
        // Drop legacy air_panas — hot_drinks/cold_drinks are the source of truth after edit
        menu_selection: (({ air_panas: _legacy, ...rest }) => rest)(editForm.menu),
        ...(!isKahwin && { selected_items: editForm.selected_items }),
      })
      logActivity({
        action: 'event_updated',
        category: 'event',
        description: `Acara dikemaskini: ${editForm.nama_majlis.trim()}`,
        entity_id: id!,
        entity_name: editForm.nama_majlis.trim(),
        performed_by: user!.uid,
        performed_by_name: userDoc?.full_name ?? '',
      })
      toast.success(t('events.toast.updated'))
      setIsEditing(false)
    } catch {
      toast.error(t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const eventName = event?.nama_majlis ?? ''
      await deleteDoc(doc(db, 'events', id!))
      logActivity({
        action: 'event_deleted',
        category: 'event',
        description: `Acara dipadam: ${eventName}`,
        entity_id: id!,
        entity_name: eventName,
        performed_by: user!.uid,
        performed_by_name: userDoc?.full_name ?? '',
      })
      toast.success(t('events.toast.deleted'))
      navigate('/events')
    } catch {
      toast.error(t('common.error'))
      setDeleting(false)
    }
  }

  async function handleStatusChange(status: 'upcoming' | 'completed' | 'cancelled') {
    try {
      await updateDoc(doc(db, 'events', id!), { status })
      logActivity({
        action: 'event_status_changed',
        category: 'event',
        description: `Status acara ditukar ke '${status}': ${event?.nama_majlis ?? ''}`,
        entity_id: id!,
        entity_name: event?.nama_majlis ?? '',
        performed_by: user!.uid,
        performed_by_name: userDoc?.full_name ?? '',
      })
      toast.success(t('events.toast.statusUpdated'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  // ── Loading / not found ───────────────────────────────────────────────────

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

  const menu = event.menu_selection ?? EMPTY_MENU
  const ingr = calculateIngredientsWithOverrides(event.pax, overrides, menu.acar)

  const statusLabel = t(
    `events.status${event.status.charAt(0).toUpperCase() + event.status.slice(1)}` as Parameters<typeof t>[0]
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
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

      {/* Tab bar — non-kahwin has no ingredient calculator, so no tabs */}
      {isKahwin && (
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5">
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
      )}

      {/* ════════════════════════════════════════
          Details Tab
      ════════════════════════════════════════ */}
      {(tab === 'details' || !isKahwin) && (
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
              {isKahwin ? (() => {
                const items = [
                  { cat: 'Nasi', val: menu.nasi },
                  { cat: 'Ayam', val: menu.ayam },
                  { cat: 'Daging', val: menu.daging },
                  { cat: 'Acar', val: menu.acar },
                  { cat: 'Bubur', val: menu.bubur },
                ].filter((item) => item.val)
                const drinkRows = [
                  { cat: t('events.hotDrinks'), vals: getHotDrinks(menu) },
                  { cat: t('events.coldDrinks'), vals: getColdDrinks(menu) },
                ].filter((row) => row.vals.length > 0)
                return items.length > 0 || drinkRows.length > 0 ? (
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
                      {drinkRows.map(({ cat, vals }) => (
                        <div key={cat} className="flex items-start gap-2.5">
                          <span className="text-xs text-gray-400 w-20 shrink-0 pt-1">{cat}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {vals.map((val) => <MenuChip key={val} label={val} />)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              })() : (
                <div className="mb-5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2.5">
                    {t('events.selectedMenu')}
                  </p>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-xs text-gray-400 w-20 shrink-0">{t('events.menuType')}</span>
                    <span className="inline-flex px-3 py-1 rounded-full bg-[#1B4332]/10 text-[#1B4332] text-xs font-semibold border border-[#1B4332]/20">
                      {t(MENU_TYPE_LABEL_KEYS[menuType])}
                    </span>
                  </div>
                  {(event.selected_items ?? []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(event.selected_items ?? []).map((item) => (
                        <MenuChip key={item} label={item} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-300 italic">{t('events.noItemsForType')}</p>
                  )}
                </div>
              )}

              {/* Menu Tambahan */}
              {event.menu_tambahan && (
                <div className="mb-5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                    {t('events.menuTambahan')}
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.menu_tambahan}</p>
                </div>
              )}

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

                  {/* Invoice button */}
                  <div>
                    <button
                      onClick={() => navigate(existingInvoiceId
                        ? `/invoices/${existingInvoiceId}`
                        : `/invoices/new?eventId=${id}`
                      )}
                      className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-[#1B4332] text-white hover:bg-[#163828] transition-colors w-full justify-center"
                    >
                      {existingInvoiceId ? t('invoice.viewInvoice') : t('invoice.createInvoice')}
                    </button>
                  </div>

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
                        <span className="text-xs text-gray-500">{t('events.deleteConfirmPrompt')}</span>
                        <button
                          onClick={handleDelete}
                          disabled={deleting}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                        >
                          {deleting ? '...' : t('common.deleteConfirmAction')}
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
                  <option value="">{t('events.selectHall')}</option>
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

              {/* Menu pills (kahwin) / item tick list (non-kahwin) */}
              {isKahwin ? (
                <>
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

                  {/* Minuman Panas / Sejuk — multi-select */}
                  {([
                    { key: 'hot_drinks' as const, label: t('events.hotDrinks'), opts: options.air_panas, fallback: ['Teh O', 'Kopi O', 'Air Sirap'] },
                    { key: 'cold_drinks' as const, label: t('events.coldDrinks'), opts: options.air_sejuk, fallback: ['Air Anggur/Kordial', 'Air Sirap'] },
                  ]).map(({ key, label, opts, fallback }) => {
                    const selected = editForm.menu[key] ?? []
                    // Union with saved selections so a deactivated drink stays visible
                    const shown = [...new Set([...(opts.length > 0 ? opts : fallback), ...selected])]
                    return (
                      <div key={key}>
                        <FieldLabel>{label}</FieldLabel>
                        <div className="flex flex-wrap gap-2">
                          {shown.map((opt) => (
                            <Pill
                              key={opt}
                              label={opt}
                              selected={selected.includes(opt)}
                              onClick={() => setEditForm((f) => {
                                const cur = f.menu[key] ?? []
                                return {
                                  ...f,
                                  menu: {
                                    ...f.menu,
                                    [key]: cur.includes(opt) ? cur.filter((d) => d !== opt) : [...cur, opt],
                                  },
                                }
                              })}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </>
              ) : (
                <div>
                  <FieldLabel>{t('events.selectItems')}</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {/* Union of the type's active items and this event's saved
                        items, so a since-deactivated item stays visible */}
                    {[...new Set([...typeItems, ...editForm.selected_items])].sort((a, b) => a.localeCompare(b)).map((item) => (
                      <Pill
                        key={item}
                        label={item}
                        selected={editForm.selected_items.includes(item)}
                        onClick={() => setEditForm((f) => ({
                          ...f,
                          selected_items: f.selected_items.includes(item)
                            ? f.selected_items.filter((i) => i !== item)
                            : [...f.selected_items, item],
                        }))}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Menu Tambahan */}
              <div>
                <FieldLabel>{t('events.menuTambahan')}</FieldLabel>
                <textarea
                  value={editForm.menu_tambahan}
                  onChange={(e) => setEditForm((f) => ({ ...f, menu_tambahan: e.target.value }))}
                  rows={2}
                  maxLength={300}
                  placeholder={t('events.menuTambahanPlaceholder')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none"
                />
                <p className="text-[10px] text-gray-400 text-right mt-0.5 tabular-nums">
                  {editForm.menu_tambahan.length}/300
                </p>
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
          Ingredients Tab — kahwin only (no calculator for other types)
      ════════════════════════════════════════ */}
      {tab === 'ingredients' && isKahwin && (
        <div>
          {/* Print action */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-400">
              {t('events.calculatedFrom')}{' '}
              <span className="font-semibold text-gray-600">{event.pax} pax</span>
            </p>
            <button
              onClick={() => printIngredients(event, ingr, menu, t('events.printPopupBlocked'))}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
            >
              <Printer size={14} strokeWidth={2} />
              {t('events.print')}
            </button>
          </div>

          {!ingr ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <p className="text-sm text-gray-400">{t('events.customPax')}</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6">
              {/* Bracket */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{t('ingredients.bracket')}</span>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                  {ingr.bracket} pax
                </span>
              </div>

              {/* Bahan Utama */}
              <SectionHeader title={t('ingredients.mainItems')} />
              <IngRow label="Beras" value={`${ingr.main.beras_bag} bag`} />
              <IngRow label="Ayam" value={`${ingr.main.ayam_ekor} ekor`} />
              <IngRow label="Daging" value={`${ingr.main.daging_kg} kg`} />
              <IngRow label="Oren" value={`${ingr.main.oren_biji} biji`} />
              <IngRow label="Gula" value={`${ingr.main.gula_liter} L`} />

              {/* Kotak Daging */}
              <SectionHeader title={t('ingredients.dagingBox')} />
              <IngRow label="Slice (potong)" value={`${ingr.daging_box.slice_boxes} kotak`} />
              <IngRow label="Trim" value={ingr.daging_box.trim_boxes === 0 ? '—' : `${ingr.daging_box.trim_boxes} kotak`} />
              <IngRow label="Lebihan" value={`${ingr.daging_box.variance_kg > 0 ? '+' : ''}${ingr.daging_box.variance_kg} kg`} />

              {/* Dalca */}
              <SectionHeader title={t('ingredients.dalca')} />
              <IngRow label="Kacang Dall" value={ingr.dalca.kacang_dall} />
              <IngRow label="Terung" value={ingr.dalca.terung} />
              <IngRow label="Kentang" value={ingr.dalca.kentang} />
              <IngRow label="Karot" value={ingr.dalca.karot} />

              {/* Bubur */}
              <SectionHeader title={t('ingredients.bubur')} />
              <IngRow label="Pulut Hitam" value={`${ingr.bubur.pulut_hitam.beras_pulut_kg}kg + ${ingr.bubur.pulut_hitam.santan_kg}kg santan + ${ingr.bubur.pulut_hitam.sagu_kg}kg sagu`} />
              <IngRow label="Kacang Hijau" value={`${ingr.bubur.kacang_hijau.kacang_kg}kg + ${ingr.bubur.kacang_hijau.santan_kg}kg santan + ${ingr.bubur.kacang_hijau.sagu_kg}kg sagu`} />
              <IngRow label="Bubur Jagung" value={`${ingr.bubur.jagung.beg} beg (${ingr.bubur.jagung.beras_kg}kg) + ${ingr.bubur.jagung.santan_kg}kg santan + ${ingr.bubur.jagung.sagu_kg}kg sagu`} />

              {/* Acar */}
              <SectionHeader title={menu.acar === 'Pencuk' ? 'Pencuk (Acar Jelatah)' : 'Paceri Nenas'} />
              <IngRow label="Timun" value={ingr.acar.timun_kg !== null ? `${ingr.acar.timun_kg} kg` : null} />
              <IngRow label="Nenas" value={`${ingr.acar.nenas_biji} biji`} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
