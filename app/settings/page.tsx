'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { SideNav } from '@/components/side-nav'
import { BottomNav } from '@/components/bottom-nav'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Settings, Plus, Trash2, Pencil, Check, X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

interface Hall    { id: string; name: string; is_active: boolean }
interface MenuOpt { id: string; category: string; name_ms: string; is_active: boolean }
interface Package { id: string; name: string; price: number; description: string | null; is_active: boolean }

// ── Helpers ──────────────────────────────────────────────────────────────────

const MENU_CATEGORIES = [
  { value: 'nasi',  label: 'Nasi'  },
  { value: 'ayam',  label: 'Ayam'  },
  { value: 'daging',label: 'Daging'},
  { value: 'acar',  label: 'Acar'  },
  { value: 'bubur', label: 'Bubur' },
  { value: 'kuih',  label: 'Kuih'  },
  { value: 'air',   label: 'Air'   },
  { value: 'buah',  label: 'Buah'  },
]

function SectionHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function WarningBanner() {
  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
      <p className="text-sm text-amber-800">
        <span className="font-semibold">Perhatian:</span> Perubahan akan affect semua booking baru.
      </p>
    </div>
  )
}

// ── Section 1: Dewan ─────────────────────────────────────────────────────────

function DewanSection() {
  const [halls, setHalls] = useState<Hall[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const supabase = createSupabaseBrowserClient()

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('halls').select('*').order('name')
    setHalls(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    const { error } = await supabase.from('halls').insert({ name })
    if (error) {
      toast.error('Gagal tambah dewan. ' + error.message)
    } else {
      toast.success(`Dewan "${name}" berjaya ditambah.`)
      setNewName('')
      await load()
    }
    setAdding(false)
  }

  async function handleToggle(hall: Hall) {
    const { error } = await supabase
      .from('halls').update({ is_active: !hall.is_active }).eq('id', hall.id)
    if (error) { toast.error('Gagal kemaskini dewan.'); return }
    setHalls(prev => prev.map(h => h.id === hall.id ? { ...h, is_active: !h.is_active } : h))
    toast.success(`Dewan "${hall.name}" ${!hall.is_active ? 'diaktifkan' : 'dinyahaktifkan'}.`)
  }

  async function handleSaveEdit(id: string) {
    const name = editName.trim()
    if (!name) return
    const { error } = await supabase.from('halls').update({ name }).eq('id', id)
    if (error) { toast.error('Gagal kemaskini nama.'); return }
    setHalls(prev => prev.map(h => h.id === id ? { ...h, name } : h))
    setEditId(null)
    toast.success('Nama dewan berjaya dikemaskini.')
  }

  async function handleDelete(hall: Hall) {
    if (!confirm(`Padam dewan "${hall.name}"? Tindakan ini tidak boleh diundur.`)) return
    const { error } = await supabase.from('halls').delete().eq('id', hall.id)
    if (error) { toast.error('Gagal padam dewan.'); return }
    setHalls(prev => prev.filter(h => h.id !== hall.id))
    toast.success(`Dewan "${hall.name}" dipadam.`)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-4 border-b border-gray-100">
        <SectionHead
          title="Senarai Dewan"
          subtitle="Dewan yang tersedia untuk dipilih semasa buat booking baru"
        />

        {loading ? (
          <p className="text-sm text-gray-400 py-4 text-center">Memuatkan…</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {halls.map(hall => (
              <li key={hall.id} className="flex items-center gap-3 py-3">
                {editId === hall.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(hall.id) }}
                      className="flex-1 min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveEdit(hall.id)}
                      className="min-h-[48px] min-w-[48px] flex items-center justify-center text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className={cn('flex-1 text-sm font-medium', !hall.is_active && 'text-gray-400 line-through')}>
                      {hall.name}
                    </span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      hall.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      {hall.is_active ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                    <button
                      onClick={() => { setEditId(hall.id); setEditName(hall.name) }}
                      className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      title="Edit nama"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleToggle(hall)}
                      className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title={hall.is_active ? 'Nyahaktif' : 'Aktifkan'}
                    >
                      {hall.is_active ? <X size={16} /> : <Check size={16} />}
                    </button>
                    <button
                      onClick={() => handleDelete(hall)}
                      className="min-h-[48px] min-w-[48px] flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Padam"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </li>
            ))}
            {halls.length === 0 && (
              <li className="py-6 text-center text-sm text-gray-400">Tiada dewan didaftarkan.</li>
            )}
          </ul>
        )}
      </div>

      {/* Add new */}
      <div className="px-4 py-4 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tambah Dewan Baru</p>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            placeholder="Cth: Orkid Hall"
            className="flex-1 min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="min-h-[48px] px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            <Plus size={16} />
            Tambah
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Section 2: Pilihan Menu ──────────────────────────────────────────────────

function MenuSection() {
  const [options, setOptions]     = useState<MenuOpt[]>([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('nasi')
  const [newName, setNewName]     = useState('')
  const [adding, setAdding]       = useState(false)

  const supabase = createSupabaseBrowserClient()

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('menu_options').select('*').order('name_ms')
    setOptions(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = options.filter(o => o.category === activeTab)

  async function handleToggle(opt: MenuOpt) {
    const { error } = await supabase
      .from('menu_options').update({ is_active: !opt.is_active }).eq('id', opt.id)
    if (error) { toast.error('Gagal kemaskini pilihan.'); return }
    setOptions(prev => prev.map(o => o.id === opt.id ? { ...o, is_active: !o.is_active } : o))
  }

  async function handleDelete(opt: MenuOpt) {
    if (!confirm(`Padam "${opt.name_ms}" dari senarai menu?`)) return
    const { error } = await supabase.from('menu_options').delete().eq('id', opt.id)
    if (error) { toast.error('Gagal padam pilihan.'); return }
    setOptions(prev => prev.filter(o => o.id !== opt.id))
    toast.success(`"${opt.name_ms}" dipadam.`)
  }

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    const { error } = await supabase
      .from('menu_options').insert({ category: activeTab, name_ms: name, is_active: true })
    if (error) {
      toast.error('Gagal tambah pilihan. ' + error.message)
    } else {
      toast.success(`"${name}" berjaya ditambah ke kategori ${activeTab}.`)
      setNewName('')
      await load()
    }
    setAdding(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 pt-4 border-b border-gray-100">
        <SectionHead
          title="Pilihan Menu"
          subtitle="Urus senarai pilihan menu mengikut kategori"
        />

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {MENU_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveTab(cat.value)}
              className={cn(
                'px-3 min-h-[36px] rounded-lg text-sm font-medium transition-colors',
                activeTab === cat.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 border-b border-gray-100 min-h-[120px]">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-4">Memuatkan…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Tiada pilihan untuk kategori ini.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map(opt => (
              <li key={opt.id} className="flex items-center gap-3 py-2.5">
                <span className={cn('flex-1 text-sm font-medium', !opt.is_active && 'text-gray-400 line-through')}>
                  {opt.name_ms}
                </span>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  opt.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                )}>
                  {opt.is_active ? 'Aktif' : 'Tidak Aktif'}
                </span>
                <button
                  onClick={() => handleToggle(opt)}
                  className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  title={opt.is_active ? 'Nyahaktif' : 'Aktifkan'}
                >
                  {opt.is_active ? <X size={16} /> : <Check size={16} />}
                </button>
                <button
                  onClick={() => handleDelete(opt)}
                  className="min-h-[48px] min-w-[48px] flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Padam"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-4 py-4 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Tambah ke kategori: <span className="text-gray-700 normal-case capitalize">{activeTab}</span>
        </p>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            placeholder={`Cth: Nasi Tomato`}
            className="flex-1 min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="min-h-[48px] px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            <Plus size={16} />
            Tambah
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Section 3: Pakej & Harga ─────────────────────────────────────────────────

function PakejSection() {
  const [packages, setPackages]   = useState<Package[]>([])
  const [loading, setLoading]     = useState(true)
  const [editId, setEditId]       = useState<string | null>(null)
  const [editData, setEditData]   = useState({ name: '', price: '', description: '' })
  const [showAdd, setShowAdd]     = useState(false)
  const [newData, setNewData]     = useState({ name: '', price: '', description: '' })
  const [saving, setSaving]       = useState(false)

  const supabase = createSupabaseBrowserClient()

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('packages').select('*').order('price')
    setPackages(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd() {
    const name  = newData.name.trim()
    const price = parseFloat(newData.price)
    if (!name || !price) { toast.error('Nama dan harga diperlukan.'); return }
    setSaving(true)
    const { error } = await supabase.from('packages').insert({
      name,
      price,
      description: newData.description.trim() || null,
    })
    if (error) {
      toast.error('Gagal tambah pakej. ' + error.message)
    } else {
      toast.success(`Pakej "${name}" berjaya ditambah.`)
      setNewData({ name: '', price: '', description: '' })
      setShowAdd(false)
      await load()
    }
    setSaving(false)
  }

  async function handleSaveEdit(id: string) {
    const name  = editData.name.trim()
    const price = parseFloat(editData.price)
    if (!name || !price) { toast.error('Nama dan harga diperlukan.'); return }
    const { error } = await supabase.from('packages').update({
      name,
      price,
      description: editData.description.trim() || null,
    }).eq('id', id)
    if (error) { toast.error('Gagal kemaskini pakej.'); return }
    setPackages(prev => prev.map(p =>
      p.id === id ? { ...p, name, price, description: editData.description || null } : p
    ))
    setEditId(null)
    toast.success('Pakej berjaya dikemaskini.')
  }

  async function handleDelete(pkg: Package) {
    if (!confirm(`Padam pakej "${pkg.name}"?`)) return
    const { error } = await supabase.from('packages').delete().eq('id', pkg.id)
    if (error) { toast.error('Gagal padam pakej.'); return }
    setPackages(prev => prev.filter(p => p.id !== pkg.id))
    toast.success(`Pakej dipadam.`)
  }

  function formatRM(n: number) {
    return `RM ${n.toLocaleString('ms-MY', { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 pt-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-4">
          <SectionHead
            title="Pakej & Harga"
            subtitle="Pakej standard yang boleh dipilih semasa buat booking"
          />
          <button
            onClick={() => setShowAdd(v => !v)}
            className="min-h-[48px] px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 shrink-0 ml-4"
          >
            <Plus size={16} />
            Tambah
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 space-y-3">
            <p className="text-sm font-semibold text-green-800">Pakej Baru</p>
            <input
              value={newData.name}
              onChange={e => setNewData(d => ({ ...d, name: e.target.value }))}
              placeholder="Nama pakej (Cth: Pakej Asas 500 pax)"
              className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              type="number"
              value={newData.price}
              onChange={e => setNewData(d => ({ ...d, price: e.target.value }))}
              placeholder="Harga (Cth: 4500)"
              className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <input
              value={newData.description}
              onChange={e => setNewData(d => ({ ...d, description: e.target.value }))}
              placeholder="Penerangan (pilihan)"
              className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex-1 min-h-[48px] bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? 'Menyimpan…' : 'Simpan Pakej'}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="min-h-[48px] px-4 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-6">Memuatkan…</p>
        ) : packages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Tiada pakej. Tambah pakej baru.</p>
        ) : (
          <ul className="divide-y divide-gray-100 mb-4">
            {packages.map(pkg => (
              <li key={pkg.id} className="py-4">
                {editId === pkg.id ? (
                  <div className="space-y-2">
                    <input
                      value={editData.name}
                      onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
                      className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      type="number"
                      value={editData.price}
                      onChange={e => setEditData(d => ({ ...d, price: e.target.value }))}
                      className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <input
                      value={editData.description}
                      onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                      placeholder="Penerangan (pilihan)"
                      className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(pkg.id)}
                        className="flex-1 min-h-[48px] bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        Simpan
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="min-h-[48px] px-4 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{pkg.name}</p>
                      {pkg.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{pkg.description}</p>
                      )}
                      <p className="text-base font-bold text-green-700 mt-1">{formatRM(pkg.price)}</p>
                    </div>
                    <button
                      onClick={() => { setEditId(pkg.id); setEditData({ name: pkg.name, price: String(pkg.price), description: pkg.description ?? '' }) }}
                      className="min-h-[48px] min-w-[48px] flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors shrink-0"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(pkg)}
                      className="min-h-[48px] min-w-[48px] flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <>
      <SideNav />
      <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 lg:pl-64">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center gap-3 px-4 lg:px-8 py-3 max-w-3xl mx-auto">
            <Settings size={20} className="text-green-600 shrink-0" />
            <div>
              <h1 className="text-base font-bold text-gray-900">Tetapan</h1>
              <p className="text-xs text-gray-400">Urus dewan, menu dan pakej</p>
            </div>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-5 lg:py-8 space-y-8">
          <WarningBanner />
          <DewanSection />
          <MenuSection />
          <PakejSection />
        </div>
      </div>
      <BottomNav />
    </>
  )
}
