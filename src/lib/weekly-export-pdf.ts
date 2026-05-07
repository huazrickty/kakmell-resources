import jsPDF from 'jspdf'
import type { IngredientResult } from './ingredient-calculator'

export interface WeeklyEventEntry {
  event: {
    nama_majlis: string
    hall_name: string
    tarikh: any
    sesi: string
    pax: number
    menu_selection: Record<string, string>
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

function getBuburRows(bubur: string): [string, string][] {
  if (!bubur) return []
  if (bubur.includes('Pulut Hitam'))  return [['Pulut Hitam', '2 kg'], ['Santan', '1 tin']]
  if (bubur.includes('Kacang Hijau')) return [['Kacang Hijau', '2 kg'], ['Santan', '1 tin']]
  if (bubur.includes('Jagung'))       return [['Jagung', '2 beg (4 kg)'], ['Santan', '2 kotak']]
  return []
}

// ── PDF generation ─────────────────────────────────────────────────────────

export async function generateWeeklyPDF(
  weekStart: Date,
  weekEnd: Date,
  data: WeeklyEventEntry[],
  logoBase64: string,
  reportTitle = 'LAPORAN MINGGUAN',
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const W   = 210
  const M   = 14

  // Column layout
  const COL1  = M        // left label x
  const COL1V = M + 44   // left value x
  const COL_DIV = M + 91 // vertical divider x
  const COL2  = M + 95   // right label x
  const COL2V = M + 95 + 44  // right value x (= 153)

  const ROW_H   = 8   // ingredient row height mm
  const SEC_GAP = 7   // gap between sections mm
  const RED: [number, number, number] = [196, 32, 42]

  const bold = (sz: number) => { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(sz) }
  const reg  = (sz: number) => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(sz) }

  // ── Page header — returns y of content start ───────────────────────────
  function drawHeader(): number {
    const y = M
    pdf.addImage(logoBase64, 'PNG', M, y, 38, 13)
    bold(9)
    pdf.setTextColor(17, 24, 39)
    pdf.text(reportTitle, W - M, y + 5, { align: 'right' })
    reg(8)
    pdf.setTextColor(...RED)
    pdf.text(fmtWeekRange(weekStart, weekEnd).toUpperCase(), W - M, y + 10, { align: 'right' })
    const lineY = y + 16
    pdf.setDrawColor(...RED)
    pdf.setLineWidth(0.71)
    pdf.line(M, lineY, W - M, lineY)
    return lineY + 7  // content start
  }

  // ── Section header — returns next y ────────────────────────────────────
  function sectionHead(text: string, x: number, y: number): number {
    bold(12)
    pdf.setTextColor(...RED)
    pdf.text(text, x, y)
    return y + 7
  }

  // ── Ingredient row — returns next y ────────────────────────────────────
  function ingRow(label: string, value: string, lx: number, vx: number, y: number): number {
    reg(12)
    pdf.setTextColor(28, 25, 23)
    pdf.text(label, lx, y)
    bold(14)
    pdf.setTextColor(17, 24, 39)
    pdf.text(value, vx, y)
    return y + ROW_H
  }

  // ── Page footer ─────────────────────────────────────────────────────────
  function drawFooter(majlisNo: number | null, total: number | null) {
    reg(9)
    pdf.setTextColor(156, 163, 175)
    pdf.text(`KAKMELL RESOURCES  ·  Dijana: ${fmtNow()}`, M, 285)
    if (majlisNo !== null && total !== null) {
      bold(9)
      pdf.setTextColor(107, 114, 128)
      pdf.text(`Majlis ${majlisNo} daripada ${total}`, W - M, 285, { align: 'right' })
    }
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (data.length === 0) {
    const y = drawHeader()
    reg(14)
    pdf.setTextColor(156, 163, 175)
    pdf.text('Tiada acara dijumpai untuk minggu ini.', W / 2, y + 40, { align: 'center' })
    drawFooter(null, null)
    const iso = `${weekStart.getFullYear()}${String(weekStart.getMonth() + 1).padStart(2, '0')}${String(weekStart.getDate()).padStart(2, '0')}`
    pdf.save(`KAKMELL-Mingguan-${iso}.pdf`)
    return
  }

  // ── Cover page (when >1 event) ───────────────────────────────────────────
  if (data.length > 1) {
    let y = drawHeader()

    y += 12
    bold(26)
    pdf.setTextColor(17, 24, 39)
    const titleLines = pdf.splitTextToSize(reportTitle, W - M * 2)
    pdf.text(titleLines, M, y)
    y += titleLines.length * 11

    reg(14)
    pdf.setTextColor(...RED)
    pdf.text(fmtWeekRange(weekStart, weekEnd).toUpperCase(), M, y)
    y += 10

    pdf.setDrawColor(229, 231, 235)
    pdf.setLineWidth(0.3)
    pdf.line(M, y, W - M, y)
    y += 10

    bold(9)
    pdf.setTextColor(107, 114, 128)
    pdf.text(`${data.length} ACARA`, M, y)
    y += 9

    for (let i = 0; i < data.length; i++) {
      const { event } = data[i]
      const d = tsToDate(event.tarikh)

      bold(13)
      pdf.setTextColor(17, 24, 39)
      pdf.text(`${i + 1}.`, M, y)
      pdf.text(event.nama_majlis, M + 8, y)
      y += 6.5

      reg(10)
      pdf.setTextColor(107, 114, 128)
      pdf.text(
        `    ${event.hall_name}  ·  ${fmtDay(d)}  ·  ${event.sesi === 'siang' ? 'Siang' : 'Malam'}  ·  ${event.pax} pax`,
        M, y,
      )
      y += 9
    }

    drawFooter(null, null)
    pdf.addPage()
  }

  // ── One page per event ───────────────────────────────────────────────────
  for (let ei = 0; ei < data.length; ei++) {
    if (ei > 0) pdf.addPage()

    let y = drawHeader()
    const { event, ingredients } = data[ei]
    const date    = tsToDate(event.tarikh)
    const hasIngr = ingredients !== null

    // Event name
    y += 5
    bold(22)
    pdf.setTextColor(0, 0, 0)
    const nameLines = pdf.splitTextToSize(event.nama_majlis.toUpperCase(), W - M * 2)
    pdf.text(nameLines, M, y)
    y += nameLines.length * 9.5

    // Meta
    reg(13)
    pdf.setTextColor(75, 85, 99)
    pdf.text(`${event.hall_name}  ·  ${fmtDay(date)}  ·  ${event.sesi === 'siang' ? 'Siang' : 'Malam'}`, M, y)
    y += 7

    bold(13)
    pdf.setTextColor(17, 24, 39)
    const bracketStr = hasIngr ? `(Bracket ${ingredients!.bracket})` : '(Pax custom > 1,000)'
    pdf.text(`${event.pax} pax  ${bracketStr}`, M, y)
    y += 10

    // Section divider
    pdf.setDrawColor(229, 231, 235)
    pdf.setLineWidth(0.4)
    pdf.line(M, y, W - M, y)
    y += 8

    if (hasIngr) {
      const { main, daging_box, dalca, acar } = ingredients!
      const colStartY = y
      let lY = y
      let rY = y

      // ── LEFT: BAHAN UTAMA ──────────────────────────────────────────────
      lY = sectionHead('BAHAN UTAMA', COL1, lY)
      const mainRows: [string, string][] = [
        ['Beras',        `${main.beras_bag} bag`],
        ['Ayam',         `${main.ayam_ekor} ekor`],
        ['Daging',       `${main.daging_kg} kg`],
        ['Paceri Nenas', `${main.paceri_nenas_biji} biji`],
        ['Oren',         `${main.oren_biji} biji`],
        ['Gula',         `${main.gula_liter} L`],
      ]
      for (const [l, v] of mainRows) lY = ingRow(l, v, COL1, COL1V, lY)

      lY += SEC_GAP
      lY = sectionHead('KOTAK DAGING', COL1, lY)
      const dagRows: [string, string][] = [
        ['Slice',   `${daging_box.slice_boxes} kotak`],
        ['Trim',    '1 kotak'],
        ['Lebihan', `${daging_box.variance_kg} kg`],
      ]
      for (const [l, v] of dagRows) lY = ingRow(l, v, COL1, COL1V, lY)

      // ── RIGHT: DALCA ───────────────────────────────────────────────────
      rY = sectionHead('DALCA', COL2, rY)
      const dalcaRows: [string, string][] = [
        ['Kacang Dall',    dalca.kacang_dall],
        ['Terung',         dalca.terung],
        ['Kentang',        dalca.kentang],
        ['Karot',          dalca.karot ?? '—'],
        ['Kacang Panjang', dalca.kacang_panjang],
        ['Serbuk Kari',    dalca.serbuk_kari ?? '—'],
      ]
      for (const [l, v] of dalcaRows) rY = ingRow(l, v, COL2, COL2V, rY)

      // ── RIGHT: BUBUR (if selected) ─────────────────────────────────────
      const buburName = event.menu_selection['bubur'] ?? ''
      const buburRows = getBuburRows(buburName)
      if (buburRows.length > 0) {
        rY += SEC_GAP
        const buburLabel = buburName ? `BUBUR — ${buburName.replace('Bubur ', '')}` : 'BUBUR'
        rY = sectionHead(buburLabel, COL2, rY)
        for (const [l, v] of buburRows) rY = ingRow(l, v, COL2, COL2V, rY)
      }

      // ── RIGHT: ACAR & PACERI ───────────────────────────────────────────
      const acarMenuType = event.menu_selection['acar'] ?? ''
      rY += SEC_GAP
      rY = sectionHead(acarMenuType === 'Pencuk' ? 'PENCUK (ACAR JELATAH)' : 'PACERI NENAS', COL2, rY)
      if (acar.timun_kg !== null) rY = ingRow('Timun', `${acar.timun_kg} kg`,  COL2, COL2V, rY)
      rY = ingRow('Nenas', `${acar.nenas_biji} biji`, COL2, COL2V, rY)

      // Vertical column divider
      const colBottom = Math.max(lY, rY) + 2
      pdf.setDrawColor(229, 231, 235)
      pdf.setLineWidth(0.25)
      pdf.line(COL_DIV, colStartY - 4, COL_DIV, colBottom)

      y = colBottom + 6
    } else {
      reg(12)
      pdf.setTextColor(156, 163, 175)
      pdf.text('Pax melebihi 1,000 — hubungi pengurusan untuk kuantiti bahan.', M, y)
      y += 18
    }

    // ── Menu section ───────────────────────────────────────────────────────
    pdf.setDrawColor(229, 231, 235)
    pdf.setLineWidth(0.3)
    pdf.line(M, y, W - M, y)
    y += 7

    const menuItems = Object.values(event.menu_selection).filter(Boolean)
    if (menuItems.length > 0) {
      bold(12)
      pdf.setTextColor(...RED)
      pdf.text('MENU', M, y)
      y += 7

      reg(12)
      pdf.setTextColor(17, 24, 39)
      const menuLine = menuItems.join('  ·  ')
      const wrapped = pdf.splitTextToSize(menuLine, W - M * 2)
      pdf.text(wrapped, M, y)
    }

    drawFooter(ei + 1, data.length)
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const iso = `${weekStart.getFullYear()}${String(weekStart.getMonth() + 1).padStart(2, '0')}${String(weekStart.getDate()).padStart(2, '0')}`
  pdf.save(`KAKMELL-Mingguan-${iso}.pdf`)
}
