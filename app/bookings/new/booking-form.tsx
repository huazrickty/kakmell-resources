'use client'

import { useState, useMemo, useId } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { IngredientPreview } from '@/components/ingredient-preview'
import { calculateIngredients } from '@/lib/ingredient-calculator'
import type { MenuSelection } from '@/lib/ingredient-calculator'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Plus, Trash2, ChevronRight, Lock, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Menu option data ─────────────────────────────────────────────────────────

const MENU_NASI    = [
  { value: 'nasi_briyani',  label: 'Nasi Briyani' },
  { value: 'nasi_minyak',   label: 'Nasi Minyak' },
  { value: 'nasi_jagung',   label: 'Nasi Jagung' },
]
const MENU_DAGING  = [
  { value: 'daging_black_pepper', label: 'Black Pepper' },
  { value: 'daging_masak_hitam',  label: 'Masak Hitam' },
  { value: 'daging_briyani',      label: 'Briyani' },
  { value: 'daging_kuzi',         label: 'Kuzi' },
  { value: 'daging_masak_kurma',  label: 'Kurma' },
]
const MENU_ACAR    = [
  { value: 'paceri_nenas', label: 'Paceri Nenas' },
  { value: 'pencuk',       label: 'Pencuk' },
]
const MENU_BUBUR   = [
  { value: 'bubur_pulut_hitam',  label: 'Pulut Hitam' },
  { value: 'bubur_kacang_hijau', label: 'Kacang Hijau' },
  { value: 'bubur_jagung',       label: 'Jagung' },
]
const MENU_AIR_TEH = [
  { value: 'teh_o',  label: 'Teh O' },
  { value: 'kopi_o', label: 'Kopi O' },
]
const MENU_KUIH    = [
  'Karipap', 'Kasui Gedik', 'Cara Lauk', 'Cara Manis',
  'Seri Muka', 'Kole Kacang', 'Apam Gula Hangus', 'Koci',
]

// ── Shared sub-components ────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function OptionButton({
  label, selected, onSelect, disabled = false,
}: {
  label: string; selected: boolean; onSelect: () => void; disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'px-3 py-2.5 rounded-lg border text-sm font-medium transition-all min-h-[48px] text-left',
        selected
          ? 'bg-green-50 border-green-500 text-green-700'
          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400 active:bg-gray-50',
        disabled && !selected && 'opacity-40 cursor-not-allowed',
      )}
    >
      {selected && <span className="mr-1">✓</span>}
      {label}
    </button>
  )
}

