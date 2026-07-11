import jsPDF from 'jspdf'
import type { IngredientResult } from './ingredient-calculator'
import { getHotDrinks, getColdDrinks, resolveMenuType, MENU_TYPE_LABELS_BM } from './menu-types'

export interface WeeklyEventEntry {
  event: {
    nama_majlis: string
    hall_name: string
    tarikh: any
    sesi: string
    pax: number
    menu_selection: Record<string, string | string[]>
    menu_type?: string
    selected_items?: string[]
    remarks?: string
    menu_tambahan?: string
  }
  ingredients: IngredientResult | null
}

// ── BM date helpers ────────────────────────────────────────────────────────

const BULAN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogs', 'Sep', 'Okt', 'Nov', 'Dis']
const HARI  = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu']

function tsToDate(ts: any): Date {
  if (!ts) return new Date()
  if (ts instanceof Date) return ts
  if (typeof ts.toDate === 'function') return ts.toDate()
  if (typeof ts === 'string') return new Date(ts)
  if (typeof ts._seconds === 'number') return new Date(ts._seconds * 1000)
  if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000)
  return new Date(ts)
}

function fmtDay(d: Date): string {
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
}

export function fmtWeekRange(start: Date, end: Date): string {
  if (start.getMonth() === end.getMonth())
    return `${start.getDate()} – ${end.getDate()} ${BULAN[start.getMonth()]} ${start.getFullYear()}`
  return `${start.getDate()} ${BULAN[start.getMonth()]} – ${end.getDate()} ${BULAN[end.getMonth()]} ${start.getFullYear()}`
}

