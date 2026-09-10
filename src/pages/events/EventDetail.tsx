import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, updateDoc, deleteDoc, Timestamp, getDocs, query, collection, where } from 'firebase/firestore'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  ArrowLeft, Sun, Moon, MapPin, Users, Calendar,
  Printer, Pencil, Trash2, CheckCircle, XCircle, RotateCcw,
  MoreHorizontal, Receipt, FileText,
} from 'lucide-react'
import {
  Button, Badge, type BadgeStatus, Input as KInput, Textarea as KTextarea,
  Select as KSelect, Segmented, Pill as KPill, BottomSheet, ListRow,
} from '@/components/ui-kit'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { useEvent } from '@/hooks/useEvent'
import { useQuotations } from '@/hooks/useQuotations'
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
    <div className="bg-ink/[0.03] rounded-xl p-3.5">
      <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm font-semibold text-ink">{children}</div>
    </div>
  )
}

// Numbered ingredient row — mirrors the weekly PDF structure
function NumRow({ num, label, value }: { num: number; label: string; value?: string }) {
  return (
    <div className="flex items-baseline gap-2 py-2.5 border-b border-line last:border-0">
      <span className="w-6 shrink-0 text-sm font-bold text-ink tabular-nums">{num}.</span>
      <span className="flex-1 text-sm font-bold text-ink">{label}</span>
      {value && <span className="text-sm font-bold text-ink tabular-nums">{value}</span>}
    </div>
  )
}

function BranchRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-baseline gap-2 py-1.5 pl-8 border-b border-line/60 last:border-0">
      <span className="flex-1 text-sm text-ink-soft">└ {label}</span>
      <span className="text-sm font-bold text-ink tabular-nums">{value}</span>
    </div>
  )
}

function MenuChip({ label }: { label: string }) {
  return (
    <span className="inline-flex px-3 py-1 rounded-full bg-ink/5 text-ink text-xs font-semibold">
      {label}
    </span>
  )
}