function MenuCategory({ title, children, badge }: {
  title: string; children: React.ReactNode; badge?: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
        {badge && (
          <span className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{badge}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function SectionNextButton({ onClick, label = 'Seterusnya' }: { onClick: () => void; label?: string }) {
  return (
    <div className="pt-4">
      <Button
        type="button"
        onClick={onClick}
        className="w-full min-h-[48px] bg-gray-900 hover:bg-gray-800 text-white"
      >
        {label} <ChevronRight size={16} className="ml-1" />
      </Button>
    </div>
  )
}

function formatRM(n: number) {
  return `RM ${n.toLocaleString('ms-MY', { minimumFractionDigits: 2 })}`
}

// ── Desktop: sticky right-column preview panel ───────────────────────────────

function DesktopPreviewPanel({
  ingredientPreview, pax,
}: {
  ingredientPreview: ReturnType<typeof calculateIngredients> | null
  pax: number
}) {
  return (
    <div className="hidden lg:block lg:col-span-2 sticky top-24 self-start">
      {ingredientPreview ? (
        <IngredientPreview result={ingredientPreview} pax={pax} defaultOpen />
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
          <Package size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400 font-medium">Anggaran Bahan Mentah</p>
          <p className="text-xs text-gray-400 mt-1">
            Isi pax + pilihan menu untuk lihat senarai bahan
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main form component ───────────────────────────────────────────────────────

interface AddOn { id: string; name: string; price: string }

export function BookingForm({ halls }: { halls: string[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const uid = useId()

  // Read pre-fill values from URL (passed by calculator page)
  const prefillPax    = searchParams.get('pax')    ?? ''
  const prefillNasi   = searchParams.get('nasi')   ?? ''
  const prefillDaging = searchParams.get('daging') ?? ''
  const prefillAcar   = searchParams.get('acar')   ?? ''
  const prefillBubur  = searchParams.get('bubur')  ?? ''
  const prefillKuih   = searchParams.getAll('kuih')

  // Tab state — jump straight to menu tab if coming from calculator
  const [activeTab, setActiveTab] = useState(prefillNasi ? 'menu' : 'maklumat')

  // Section 1: Maklumat Klien
  const [clientName, setClientName] = useState('')
  const [eventDate,  setEventDate]  = useState('')
  const [hallName,   setHallName]   = useState('')
  const [pax,        setPax]        = useState(prefillPax)
  const [notes,      setNotes]      = useState('')

  // Section 2: Menu
  const [menuNasi,       setMenuNasi]       = useState(prefillNasi)
  const [menuDaging,     setMenuDaging]     = useState(prefillDaging)
  const [menuAcar,       setMenuAcar]       = useState(prefillAcar)
  const [menuBubur,      setMenuBubur]      = useState(prefillBubur)
  const [menuKuih,       setMenuKuih]       = useState<string[]>(prefillKuih)
  const [menuAirTehKopi, setMenuAirTehKopi] = useState('')

  // Section 3: Bayaran
  const [packagePrice, setPackagePrice] = useState('')
  const [addons,       setAddons]       = useState<AddOn[]>([])
  const [depositPaid,  setDepositPaid]  = useState('')
  const [submitting,   setSubmitting]   = useState(false)

  // Derived: totals
  const totalAmount = useMemo(() => {
    const pkg = parseFloat(packagePrice) || 0
    const extra = addons.reduce((s, a) => s + (parseFloat(a.price) || 0), 0)
    return pkg + extra
  }, [packagePrice, addons])

  const balance = useMemo(
    () => totalAmount - (parseFloat(depositPaid) || 0),
    [totalAmount, depositPaid]
  )

  // Derived: ingredient preview
  const ingredientPreview = useMemo(() => {
    const paxNum = parseInt(pax)
    if (!paxNum || paxNum < 100) return null
    if (!menuNasi || !menuDaging || !menuAcar || !menuBubur) return null
    try {
      return calculateIngredients(paxNum, {
        nasi:  menuNasi   as MenuSelection['nasi'],
        ayam:  'ayam_masak_merah',
        daging: menuDaging as MenuSelection['daging'],
        acar:  menuAcar   as MenuSelection['acar'],
        bubur: menuBubur  as MenuSelection['bubur'],
        kuih:  menuKuih,
      })
    } catch { return null }
  }, [pax, menuNasi, menuDaging, menuAcar, menuBubur, menuKuih])

  const paxNum = parseInt(pax) || 0

  // Kuih toggle (max 2)
  function toggleKuih(item: string) {
    setMenuKuih(prev => {
      if (prev.includes(item)) return prev.filter(k => k !== item)
      if (prev.length >= 2) return prev
      return [...prev, item]
    })
  }

  // Add-ons management
  function addAddon() {
    setAddons(prev => [...prev, { id: `${uid}-${Date.now()}`, name: '', price: '' }])
  }
  function updateAddon(id: string, field: 'name' | 'price', val: string) {
    setAddons(prev => prev.map(a => a.id === id ? { ...a, [field]: val } : a))
  }
  function removeAddon(id: string) {
    setAddons(prev => prev.filter(a => a.id !== id))
  }

  // Validate section 1 before advancing
  function goToMenu() {
    if (!clientName.trim()) { toast.error('Sila masukkan nama klien'); return }
    if (!eventDate)          { toast.error('Sila pilih tarikh majlis'); return }
    if (!pax || parseInt(pax) < 1) { toast.error('Sila masukkan bilangan pax'); return }
    setActiveTab('menu')
  }

  // Submit handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientName.trim() || !eventDate || !pax) {
      toast.error('Sila lengkapkan maklumat wajib: nama, tarikh, dan pax')
      setActiveTab('maklumat')
      return
    }

    setSubmitting(true)
    const supabase = createSupabaseBrowserClient()

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        client_name:    clientName.trim(),
        event_date:     eventDate,
        hall_name:      hallName || null,
        pax:            parseInt(pax),
        package_price:  parseFloat(packagePrice) || null,
        addons:         addons.map(a => ({ name: a.name, price: parseFloat(a.price) || 0 })),
        total_amount:   totalAmount > 0 ? totalAmount : null,
        deposit_paid:   parseFloat(depositPaid) || 0,
        status:         'confirmed',
        notes:          notes.trim() || null,
        menu_selection: {
          nasi:   menuNasi   || null,
          ayam:   'ayam_masak_merah',
          daging: menuDaging || null,
          acar:   menuAcar   || null,
          bubur:  menuBubur  || null,
          kuih:   menuKuih,
          air:    ['anggur_kordial', menuAirTehKopi].filter(Boolean),
        },
      })
      .select('id')
      .single()

    if (error) {
      console.error(error)
      toast.error('Gagal simpan booking. Cuba lagi.')
      setSubmitting(false)
      return
    }

    toast.success('Booking berjaya disimpan!')
    router.push(`/bookings/${data.id}`)
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="min-h-screen bg-gray-50 pb-24 lg:pb-8 lg:min-h-0">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 lg:px-8 py-3 max-w-5xl mx-auto">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700 min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            ←
          </button>
          <h1 className="text-base font-bold text-gray-900">Booking Baru</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 pt-5 lg:pt-8">

        {/* Tab switcher */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
          <TabsList className="w-full mb-5 lg:mb-6 h-auto p-1 lg:max-w-sm">
            <TabsTrigger value="maklumat" className="flex-1 py-2 text-xs lg:text-sm">
              1. Maklumat
            </TabsTrigger>
            <TabsTrigger value="menu" className="flex-1 py-2 text-xs lg:text-sm">
              2. Menu
            </TabsTrigger>
            <TabsTrigger value="bayaran" className="flex-1 py-2 text-xs lg:text-sm">
              3. Bayaran
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: MAKLUMAT KLIEN ──────────────────────────────────── */}
          <TabsContent value="maklumat">
            <div className="lg:grid lg:grid-cols-5 lg:gap-8 lg:items-start">
              {/* Form — full width on mobile, 3/5 on desktop */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Maklumat Klien</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div>
                      <FieldLabel required>Nama Klien</FieldLabel>
                      <Input
                        value={clientName}
                        onChange={e => setClientName(e.target.value)}
                        placeholder="Cth: Aishah binti Ahmad"
                        className="h-12 text-base"
                      />
                    </div>

                    {/* Desktop: date + pax side by side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <div>
                        <FieldLabel required>Tarikh Majlis</FieldLabel>
                        <Input
                          type="date"
                          value={eventDate}
                          onChange={e => setEventDate(e.target.value)}
                          className="h-12 text-base"
                        />
                      </div>
                      <div>
                        <FieldLabel required>Bilangan Pax</FieldLabel>
                        <Input
                          type="number"
                          value={pax}
                          onChange={e => setPax(e.target.value)}
                          placeholder="Cth: 500"
                          min={1}
                          className="h-12 text-base"
                        />
                        {parseInt(pax) > 1000 && (
                          <p className="text-xs text-amber-600 mt-1">
                            ⚠️ Pax melebihi 1000 — perlu kiraan khas
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <FieldLabel>Nama Dewan</FieldLabel>
                      <select
                        value={hallName}
                        onChange={e => setHallName(e.target.value)}
                        className="w-full h-12 px-3 rounded-lg border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">-- Pilih dewan --</option>
                        {halls.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>

                    <div>
                      <FieldLabel>Catatan</FieldLabel>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Cth: Tema warna putih emas, minta awal pagi..."
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-lg border border-input bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <SectionNextButton onClick={goToMenu} />
                  </CardContent>
                </Card>
              </div>

              {/* Right preview panel (desktop only) */}
              <DesktopPreviewPanel ingredientPreview={ingredientPreview} pax={paxNum} />
            </div>
          </TabsContent>

          {/* ── TAB 2: PILIHAN MENU ────────────────────────────────────── */}
          <TabsContent value="menu">
            <div className="lg:grid lg:grid-cols-5 lg:gap-8 lg:items-start">
              {/* Menu selections */}
              <div className="lg:col-span-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Pilihan Menu</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">

                    <MenuCategory title="Nasi" badge="Pilih 1">
                      {MENU_NASI.map(opt => (
                        <OptionButton key={opt.value} label={opt.label}
                          selected={menuNasi === opt.value}
                          onSelect={() => setMenuNasi(opt.value)} />
                      ))}
                    </MenuCategory>

                    <MenuCategory title="Ayam">
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-green-500 bg-green-50 text-green-700 text-sm font-medium">
                        <Lock size={13} className="text-green-500" />
                        Ayam Masak Merah
                        <span className="text-xs text-green-500 ml-1">(standard)</span>
                      </div>
                    </MenuCategory>

                    <MenuCategory title="Daging" badge="Pilih 1">
                      {MENU_DAGING.map(opt => (
                        <OptionButton key={opt.value} label={opt.label}
                          selected={menuDaging === opt.value}
                          onSelect={() => setMenuDaging(opt.value)} />
                      ))}
                    </MenuCategory>

                    <MenuCategory title="Acar" badge="Pilih 1">
                      {MENU_ACAR.map(opt => (
                        <OptionButton key={opt.value} label={opt.label}
                          selected={menuAcar === opt.value}
                          onSelect={() => setMenuAcar(opt.value)} />
                      ))}
                    </MenuCategory>

                    <MenuCategory title="Dalca">
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-green-500 bg-green-50 text-green-700 text-sm font-medium">
                        <Lock size={13} className="text-green-500" />
                        Dalca
                        <span className="text-xs text-green-500 ml-1">(standard)</span>
                      </div>
                    </MenuCategory>

                    <MenuCategory title="Bubur" badge="Pilih 1">
                      {MENU_BUBUR.map(opt => (
                        <OptionButton key={opt.value} label={opt.label}
                          selected={menuBubur === opt.value}
                          onSelect={() => setMenuBubur(opt.value)} />
                      ))}
                    </MenuCategory>

                    <MenuCategory title="Buah">
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-green-500 bg-green-50 text-green-700 text-sm font-medium">
                        <Lock size={13} className="text-green-500" />
                        Oren
                        <span className="text-xs text-green-500 ml-1">(standard)</span>
                      </div>
                    </MenuCategory>

                    <MenuCategory title="Air" badge="Teh/Kopi — pilih 1">
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-green-200 bg-green-50 text-green-600 text-sm">
                        ✓ Anggur / Kordial (auto)
                      </div>
                      {MENU_AIR_TEH.map(opt => (
                        <OptionButton key={opt.value} label={opt.label}
                          selected={menuAirTehKopi === opt.value}
                          onSelect={() => setMenuAirTehKopi(opt.value)} />
                      ))}
                    </MenuCategory>

                    <MenuCategory title="Kuih" badge={`Pilih 2 — ${menuKuih.length}/2 dipilih`}>
                      {MENU_KUIH.map(item => (
                        <OptionButton key={item} label={item}
                          selected={menuKuih.includes(item)}
                          onSelect={() => toggleKuih(item)}
                          disabled={menuKuih.length >= 2 && !menuKuih.includes(item)} />
                      ))}
                    </MenuCategory>

                    {/* Mobile-only: ingredient preview inside tab */}
                    <div className="lg:hidden">
                      {ingredientPreview ? (
                        <IngredientPreview result={ingredientPreview} pax={paxNum} defaultOpen />
                      ) : paxNum >= 100 ? (
                        <div className="rounded-xl border border-dashed border-gray-300 px-4 py-4 text-center text-sm text-gray-400">
                          Lengkapkan pilihan nasi, daging, acar & bubur untuk lihat anggaran bahan
                        </div>
                      ) : null}
                    </div>

                    <SectionNextButton onClick={() => setActiveTab('bayaran')} />
                  </CardContent>
                </Card>
              </div>

              {/* Desktop: sticky ingredient preview */}
              <DesktopPreviewPanel ingredientPreview={ingredientPreview} pax={paxNum} />
            </div>
          </TabsContent>

          {/* ── TAB 3: PAKEJ & BAYARAN ─────────────────────────────────── */}
          <TabsContent value="bayaran">
            <div className="lg:grid lg:grid-cols-5 lg:gap-8 lg:items-start">
              {/* Payment form */}
              <div className="lg:col-span-3 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Pakej & Add-ons</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <FieldLabel>Harga Pakej (RM)</FieldLabel>
                      <Input
                        type="number"
                        value={packagePrice}
                        onChange={e => setPackagePrice(e.target.value)}
                        placeholder="0.00"
                        min={0}
                        step="0.01"
                        className="h-12 text-base"
                      />
                    </div>

                    <div>
                      <FieldLabel>Add-ons</FieldLabel>
                      {addons.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {addons.map(addon => (
                            <div key={addon.id} className="flex items-center gap-2">
                              <Input
                                value={addon.name}
                                onChange={e => updateAddon(addon.id, 'name', e.target.value)}
                                placeholder="Nama add-on"
                                className="flex-1 h-11"
                              />
                              <Input
                                type="number"
                                value={addon.price}
                                onChange={e => updateAddon(addon.id, 'price', e.target.value)}
                                placeholder="RM"
                                min={0}
                                step="0.01"
                                className="w-28 h-11"
                              />
                              <button
                                type="button"
                                onClick={() => removeAddon(addon.id)}
                                className="min-w-[48px] min-h-[48px] flex items-center justify-center text-red-400 hover:text-red-600"
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addAddon}
                        className="w-full min-h-[48px] border-dashed text-gray-500"
                      >
                        <Plus size={16} className="mr-1.5" /> Tambah Add-on
                      </Button>
                    </div>

                    {totalAmount > 0 && (
                      <div className="flex items-center justify-between py-3 border-t border-gray-100">
                        <span className="text-sm font-medium text-gray-700">Jumlah Keseluruhan</span>
                        <span className="text-base font-bold text-gray-900">{formatRM(totalAmount)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Bayaran</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <FieldLabel>Deposit Dibayar (RM)</FieldLabel>
                      <Input
                        type="number"
                        value={depositPaid}
                        onChange={e => setDepositPaid(e.target.value)}
                        placeholder="0.00"
                        min={0}
                        step="0.01"
                        className="h-12 text-base"
                      />
                    </div>

                    {totalAmount > 0 && (
                      <div className={cn(
                        'flex items-center justify-between py-3 px-4 rounded-lg',
                        balance > 0 ? 'bg-red-50' : 'bg-green-50'
                      )}>
                        <span className="text-sm font-medium text-gray-700">Baki Belum Bayar</span>
                        <span className={cn(
                          'text-lg font-bold',
                          balance > 0 ? 'text-red-600' : 'text-green-600'
                        )}>
                          {formatRM(balance)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[52px] bg-green-600 hover:bg-green-700 text-white font-semibold text-base"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Booking'}
                </Button>
              </div>

              {/* Desktop: sticky ingredient preview */}
              <DesktopPreviewPanel ingredientPreview={ingredientPreview} pax={paxNum} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </form>
  )
}
