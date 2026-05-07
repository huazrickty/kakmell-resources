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

// ── PDF generation ─────────────────────────────────────────────────────────

export function generateWeeklyPDF(
  weekStart: Date,
  weekEnd: Date,
  data: WeeklyEventEntry[],
): void {
  const pdf  = new jsPDF('p', 'mm', 'a4')
  const W    = 210
  const M    = 14
  const COL2 = M + 96   // right column start
  const LH   = 4.3      // base line height mm

  // ── Font helpers ──────────────────────────────────────────────────────────
  const bold = (sz: number) => { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(sz) }
  const reg  = (sz: number) => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(sz) }
  const c    = (hex: string) => pdf.setTextColor(hex)

  let y = M

  // ── Page header (reused on new pages) ─────────────────────────────────────
  function pageHeader() {
    bold(15)
    c('#1B4332')
    pdf.text('KAKMELL RESOURCES', M, y)

    bold(8.5)
    c('#6B7280')
    pdf.text('LAPORAN MINGGUAN', W - M, y, { align: 'right' })
    y += 5

    reg(8)
    c('#6B7280')
    pdf.text(fmtWeekRange(weekStart, weekEnd).toUpperCase(), W - M, y, { align: 'right' })
    y += 2

    // full-width hairline beneath brand
    pdf.setDrawColor('#1B4332')
    pdf.setLineWidth(0.5)
    pdf.line(M, y, W - M, y)
    y += 2
    // lighter rule below
    pdf.setDrawColor('#E5E7EB')
    pdf.setLineWidth(0.15)
    pdf.line(M, y, W - M, y)
    y += 5
  }

  pageHeader()

  // ── Empty state ────────────────────────────────────────────────────────────
  if (data.length === 0) {
    reg(9)
    c('#9CA3AF')
    pdf.text('Tiada acara dijumpai untuk minggu ini.', W / 2, y + 25, { align: 'center' })
  }

  // ── Events ─────────────────────────────────────────────────────────────────
  for (const { event, ingredients } of data) {
    const date = tsToDate(event.tarikh)
    const hasIngr = ingredients !== null

    // estimate block height (conservative)
    const blockH = hasIngr ? 76 : 20
    if (y + blockH > 272) {
      pdf.addPage()
      y = M
      pageHeader()
    }

    // ── Event name ──────────────────────────────────────────────────────────
    bold(10.5)
    c('#111827')
    pdf.text(event.nama_majlis.toUpperCase(), M, y)
    y += LH + 0.3

    // ── Meta row ────────────────────────────────────────────────────────────
    reg(7.5)
    c('#6B7280')
    const sesiStr = event.sesi === 'siang' ? 'Siang' : 'Malam'
    const bracketStr = hasIngr ? String(ingredients!.bracket) : `${event.pax} (custom)`
    const meta = `${event.hall_name}  ·  ${fmtDay(date)}  ·  ${sesiStr}  ·  ${event.pax} pax  →  kuantiti ${bracketStr}`
    pdf.text(meta, M, y)
    y += LH + 2

    if (hasIngr) {
      const { main, daging_box, dalca, acar } = ingredients!
      let lY = y
      let rY = y

      // ── LEFT column ──────────────────────────────────────────────────────

      bold(6)
      c('#1B4332')
      pdf.text('BAHAN UTAMA', M, lY)
      lY += 3.5

      const mainRows: [string, string][] = [
        ['Beras',          `${main.beras_bag} bag`],
        ['Ayam',           `${main.ayam_ekor} ekor`],
        ['Daging',         `${main.daging_kg} kg`],
        ['Paceri Nenas',   `${main.paceri_nenas_biji} biji`],
        ['Oren',           `${main.oren_biji} biji`],
        ['Gula',           `${main.gula_liter} L`],
      ]
      for (const [lbl, val] of mainRows) {
        reg(7.5); c('#9CA3AF'); pdf.text(lbl, M, lY)
        bold(7.5); c('#111827'); pdf.text(val, M + 30, lY)
        lY += LH
      }

      lY += 2.5
      bold(6); c('#1B4332')
      pdf.text('KOTAK DAGING', M, lY)
      lY += 3.5

      const dagRows: [string, string][] = [
        ['Slice',   `${daging_box.slice_boxes} kotak`],
        ['Trim',    '1 kotak'],
        ['Lebihan', `${daging_box.variance_kg} kg`],
      ]
      for (const [lbl, val] of dagRows) {
        reg(7.5); c('#9CA3AF'); pdf.text(lbl, M, lY)
        bold(7.5); c('#111827'); pdf.text(val, M + 30, lY)
        lY += LH
      }

      // ── RIGHT column ─────────────────────────────────────────────────────

      bold(6); c('#1B4332')
      pdf.text('DALCA', COL2, rY)
      rY += 3.5

      const dalcaRows: [string, string][] = [
        ['Kacang Dall',    dalca.kacang_dall],
        ['Terung',         dalca.terung],
        ['Kentang',        dalca.kentang],
        ['Karot',          dalca.karot ?? '—'],
        ['Kacang Panjang', dalca.kacang_panjang],
        ['Serbuk Kari',    dalca.serbuk_kari ?? '—'],
      ]
      for (const [lbl, val] of dalcaRows) {
        reg(7.5); c('#9CA3AF'); pdf.text(lbl, COL2, rY)
        bold(7.5); c('#111827'); pdf.text(val, COL2 + 34, rY)
        rY += LH
      }

      rY += 2.5
      bold(6); c('#1B4332')
      pdf.text('ACAR & PACERI', COL2, rY)
      rY += 3.5

      if (acar.timun_kg !== null) {
        reg(7.5); c('#9CA3AF'); pdf.text('Timun', COL2, rY)
        bold(7.5); c('#111827'); pdf.text(`${acar.timun_kg} kg`, COL2 + 34, rY)
        rY += LH
      }
      if (acar.nenas_biji !== null) {
        reg(7.5); c('#9CA3AF'); pdf.text('Nenas Acar', COL2, rY)
        bold(7.5); c('#111827'); pdf.text(`${acar.nenas_biji} biji`, COL2 + 34, rY)
        rY += LH
      }
      reg(7.5); c('#9CA3AF'); pdf.text('Paceri Nenas', COL2, rY)
      bold(7.5); c('#111827'); pdf.text(`${acar.paceri_nenas_biji} biji`, COL2 + 34, rY)
      rY += LH

      y = Math.max(lY, rY) + 3
    }

    // ── Menu selection ────────────────────────────────────────────────────
    const menuItems = Object.values(event.menu_selection).filter(Boolean)
    if (menuItems.length > 0) {
      bold(6); c('#1B4332')
      pdf.text('MENU', M, y)
      y += 3.5

      reg(7.5); c('#374151')
      const menuLine = menuItems.join('  ·  ')
      const wrapped = pdf.splitTextToSize(menuLine, W - M * 2)
      pdf.text(wrapped, M, y)
      y += wrapped.length * LH
    }

    // ── Event separator ───────────────────────────────────────────────────
    y += 3
    pdf.setDrawColor('#D1D5DB')
    pdf.setLineWidth(0.2)
    pdf.line(M, y, W - M, y)
    y += 6
  }

  // ── Footer on all pages ────────────────────────────────────────────────────
  const pages = pdf.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p)
    reg(6.5)
    c('#9CA3AF')
    pdf.text(`KAKMELL RESOURCES  ·  Dijana: ${fmtNow()}`, M, 290)
    pdf.text(`${p} / ${pages}`, W - M, 290, { align: 'right' })
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const iso = `${weekStart.getFullYear()}${String(weekStart.getMonth() + 1).padStart(2, '0')}${String(weekStart.getDate()).padStart(2, '0')}`
  pdf.save(`KAKMELL-Mingguan-${iso}.pdf`)
}