function fmtNow(): string {
  const n = new Date()
  return `${n.getDate()} ${BULAN[n.getMonth()]} ${n.getFullYear()}, ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}

function fmtSagu(kg: number): string {
  return kg < 1 ? `${Math.round(kg * 1000)} g` : `${kg} kg`
}

// ── PDF generation ─────────────────────────────────────────────────────────
// Layout contract: EXACTLY 2 events per A4 page — top half + bottom half with a
// red divider. Odd count → last page renders top half only. Never reflows.

export async function generateWeeklyPDF(
  weekStart: Date,
  weekEnd: Date,
  data: WeeklyEventEntry[],
  logoBase64: string,
  reportTitle = 'LAPORAN MINGGUAN',
  exportType: 'all' | 'upcoming' | 'selected' = 'all',
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const W   = 210
  const MX  = 14                        // horizontal margin
  const MT  = 12                        // top margin
  const RED: [number, number, number] = [196, 32, 42]

  // Page layout (mm)
  const FOOTER_Y      = 285             // footer text baseline
  const EVENTS_END    = FOOTER_Y - 10   // 275 — bottom of events area
  const CONTENT_START = MT + 25         // 37  — top of events area (below page header)
  const EVENTS_AREA_H = EVENTS_END - CONTENT_START  // 238
  const RED_DIV_H     = 6               // 3mm gap + line + 3mm gap
  const EVENT_H       = (EVENTS_AREA_H - RED_DIV_H) / 2  // 116mm per event half

  // Row typography (compact — sized for the half-page block)
  const NAME_SZ   = 12
  const META_SZ   = 9
  const MAIN_SZ   = 10
  const QTY_SZ    = 11
  const BRANCH_SZ = 8.5
  const BVAL_SZ   = 9.5
  const MAIN_H    = 6     // mm per main-item row
  const BRANCH_H  = 4.5   // mm per branch row
  const NOTE_SZ   = 8
  const NOTE_H    = 3.6   // mm per note line

  const NUM_X    = MX
  const NAME_X   = MX + 8
  const BRANCH_X = MX + 14
  const VAL_X    = W - MX

  const bold = (sz: number) => { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(sz) }
  const reg  = (sz: number) => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(sz) }

  // Dotted leader between label and value — measured, never touches text.
  // x1 = end of label, x2 = start of value; drawn only if there is real room.
  function leaderDots(x1: number, x2: number, baselineY: number) {
    const start = x1 + 2.5
    const end   = x2 - 2.5
    if (end - start < 5) return
    pdf.setDrawColor(180, 180, 180)
    pdf.setLineWidth(0.2)
    pdf.setLineDashPattern([0.3, 1.1], 0)
    pdf.line(start, baselineY - 0.9, end, baselineY - 0.9)
    pdf.setLineDashPattern([], 0)
  }

  // ── Page header — always drawn; content starts at CONTENT_START ─────────
  function drawPageHeader(): void {
    pdf.addImage(logoBase64, 'PNG', MX, MT, 38, 13)
    bold(9)
    pdf.setTextColor(17, 24, 39)
    pdf.text(reportTitle, W - MX, MT + 5, { align: 'right' })
    reg(8)
    pdf.setTextColor(...RED)
    pdf.text(fmtWeekRange(weekStart, weekEnd).toUpperCase(), W - MX, MT + 10, { align: 'right' })
    pdf.setDrawColor(...RED)
    pdf.setLineWidth(0.71)
    pdf.line(MX, MT + 18, W - MX, MT + 18)
  }

  function drawPageFooter(pageNum: number | null, totalPages: number | null) {
    reg(9)
    pdf.setTextColor(156, 163, 175)
    pdf.text(`KAKMELL RESOURCES  ·  Dijana: ${fmtNow()}`, MX, FOOTER_Y)
    if (pageNum !== null && totalPages !== null) {
      bold(9)
      pdf.setTextColor(107, 114, 128)
      pdf.text(`Muka ${pageNum} daripada ${totalPages}`, W - MX, FOOTER_Y, { align: 'right' })
    }
  }

  // ── Notes (Catatan / Menu Tambahan) — guaranteed floor inside the block ──

  const NOTE_GAP = 1.0

  // Baseline floor the list must respect (checked at baseline level, so in
  // practice the full list still renders — see row guards). Sized so the
  // worst-case list end still leaves one baseline per present note before
  // the notes limit.
  function notesFloor(entry: WeeklyEventEntry['event']): number {
    let n = 0
    if (entry.remarks?.trim()) n++
    if (entry.menu_tambahan?.trim()) n++
    if (n === 0) return 0
    return n === 1 ? 3.5 : 8
  }

  // yNext is the block's next-row baseline position after the list.
  // notesLimit is the last allowed note baseline — slightly past the block's
  // maxY, using the structural gap before the divider / footer (never touching
  // either). Every present note is guaranteed at least 1 line.
  function drawNotes(entry: WeeklyEventEntry['event'], yNext: number, notesLimit: number): void {
    const notes: Array<[string, string]> = []
    if (entry.remarks?.trim())       notes.push(['Catatan', entry.remarks.trim()])
    if (entry.menu_tambahan?.trim()) notes.push(['Menu Tambahan', entry.menu_tambahan.trim()])
    if (notes.length === 0) return

    // Pull in closer than a full list-row step — 8pt lines need less lead
    let y = yNext - 1.5
    for (let i = 0; i < notes.length; i++) {
      if (y > notesLimit) return
      const [label, text] = notes[i]

      // Keep one baseline reserved for each note still to come
      const remainingMin = (notes.length - 1 - i) * (NOTE_H + NOTE_GAP)
      const availLines = Math.max(1, Math.min(2,
        Math.floor((notesLimit - y - remainingMin) / NOTE_H) + 1))

      bold(NOTE_SZ)
      const labelStr = `${label}: `
      const labelW = pdf.getTextWidth(labelStr)
      const textW = W - MX * 2 - labelW

      reg(NOTE_SZ)
      let lines = pdf.splitTextToSize(text, textW) as string[]
      if (lines.length > availLines) {
        lines = lines.slice(0, availLines)
        let last = lines[availLines - 1]
        while (last.length > 0 && pdf.getTextWidth(last + '…') > textW) {
          last = last.slice(0, -1)
        }
        lines[availLines - 1] = last + '…'
      }

      bold(NOTE_SZ)
      pdf.setTextColor(107, 114, 128)
      pdf.text(labelStr, MX, y)
      reg(NOTE_SZ)
      pdf.setTextColor(55, 65, 81)
      pdf.text(lines, MX + labelW, y)
      y += lines.length * NOTE_H + NOTE_GAP
    }
  }

  // ── Draw one event block (one half of a page) ────────────────────────────
  function drawEventBlock(entry: WeeklyEventEntry, startY: number, maxY: number, notesLimit: number): void {
    let y = startY
    const { event, ingredients } = entry
    const date     = tsToDate(event.tarikh)
    const menuType = resolveMenuType(event.menu_type)
    const isKahwin = menuType === 'kahwin'

    // ── Event name ──────────────────────────────────────────────────────
    bold(NAME_SZ)
    pdf.setTextColor(0, 0, 0)
    const nameLines = pdf.splitTextToSize(event.nama_majlis.toUpperCase(), W - MX * 2)
    pdf.text(nameLines, MX, y)
    y += nameLines.length * 5

    // ── Meta line ────────────────────────────────────────────────────────
    const sesiStr = event.sesi === 'siang' ? 'Siang' : 'Malam'
    reg(META_SZ)
    pdf.setTextColor(75, 85, 99)
    pdf.text(`${event.hall_name}  ·  ${fmtDay(date)}  ·  ${sesiStr}  ·  ${event.pax} pax`, MX, y)
    if (!isKahwin) {
      // Menu type badge text, right-aligned on the meta line
      bold(META_SZ)
      pdf.setTextColor(...RED)
      pdf.text(MENU_TYPE_LABELS_BM[menuType].toUpperCase(), VAL_X, y, { align: 'right' })
    }
    y += 4

    // ── Thin section separator ───────────────────────────────────────────
    pdf.setDrawColor(229, 231, 235)
    pdf.setLineWidth(0.4)
    pdf.line(MX, y, W - MX, y)
    y += 5

    let itemNum = 1

    // Original row guard (unchanged for no-notes events) plus a baseline-level
    // floor when notes exist. The floor (≤8mm) is looser than the old full-row
    // reserve, so any list that fit the approved layout still renders in full;
    // only a genuinely over-full block yields its last row to the notes.
    const floor = notesFloor(event)
    const rowFits = (rowH: number): boolean =>
      y + rowH <= maxY && y + floor <= maxY

    // Returns false when out of vertical room (caller stops drawing).
    const drawMainRow = (label: string, qty?: string): boolean => {
      if (!rowFits(MAIN_H)) return false
      bold(MAIN_SZ)
      pdf.setTextColor(0, 0, 0)
      pdf.text(`${itemNum}.`, NUM_X, y)
      const labelLines = pdf.splitTextToSize(label, VAL_X - NAME_X - (qty ? 30 : 4)) as string[]
      pdf.text(labelLines[0], NAME_X, y)
      if (qty) {
        const labelEnd = NAME_X + pdf.getTextWidth(labelLines[0])
        bold(QTY_SZ)
        pdf.text(qty, VAL_X, y, { align: 'right' })
        const valueStart = VAL_X - pdf.getTextWidth(qty)
        leaderDots(labelEnd, valueStart, y)
      }
      y += MAIN_H
      itemNum++
      return true
    }

    const drawBranchRow = (label: string, value: string): boolean => {
      if (!rowFits(BRANCH_H)) return false
      // Elbow marker drawn as vector lines — core helvetica has no └ glyph
      // (it renders as '%'), so the L-shape is stroked instead.
      pdf.setDrawColor(120, 120, 120)
      pdf.setLineWidth(0.3)
      pdf.line(BRANCH_X + 0.3, y - 2.6, BRANCH_X + 0.3, y - 0.7)
      pdf.line(BRANCH_X + 0.3, y - 0.7, BRANCH_X + 2.2, y - 0.7)
      reg(BRANCH_SZ)
      pdf.setTextColor(51, 51, 51)
      pdf.text(label, BRANCH_X + 3.5, y)
      const labelEnd = BRANCH_X + 3.5 + pdf.getTextWidth(label)
      bold(BVAL_SZ)
      pdf.setTextColor(17, 24, 39)
      pdf.text(value, VAL_X, y, { align: 'right' })
      const valueStart = VAL_X - pdf.getTextWidth(value)
      leaderDots(labelEnd, valueStart, y)
      y += BRANCH_H
      return true
    }

    // ── Non-kahwin: menu type + selected items list + notes, no ingredients ─
    if (!isKahwin) {
      const items = event.selected_items ?? []
      if (items.length === 0) {
        reg(9)
        pdf.setTextColor(156, 163, 175)
        pdf.text('Tiada item menu dipilih.', MX, y + 2)
        y += 8
      } else {
        for (const item of items) {
          if (!drawMainRow(item)) break
        }
      }
      drawNotes(event, y, notesLimit)
      return
    }

    // ── Kahwin without calculator result (pax > 1000) ────────────────────
    if (ingredients === null) {
      reg(10)
      pdf.setTextColor(156, 163, 175)
      if (y + 6 <= maxY) pdf.text('Pax melebihi 1,000 — hubungi pengurusan untuk kuantiti bahan.', MX, y + 2)
      y += 10
      drawNotes(event, y, notesLimit)
      return
    }

    // ── Kahwin: numbered ingredient list (dynamic numbering) ─────────────
    const menu = event.menu_selection
    const menuStr = (k: string) => (typeof menu[k] === 'string' ? (menu[k] as string) : '')
    const { main, daging_box, dalca, acar, bubur } = ingredients

    const done = (): void => { drawNotes(event, y, notesLimit) }

    // 1. Nasi / 2. Ayam / 3. Daging + branches
    if (!drawMainRow(menuStr('nasi') || 'Nasi', `${main.beras_bag} bag`)) return done()
    if (!drawMainRow(menuStr('ayam') || 'Ayam', `${main.ayam_ekor} ekor`)) return done()
    if (!drawMainRow(menuStr('daging') || 'Daging', `${main.daging_kg} kg`)) return done()
    drawBranchRow('Slice',    `${daging_box.slice_boxes} kotak`)
    drawBranchRow('Trimming', daging_box.trim_boxes === 0 ? '—' : `${daging_box.trim_boxes} kotak`)
    drawBranchRow('Lebihan',  `${daging_box.variance_kg > 0 ? '+' : ''}${daging_box.variance_kg} kg`)
    // Dalca
    if (!drawMainRow('Dalca')) return done()
    drawBranchRow('Kacang Dall', dalca.kacang_dall)
    drawBranchRow('Terung',      dalca.terung)
    drawBranchRow('Kentang',     dalca.kentang)
    drawBranchRow('Karot',       dalca.karot)
    // Acar
    const acarType = menuStr('acar') || 'Paceri Nenas'
    if (acarType === 'Pencuk') {
      if (!drawMainRow('Pencuk (Acar Jelatah)')) return done()
      if (acar.timun_kg !== null) drawBranchRow('Timun', `${acar.timun_kg} kg`)
      drawBranchRow('Nenas', `${acar.nenas_biji} biji`)
    } else {
      if (!drawMainRow('Paceri Nenas', `${acar.nenas_biji} biji`)) return done()
    }
    // Bubur
    const buburType = menuStr('bubur')
    if (buburType.includes('Pulut Hitam')) {
      const b = bubur.pulut_hitam
      if (!drawMainRow('Bubur Pulut Hitam')) return done()
      drawBranchRow('Pulut Hitam', `${b.beras_pulut_kg} kg`)
      drawBranchRow('Santan',      `${b.santan_kg} kg`)
      drawBranchRow('Sagu',        fmtSagu(b.sagu_kg))
    } else if (buburType.includes('Kacang Hijau')) {
      const b = bubur.kacang_hijau
      if (!drawMainRow('Bubur Kacang Hijau')) return done()
      drawBranchRow('Kacang Hijau', `${b.kacang_kg} kg`)
      drawBranchRow('Santan',       `${b.santan_kg} kg`)
      drawBranchRow('Sagu',         fmtSagu(b.sagu_kg))
    } else if (buburType.includes('Jagung')) {
      const b = bubur.jagung
      if (!drawMainRow('Bubur Jagung')) return done()
      drawBranchRow('Jagung',  `${b.beras_kg} kg (${b.beg} beg)`)
      drawBranchRow('Santan',  `${b.santan_kg} kg`)
      drawBranchRow('Sagu',    fmtSagu(b.sagu_kg))
    }
    // Air — hot + cold combined (legacy air_panas falls back via helpers)
    const drinkMenu = menu as { hot_drinks?: string[]; cold_drinks?: string[]; air_panas?: string }
    const drinks = [...getHotDrinks(drinkMenu), ...getColdDrinks(drinkMenu)]
    if (drinks.length > 0 && !drawMainRow(drinks.join(' · '))) return done()
    // Buah Oren / Air Gula
    if (!drawMainRow('Buah Oren', `${main.oren_biji} biji`)) return done()
    drawMainRow('Air Gula', `${main.gula_liter} L`)

    done()
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (data.length === 0) {
    drawPageHeader()
    reg(14)
    pdf.setTextColor(156, 163, 175)
    pdf.text('Tiada acara dijumpai untuk minggu ini.', W / 2, CONTENT_START + 40, { align: 'center' })
    drawPageFooter(null, null)
    const iso = `${weekStart.getFullYear()}${String(weekStart.getMonth() + 1).padStart(2, '0')}${String(weekStart.getDate()).padStart(2, '0')}`
    pdf.save(`KAKMELL-Mingguan-${iso}.pdf`)
    return
  }

  // ── Cover page (only for 'all' exports with 2+ events) ──────────────────
  if (exportType === 'all' && data.length >= 2) {
    drawPageHeader()
    let y = CONTENT_START + 5

    bold(26)
    pdf.setTextColor(17, 24, 39)
    const titleLines = pdf.splitTextToSize(reportTitle, W - MX * 2)
    pdf.text(titleLines, MX, y)
    y += titleLines.length * 11

    reg(14)
    pdf.setTextColor(...RED)
    pdf.text(fmtWeekRange(weekStart, weekEnd).toUpperCase(), MX, y)
    y += 10

    pdf.setDrawColor(229, 231, 235)
    pdf.setLineWidth(0.3)
    pdf.line(MX, y, W - MX, y)
    y += 10

    bold(9)
    pdf.setTextColor(107, 114, 128)
    pdf.text(`${data.length} ACARA`, MX, y)
    y += 9

    for (let i = 0; i < data.length; i++) {
      const { event } = data[i]
      const d = tsToDate(event.tarikh)

      bold(13)
      pdf.setTextColor(17, 24, 39)
      pdf.text(`${i + 1}.`, MX, y)
      pdf.text(event.nama_majlis, MX + 8, y)
      y += 6.5

      reg(10)
      pdf.setTextColor(107, 114, 128)
      pdf.text(
        `    ${event.hall_name}  ·  ${fmtDay(d)}  ·  ${event.sesi === 'siang' ? 'Siang' : 'Malam'}  ·  ${event.pax} pax`,
        MX, y,
      )
      y += 9
    }

    drawPageFooter(null, null)
    pdf.addPage()
  }

  // ── Pair events: 2 per page ───────────────────────────────────────────────
  const pairs: WeeklyEventEntry[][] = []
  for (let i = 0; i < data.length; i += 2) pairs.push(data.slice(i, i + 2))
  const totalPages = pairs.length

  for (let pi = 0; pi < pairs.length; pi++) {
    if (pi > 0) pdf.addPage()

    drawPageHeader()
    const pair = pairs[pi]

    const event1End   = CONTENT_START + EVENT_H   // 153
    const dividerY    = event1End + 3             // 156
    const event2Start = dividerY + 5              // 161
    const event2End   = event2Start + EVENT_H     // 277

    // Top half (odd last event lives here alone — bottom stays empty).
    // Notes may run 1.5mm into the pre-divider gap; never touch the divider.
    drawEventBlock(pair[0], CONTENT_START, event1End, event1End + 1.5)

    if (pair.length === 2) {
      // Red divider between events
      pdf.setDrawColor(...RED)
      pdf.setLineWidth(1.5)
      pdf.line(MX, dividerY, W - MX, dividerY)

      // Bottom half: notes may use the slack above the footer (baseline ≤ 281)
      drawEventBlock(pair[1], event2Start, event2End, event2End + 4)
    }

    drawPageFooter(pi + 1, totalPages)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const iso = `${weekStart.getFullYear()}${String(weekStart.getMonth() + 1).padStart(2, '0')}${String(weekStart.getDate()).padStart(2, '0')}`
  pdf.save(`KAKMELL-Mingguan-${iso}.pdf`)
}