function Pill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <KPill selected={selected} onClick={onClick}>
      {label}
    </KPill>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wide mb-1.5">
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
  // Quotations for this event (admin only — kitchen has no read access to the collection)
  const { quotations: eventQuotations } = useQuotations({ eventId: id, limit: 5, enabled: isAdmin && !!id })

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
  const [actionsOpen, setActionsOpen] = useState(false)
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-ink" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center py-24">
        <p className="text-ink-soft text-sm">{t('events.eventNotFound')}</p>
        <button
          onClick={() => navigate('/events')}
          className="mt-4 text-danger text-sm font-medium hover:underline"
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
      <div className="flex items-start gap-2 mb-5">
        <button
          onClick={() => navigate('/events')}
          className="mt-0.5 h-9 w-9 -ml-2 flex items-center justify-center rounded-lg text-ink-soft hover:text-ink hover:bg-ink/5 transition-colors shrink-0"
          aria-label={t('common.back')}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-ink leading-snug">{event.nama_majlis}</h1>
          <p className="text-sm text-ink-soft mt-0.5">
            {format(event.tarikh.toDate(), 'd MMMM yyyy')} · {event.sesi === 'siang' ? 'Siang' : 'Malam'}
          </p>
          <div className="mt-1.5">
            <Badge status={({ upcoming: 'warn', completed: 'ok', cancelled: 'neutral' } as Record<string, BadgeStatus>)[event.status]}>
              {statusLabel}
            </Badge>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setActionsOpen(true); setDeleteConfirm(false) }}
            className="mt-0.5 h-9 w-9 flex items-center justify-center rounded-lg text-ink-soft hover:text-ink hover:bg-ink/5 transition-colors shrink-0"
            aria-label={t('common.actions')}
          >
            <MoreHorizontal size={20} />
          </button>
        )}
      </div>

      {/* Tab bar — non-kahwin has no ingredient calculator, so no tabs */}
      {isKahwin && (
      <div className="flex border-b border-line mb-5">
        {(['details', 'ingredients'] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => { setTab(tabKey); setIsEditing(false); setDeleteConfirm(false) }}
            className={cn(
              'relative px-4 pb-3 pt-1 min-h-11 text-sm font-semibold transition-colors',
              tab === tabKey ? 'text-ink' : 'text-ink-soft hover:text-ink'
            )}
          >
            {tabKey === 'details' ? t('events.tabDetails') : t('events.tabIngredients')}
            {tab === tabKey && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-ink" />
            )}
          </button>
        ))}
      </div>
      )}

      {/* ════════════════════════════════════════
          Details Tab
      ════════════════════════════════════════ */}
      {(tab === 'details' || !isKahwin) && (
        <div className="bg-surface rounded-xl border border-line shadow-sm p-5 md:p-6">

          {!isEditing ? (
            <>
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2.5 mb-5">
                <InfoCell label={t('events.hall')}>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} strokeWidth={1.8} className="text-ink-soft shrink-0" />
                    {event.hall_name || '—'}
                  </span>
                </InfoCell>
                <InfoCell label={t('events.date')}>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} strokeWidth={1.8} className="text-ink-soft shrink-0" />
                    {format(event.tarikh.toDate(), 'd MMM yyyy')}
                  </span>
                </InfoCell>
                <InfoCell label={t('events.session')}>
                  <span className="flex items-center gap-1.5">
                    {event.sesi === 'siang'
                      ? <Sun size={13} strokeWidth={1.8} className="text-warn shrink-0" />
                      : <Moon size={13} strokeWidth={1.8} className="text-ink-soft shrink-0" />
                    }
                    {event.sesi === 'siang' ? t('events.sessionMorning') : t('events.sessionEvening')}
                  </span>
                </InfoCell>
                <InfoCell label={t('events.pax')}>
                  <span className="flex items-center gap-1.5">
                    <Users size={13} strokeWidth={1.8} className="text-ink-soft shrink-0" />
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
                    <p className="text-[10px] font-semibold text-ink-soft uppercase tracking-widest mb-2.5">
                      {t('events.selectedMenu')}
                    </p>
                    <div className="space-y-2">
                      {items.map(({ cat, val }) => (
                        <div key={cat} className="flex items-center gap-2.5">
                          <span className="text-xs text-ink-soft w-20 shrink-0">{cat}</span>
                          <MenuChip label={val} />
                        </div>
                      ))}
                      {drinkRows.map(({ cat, vals }) => (
                        <div key={cat} className="flex items-start gap-2.5">
                          <span className="text-xs text-ink-soft w-20 shrink-0 pt-1">{cat}</span>
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
                  <p className="text-[10px] font-semibold text-ink-soft uppercase tracking-widest mb-2.5">
                    {t('events.selectedMenu')}
                  </p>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="text-xs text-ink-soft w-20 shrink-0">{t('events.menuType')}</span>
                    <span className="inline-flex px-3 py-1 rounded-full bg-ink/10 text-ink text-xs font-semibold border border-ink/20">
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
                    <p className="text-sm text-ink-soft/50 italic">{t('events.noItemsForType')}</p>
                  )}
                </div>
              )}

              {/* Menu Tambahan */}
              {event.menu_tambahan && (
                <div className="mb-5">
                  <p className="text-[10px] font-semibold text-ink-soft uppercase tracking-widest mb-1.5">
                    {t('events.menuTambahan')}
                  </p>
                  <p className="text-sm text-ink whitespace-pre-wrap">{event.menu_tambahan}</p>
                </div>
              )}

              {/* Remarks */}
              <div className="mb-5">
                <p className="text-[10px] font-semibold text-ink-soft uppercase tracking-widest mb-1.5">
                  {t('common.remarks')}
                </p>
                {event.remarks ? (
                  <p className="text-sm text-ink whitespace-pre-wrap">{event.remarks}</p>
                ) : (
                  <p className="text-sm text-ink-soft/50 italic">{t('events.noRemarks')}</p>
                )}
              </div>

              {/* Admin actions live in the header overflow sheet */}
            </>
          ) : (

            /* ── Edit form ── */
            <div className="space-y-4">
              <h2 className="text-base font-bold text-ink">{t('events.editEvent')}</h2>

              {/* Nama Majlis */}
              <div>
                <FieldLabel>{t('events.eventName')}</FieldLabel>
                <KInput
                  type="text"
                  value={editForm.nama_majlis}
                  onChange={(e) => setEditForm((f) => ({ ...f, nama_majlis: e.target.value }))}
                />
              </div>

              {/* Hall */}
              <div>
                <FieldLabel>{t('events.hall')}</FieldLabel>
                <KSelect
                  value={editForm.hall_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, hall_name: e.target.value }))}
                >
                  <option value="">{t('events.selectHall')}</option>
                  {halls.map((h) => <option key={h} value={h}>{h}</option>)}
                </KSelect>
              </div>

              {/* Tarikh + Sesi */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>{t('events.date')}</FieldLabel>
                  <KInput
                    type="date"
                    value={editForm.tarikh}
                    onChange={(e) => setEditForm((f) => ({ ...f, tarikh: e.target.value }))}
                  />
                </div>
                <div>
                  <FieldLabel>{t('events.session')}</FieldLabel>
                  <Segmented
                    value={editForm.sesi}
                    onChange={(sesi) => setEditForm((f) => ({ ...f, sesi }))}
                    options={[
                      { value: 'siang', label: t('events.sessionMorning') },
                      { value: 'malam', label: t('events.sessionEvening') },
                    ]}
                  />
                </div>
              </div>

              {/* Pax + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>{t('events.pax')}</FieldLabel>
                  <KInput
                    type="number"
                    value={editForm.pax}
                    min={1}
                    onChange={(e) => setEditForm((f) => ({ ...f, pax: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <FieldLabel>{t('common.status')}</FieldLabel>
                  <KSelect
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as typeof f.status }))}
                  >
                    <option value="upcoming">{t('events.statusUpcoming')}</option>
                    <option value="completed">{t('events.statusCompleted')}</option>
                    <option value="cancelled">{t('events.statusCancelled')}</option>
                  </KSelect>
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
                <KTextarea
                  value={editForm.menu_tambahan}
                  onChange={(e) => setEditForm((f) => ({ ...f, menu_tambahan: e.target.value }))}
                  rows={2}
                  maxLength={300}
                  placeholder={t('events.menuTambahanPlaceholder')}
                />
                <p className="text-xs text-ink-soft text-right mt-1 tabular-nums">
                  {editForm.menu_tambahan.length}/300
                </p>
              </div>

              {/* Remarks */}
              <div>
                <FieldLabel>{t('common.remarks')}</FieldLabel>
                <KTextarea
                  value={editForm.remarks}
                  onChange={(e) => setEditForm((f) => ({ ...f, remarks: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1" onClick={() => setIsEditing(false)}>
                  {t('common.cancel')}
                </Button>
                <Button className="flex-1" disabled={saving} onClick={handleSave}>
                  {saving ? t('common.loading') : t('common.save')}
                </Button>
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
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-ink-soft">
              {t('events.calculatedFrom')}{' '}
              <span className="font-semibold text-ink tabular-nums">{event.pax} pax</span>
            </p>
            {ingr && (
              <Badge status="neutral">{ingr.bracket} pax</Badge>
            )}
          </div>

          {!ingr ? (
            <div className="bg-surface rounded-xl border border-line shadow-card p-8 text-center">
              <p className="text-sm text-ink-soft">{t('events.customPax')}</p>
            </div>
          ) : (
            /* Numbered list mirroring the weekly PDF structure */
            <div className="bg-surface rounded-xl border border-line shadow-card p-4 md:p-5">
              {(() => {
                let n = 0
                const next = () => ++n
                const fmtSaguV = (kg: number) => kg < 1 ? `${Math.round(kg * 1000)} g` : `${kg} kg`
                const drinks = [...getHotDrinks(menu), ...getColdDrinks(menu)]
                const b = menu.bubur
                return (
                  <>
                    <NumRow num={next()} label={menu.nasi || 'Nasi'} value={`${ingr.main.beras_bag} bag`} />
                    <NumRow num={next()} label={menu.ayam || 'Ayam'} value={`${ingr.main.ayam_ekor} ekor`} />
                    <NumRow num={next()} label={menu.daging || 'Daging'} value={`${ingr.main.daging_kg} kg`} />
                    <BranchRow label="Slice" value={`${ingr.daging_box.slice_boxes} kotak`} />
                    <BranchRow label="Trimming" value={ingr.daging_box.trim_boxes === 0 ? '—' : `${ingr.daging_box.trim_boxes} kotak`} />
                    <BranchRow label="Lebihan" value={`${ingr.daging_box.variance_kg > 0 ? '+' : ''}${ingr.daging_box.variance_kg} kg`} />
                    <NumRow num={next()} label="Dalca" />
                    <BranchRow label="Kacang Dall" value={ingr.dalca.kacang_dall} />
                    <BranchRow label="Terung" value={ingr.dalca.terung} />
                    <BranchRow label="Kentang" value={ingr.dalca.kentang} />
                    <BranchRow label="Karot" value={ingr.dalca.karot} />
                    {menu.acar === 'Pencuk' ? (
                      <>
                        <NumRow num={next()} label="Pencuk (Acar Jelatah)" />
                        {ingr.acar.timun_kg !== null && <BranchRow label="Timun" value={`${ingr.acar.timun_kg} kg`} />}
                        <BranchRow label="Nenas" value={`${ingr.acar.nenas_biji} biji`} />
                      </>
                    ) : (
                      <NumRow num={next()} label="Paceri Nenas" value={`${ingr.acar.nenas_biji} biji`} />
                    )}
                    {b === 'Bubur Pulut Hitam' && (
                      <>
                        <NumRow num={next()} label="Bubur Pulut Hitam" />
                        <BranchRow label="Pulut Hitam" value={`${ingr.bubur.pulut_hitam.beras_pulut_kg} kg`} />
                        <BranchRow label="Santan" value={`${ingr.bubur.pulut_hitam.santan_kg} kg`} />
                        <BranchRow label="Sagu" value={fmtSaguV(ingr.bubur.pulut_hitam.sagu_kg)} />
                      </>
                    )}
                    {b === 'Bubur Kacang Hijau' && (
                      <>
                        <NumRow num={next()} label="Bubur Kacang Hijau" />
                        <BranchRow label="Kacang Hijau" value={`${ingr.bubur.kacang_hijau.kacang_kg} kg`} />
                        <BranchRow label="Santan" value={`${ingr.bubur.kacang_hijau.santan_kg} kg`} />
                        <BranchRow label="Sagu" value={fmtSaguV(ingr.bubur.kacang_hijau.sagu_kg)} />
                      </>
                    )}
                    {b === 'Bubur Jagung' && (
                      <>
                        <NumRow num={next()} label="Bubur Jagung" />
                        <BranchRow label="Jagung" value={`${ingr.bubur.jagung.beras_kg} kg (${ingr.bubur.jagung.beg} beg)`} />
                        <BranchRow label="Santan" value={`${ingr.bubur.jagung.santan_kg} kg`} />
                        <BranchRow label="Sagu" value={fmtSaguV(ingr.bubur.jagung.sagu_kg)} />
                      </>
                    )}
                    {drinks.length > 0 && <NumRow num={next()} label={drinks.join(' · ')} />}
                    <NumRow num={next()} label="Buah Oren" value={`${ingr.main.oren_biji} biji`} />
                    <NumRow num={next()} label="Air Gula" value={`${ingr.main.gula_liter} L`} />
                  </>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── Admin actions sheet ──────────────────────────────────────────── */}
      {isAdmin && (
        <BottomSheet
          open={actionsOpen}
          onClose={() => { setActionsOpen(false); setDeleteConfirm(false) }}
          title={t('common.actions')}
        >
          {!deleteConfirm ? (
            <div className="pb-2 -mx-4 divide-y divide-line">
              <ListRow
                leading={<Pencil size={18} />}
                label={t('events.editEvent')}
                chevron={false}
                onClick={() => { setActionsOpen(false); setTab('details'); enterEditMode() }}
              />
              {isKahwin && (
                <ListRow
                  leading={<Printer size={18} />}
                  label={t('events.print')}
                  chevron={false}
                  onClick={() => { setActionsOpen(false); printIngredients(event, ingr, menu, t('events.printPopupBlocked')) }}
                />
              )}
              <ListRow
                leading={<Receipt size={18} />}
                label={existingInvoiceId ? t('invoice.viewInvoice') : t('invoice.createInvoice')}
                chevron={false}
                onClick={() => navigate(existingInvoiceId
                  ? `/invoices/${existingInvoiceId}`
                  : `/invoices/new?eventId=${id}`
                )}
              />
              <ListRow
                leading={<FileText size={18} />}
                label={t('quotation.newFromEvent')}
                chevron={false}
                onClick={() => navigate(`/quotations/new?eventId=${id}`)}
              />
              {eventQuotations.length > 0 && (
                <ListRow
                  leading={<FileText size={18} />}
                  label={`${t('quotation.viewForEvent')} (${eventQuotations.length})`}
                  chevron={false}
                  onClick={() => navigate(`/quotations?eventId=${id}`)}
                />
              )}
              {event.status === 'upcoming' && (
                <>
                  <ListRow
                    leading={<CheckCircle size={18} />}
                    label={t('events.markCompleted')}
                    chevron={false}
                    onClick={() => { setActionsOpen(false); handleStatusChange('completed') }}
                  />
                  <ListRow
                    leading={<XCircle size={18} />}
                    label={t('events.markCancelled')}
                    chevron={false}
                    onClick={() => { setActionsOpen(false); handleStatusChange('cancelled') }}
                  />
                </>
              )}
              {(event.status === 'completed' || event.status === 'cancelled') && (
                <ListRow
                  leading={<RotateCcw size={18} />}
                  label={t('events.reopen')}
                  chevron={false}
                  onClick={() => { setActionsOpen(false); handleStatusChange('upcoming') }}
                />
              )}
              <ListRow
                leading={<Trash2 size={18} className="text-danger" />}
                label={<span className="text-danger">{t('events.deleteEvent')}</span>}
                chevron={false}
                onClick={() => setDeleteConfirm(true)}
              />
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              <p className="text-sm text-ink-soft">{t('events.deleteConfirmPrompt')}</p>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setDeleteConfirm(false)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="destructive" className="flex-1" disabled={deleting} onClick={handleDelete}>
                  <Trash2 size={15} />
                  {deleting ? '...' : t('common.deleteConfirmAction')}
                </Button>
              </div>
            </div>
          )}
        </BottomSheet>
      )}
    </div>
  )
}
