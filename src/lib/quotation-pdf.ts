import jsPDF from 'jspdf'
import {
  A4_PORTRAIT, PAGE_MARGIN, COLOR, COMPANY,
  fonts, drawLogo, drawCompanyAddress, drawFooterNote,
} from './pdf-common'
import { tsToDate, fmtDateDMY } from './date-utils'
import { fmtRM } from './invoice-pdf'
import type { QuotationDoc } from './quotations'

// ── Layout constants (A4 portrait, same margins as the invoice) ────────────
const W = A4_PORTRAIT.w
const M = PAGE_MARGIN

const ITEM_X = M
const DESC_X = M + 12
const DESC_W = 106            // no TAX column → wider description
const QTY_X  = M + 125
const UNIT_X = M + 140
const TOT_X  = W - M

const ROW_LINE_H  = 4.2       // extra height per wrapped description line
const ROW_BASE_H  = 7
const PAGE_BREAK_Y = 236      // start a new page when a row would pass this
const FOOTER_Y    = 250
const SIGN_Y      = 268

/**
 * Quotation (Sebut Harga) PDF. Full breakdown, customer block from the
 * document, NO bank details, NO staff-wage deduction. Multi-page safe.
 */
export async function generateQuotationPDF(
  q: QuotationDoc,
  logoBase64: string,
  filename?: string,
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const { bold, reg } = fonts(pdf)
  const TOTAL_PAGES = '{total_pages_count_string}'

  const qDate = tsToDate(q.quotation_date)
  const valid = tsToDate(q.valid_until)

  // ── Header (page 1 only) ─────────────────────────────────────────────────
  let y = M
  drawLogo(pdf, logoBase64, { x: M, y, w: 45, h: 15 })
  y = drawCompanyAddress(pdf, M, y + 18)

  let ry = M + 2
  bold(14); pdf.setTextColor(...COLOR.ink)
  pdf.text('SEBUT HARGA', W - M, ry, { align: 'right' }); ry += 5
  reg(8); pdf.setTextColor(...COLOR.grayLight)
  pdf.text('QUOTATION', W - M, ry, { align: 'right' }); ry += 5.5
  reg(7.5); pdf.setTextColor(...COLOR.gray)
  pdf.text(`Tarikh: ${fmtDateDMY(qDate)}`, W - M, ry, { align: 'right' }); ry += 4
  pdf.text(`No.: ${q.quotation_no}`, W - M, ry, { align: 'right' }); ry += 4
  pdf.text(`Sah sehingga: ${fmtDateDMY(valid)}`, W - M, ry, { align: 'right' })
  y = Math.max(y, ry) + 6

  pdf.setDrawColor(...COLOR.brandRed); pdf.setLineWidth(0.71)
  pdf.line(M, y, W - M, y); y += 5

  // ── Customer block ───────────────────────────────────────────────────────
  reg(7); pdf.setTextColor(...COLOR.grayLight)
  pdf.text('KEPADA / TO:', M, y); y += 4.5
  bold(9); pdf.setTextColor(...COLOR.ink)
  pdf.text(q.customer.name, M, y); y += 4.5
  reg(7.5); pdf.setTextColor(...COLOR.gray)
  if (q.customer.phone) { pdf.text(q.customer.phone, M, y); y += 4 }
  if (q.customer.address) {
    for (const line of pdf.splitTextToSize(q.customer.address, 90) as string[]) {
      pdf.text(line, M, y); y += 4
    }
  }
  if (q.event_name) {
    pdf.text(`Acara: ${q.event_name}${q.pax ? ` — ${q.pax} pax` : ''}`, M, y); y += 4
  }
  y += 4

  // ── Table ────────────────────────────────────────────────────────────────
  function drawTableHeader(): void {
    pdf.setFillColor(...COLOR.ink)
    pdf.rect(M, y - 3.5, W - M * 2, 7.5, 'F')
    bold(7); pdf.setTextColor(...COLOR.white)
    pdf.text('ITEM#',       ITEM_X + 1, y + 1)
    pdf.text('DESCRIPTION', DESC_X,     y + 1)
    pdf.text('QTY',         QTY_X,      y + 1, { align: 'right' })
    pdf.text('UNIT PRICE',  UNIT_X,     y + 1)
    pdf.text('TOTAL',       TOT_X,      y + 1, { align: 'right' })
    y += 7.5
  }

  function newPage(): void {
    pdf.addPage()
    y = M
    drawTableHeader()
  }

  drawTableHeader()

  const items = q.line_items.filter(li => !li.is_deduction)
  for (let i = 0; i < items.length; i++) {
    const li = items[i]
    reg(7.5)
    const lines = pdf.splitTextToSize(li.description, DESC_W) as string[]
    const rowH = ROW_BASE_H + Math.max(0, lines.length - 1) * ROW_LINE_H
    if (y + rowH > PAGE_BREAK_Y) newPage()

    if (i % 2 === 0) {
      pdf.setFillColor(...COLOR.rowAlt)
      pdf.rect(M, y - 2.5, W - M * 2, rowH, 'F')
    }
    pdf.setTextColor(...COLOR.grayLight); pdf.text(String(i + 1), ITEM_X + 1, y + 1.5)
    pdf.setTextColor(...COLOR.ink)
    lines.forEach((ln, k) => pdf.text(ln, DESC_X, y + 1.5 + k * ROW_LINE_H))
    pdf.setTextColor(...COLOR.gray); pdf.text(String(li.qty), QTY_X, y + 1.5, { align: 'right' })
    pdf.setTextColor(...COLOR.ink); pdf.text(fmtRM(li.unit_price), UNIT_X, y + 1.5)
    pdf.text(fmtRM(li.total), TOT_X, y + 1.5, { align: 'right' })
    y += rowH
  }

  pdf.setDrawColor(...COLOR.line); pdf.setLineWidth(0.2)
  pdf.line(M, y, W - M, y); y += 8

  // ── Totals (keep together with footer on the last page) ──────────────────
  const discount = q.discount ?? 0
  const totalsH = 5.5 * (discount > 0 ? 2 : 1) + 4.5 + 6
  const notesLines = q.notes ? (pdf.splitTextToSize(q.notes, 120) as string[]) : []
  const notesH = notesLines.length ? 6 + notesLines.length * 4 : 0
  if (y + totalsH + notesH > FOOTER_Y - 6) { pdf.addPage(); y = M }

  const TLX = W - M - 55
  const TVX = W - M
  reg(7.5); pdf.setTextColor(...COLOR.gray); pdf.text('SUBTOTAL:', TLX, y)
  pdf.setTextColor(...COLOR.ink); pdf.text(fmtRM(q.subtotal), TVX, y, { align: 'right' }); y += 5.5
  if (discount > 0) {
    reg(7.5); pdf.setTextColor(...COLOR.gray); pdf.text('DISKAUN:', TLX, y)
    pdf.setTextColor(...COLOR.brandRed); pdf.text(`(${fmtRM(discount)})`, TVX, y, { align: 'right' }); y += 5.5
  }
  pdf.setDrawColor(...COLOR.lineDark); pdf.setLineWidth(0.3)
  pdf.line(TLX, y, TVX, y); y += 4.5
  bold(9); pdf.setTextColor(...COLOR.ink); pdf.text('JUMLAH / TOTAL:', TLX, y)
  bold(11); pdf.setTextColor(...COLOR.brandRed); pdf.text(fmtRM(q.total), TVX, y, { align: 'right' })
  y += 6

  // ── Notes ────────────────────────────────────────────────────────────────
  if (notesLines.length) {
    y += 2
    bold(7.5); pdf.setTextColor(...COLOR.ink); pdf.text('Catatan:', M, y); y += 4
    reg(7.5); pdf.setTextColor(...COLOR.gray)
    for (const ln of notesLines) { pdf.text(ln, M, y); y += 4 }
  }

  // ── Footer + signature (last page) ───────────────────────────────────────
  drawFooterNote(pdf, {
    y: FOOTER_Y, x: M, right: W - M,
    lines: [
      { text: `Sah sehingga ${fmtDateDMY(valid)}`,           bold: true, size: 8,   gapAfter: 4.5 },
      { text: 'Harga tertakluk pada perubahan tanpa notis.',            size: 7.5, gapAfter: 4.5 },
      { text: 'Sebut harga ini bukan invois.',                           size: 7.5, gapAfter: 0   },
    ],
  })

  const half = (W - M * 2) / 2
  pdf.setDrawColor(...COLOR.lineDark); pdf.setLineWidth(0.3)
  pdf.line(M, SIGN_Y + 8, M + half - 8, SIGN_Y + 8)
  pdf.line(M + half + 8, SIGN_Y + 8, W - M, SIGN_Y + 8)
  reg(7); pdf.setTextColor(...COLOR.gray)
  pdf.text('Disediakan oleh:', M, SIGN_Y)
  pdf.text('Diterima oleh:', M + half + 8, SIGN_Y)
  reg(6.5); pdf.setTextColor(...COLOR.grayLight)
  pdf.text(COMPANY.name, M, SIGN_Y + 12)
  pdf.text('Nama / Tarikh', M + half + 8, SIGN_Y + 12)

  // ── Page labels on every page ─────────────────────────────────────────────
  const pages = pdf.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p)
    reg(6.5); pdf.setTextColor(...COLOR.grayLight)
    // core Helvetica has no "·" glyph — keep to ASCII
    pdf.text(`${q.quotation_no}  -  Page ${p} of ${TOTAL_PAGES}`, W - M, A4_PORTRAIT.h - 8, { align: 'right' })
  }
  pdf.putTotalPages(TOTAL_PAGES)

  pdf.save(filename ?? `${q.quotation_no}.pdf`)
}
