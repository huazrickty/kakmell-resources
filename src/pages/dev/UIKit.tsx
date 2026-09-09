import { useState } from 'react'
import { ShieldOff, Inbox, User, MapPin, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  Button, Card, Input, Textarea, Select, Badge, SectionHeader,
  BottomSheet, ListRow, EmptyState, Segmented, Pill, ProgressBar,
} from '@/components/ui-kit'

// Dev-only visual review page for the Phase-1 design system.
// Intentionally not localised — internal tooling, never shown to staff.

const TOKENS: Array<[string, string, string]> = [
  ['bg',         '#FAFAF8', 'app background'],
  ['surface',    '#FFFFFF', 'cards, sheets, inputs'],
  ['ink',        '#111111', 'primary text'],
  ['ink-soft',   '#55524E', 'secondary text'],
  ['line',       '#E8E6E2', 'borders, dividers'],
  ['primary',    '#C4202A', 'CTA + critical only'],
  ['primary-hi', '#A81B24', 'pressed/hover'],
  ['ok',         '#1E7F4F', 'done / paid / active'],
  ['warn',       '#B45309', 'pending / attention'],
]

export default function UIKit() {
  const { userDoc } = useAuth()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [segment, setSegment] = useState<'a' | 'b' | 'c'>('a')
  const [pillOn, setPillOn] = useState(true)

  if (userDoc?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-center px-6">
        <ShieldOff size={36} className="text-ink-soft/40" />
        <p className="text-sm font-semibold text-ink-soft">Admin access only</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-8 bg-bg">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">UI Kit — Phase 1</h1>
        <p className="text-sm text-ink-soft mt-1">Design tokens + primitives review page</p>
      </div>

      {/* ── Colors ─────────────────────────────────────────────────────── */}
      <section>
        <SectionHeader>Color tokens</SectionHeader>
        <Card flush>
          <div className="divide-y divide-line">
            {TOKENS.map(([name, hex, use]) => (
              <div key={name} className="flex items-center gap-3 px-4 py-2.5">
                <span
                  className="h-8 w-8 shrink-0 rounded-lg border border-line"
                  style={{ backgroundColor: hex }}
                />
                <span className="flex-1 text-sm font-medium text-ink">{name}</span>
                <span className="text-xs text-ink-soft">{use}</span>
                <span className="text-xs text-ink-soft tabular-nums w-16 text-right">{hex}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* ── Typography ─────────────────────────────────────────────────── */}
      <section>
        <SectionHeader>Type scale (Geist)</SectionHeader>
        <Card className="space-y-2">
          <p className="text-2xl font-bold tracking-tight text-ink">2xl 30 — Page title</p>
          <p className="text-xl font-bold tracking-tight text-ink">xl 24 — Section title</p>
          <p className="text-lg font-bold tracking-tight text-ink">lg 20 — Card title</p>
          <p className="text-base text-ink">base 16 — Body / inputs</p>
          <p className="text-sm text-ink">sm 14 — Dense body, buttons</p>
          <p className="text-xs text-ink-soft">xs 12 — Captions, labels</p>
          <p className="text-base text-ink tabular-nums">tabular-nums: 1,234.50 / 067 / 890</p>
        </Card>
      </section>

      {/* ── Buttons ────────────────────────────────────────────────────── */}
      <section>
        <SectionHeader>Button</SectionHeader>
        <Card className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary"><Plus size={16} />Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive"><Trash2 size={16} />Destructive</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="primary">Small primary</Button>
            <Button size="sm" variant="secondary">Small secondary</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </Card>
      </section>

      {/* ── Fields ─────────────────────────────────────────────────────── */}
      <section>
        <SectionHeader>Input / Textarea / Select</SectionHeader>
        <Card className="space-y-3">
          <Input placeholder="Input — focus me (ink ring, not red)" />
          <Textarea rows={2} placeholder="Textarea" />
          <Select defaultValue="">
            <option value="" disabled>Select…</option>
            <option>Option A</option>
            <option>Option B</option>
          </Select>
          <Input disabled placeholder="Disabled input" />
        </Card>
      </section>

      {/* ── Badges ─────────────────────────────────────────────────────── */}
      <section>
        <SectionHeader>Badge / Status</SectionHeader>
        <Card>
          <div className="flex flex-wrap gap-2">
            <Badge status="ok">Done</Badge>
            <Badge status="warn">Pending</Badge>
            <Badge status="danger">Cancelled</Badge>
            <Badge status="neutral">Draft</Badge>
          </div>
        </Card>
      </section>

      {/* ── Segmented / Pill / ProgressBar ─────────────────────────────── */}
      <section>
        <SectionHeader>Segmented / Pill / ProgressBar</SectionHeader>
        <Card className="space-y-4">
          <Segmented
            value={segment}
            onChange={setSegment}
            options={[
              { value: 'a', label: 'Upcoming' },
              { value: 'b', label: 'Completed' },
              { value: 'c', label: 'All' },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <Pill selected={pillOn} onClick={() => setPillOn(!pillOn)}>Toggle pill</Pill>
            <Pill selected={!pillOn} onClick={() => setPillOn(!pillOn)}>Other option</Pill>
            <Pill disabled>Disabled</Pill>
          </div>
          <div className="space-y-2">
            <ProgressBar value={0.6} />
            <p className="text-xs text-ink-soft">6 of 10 done</p>
          </div>
        </Card>
      </section>

      {/* ── ListRow ────────────────────────────────────────────────────── */}
      <section>
        <SectionHeader action={<Badge status="neutral">3 rows</Badge>}>ListRow</SectionHeader>
        <Card flush>
          <div className="divide-y divide-line">
            <ListRow
              leading={<User size={18} />}
              label="Tappable row"
              sublabel="With sublabel and chevron"
              onClick={() => {}}
            />
            <ListRow
              leading={<MapPin size={18} />}
              label="Row with value"
              value="RM 1,250.00"
              onClick={() => {}}
            />
            <ListRow label="Static row (no chevron)" value="42" />
          </div>
        </Card>
      </section>

      {/* ── EmptyState ─────────────────────────────────────────────────── */}
      <section>
        <SectionHeader>EmptyState</SectionHeader>
        <Card flush>
          <EmptyState
            icon={Inbox}
            message="Nothing here yet."
            action={<Button size="sm" variant="secondary">Add item</Button>}
          />
        </Card>
      </section>

      {/* ── BottomSheet ────────────────────────────────────────────────── */}
      <section>
        <SectionHeader>BottomSheet</SectionHeader>
        <Card>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Open bottom sheet
          </Button>
        </Card>
      </section>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Sheet title">
        <div className="space-y-3 pb-2">
          <p className="text-sm text-ink-soft">
            Slides from the bottom on mobile with safe-area padding and a drag
            handle; centers as a dialog on desktop.
          </p>
          <Button className="w-full" onClick={() => setSheetOpen(false)}>Confirm action</Button>
          <Button className="w-full" variant="ghost" onClick={() => setSheetOpen(false)}>Cancel</Button>
        </div>
      </BottomSheet>
    </div>
  )
}
