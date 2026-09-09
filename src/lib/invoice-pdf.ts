import jsPDF from 'jspdf'
import { tsToDate, fmtDateDMY } from './date-utils'
import {
  A4_PORTRAIT,
  PAGE_MARGIN,
  COLOR,
  COMPANY,
  fonts,
  drawLogo,
  drawCompanyAddress,
  drawFooterNote,
} from './pdf-common'

export interface InvoiceLineItem {
  description: string
  qty: number
  unit_price: number
  total: number
  is_deduction: boolean
}

export interface InvoiceDoc {
  id: string
  event_id: string | null
  invoice_no: string
  invoice_date: any
  billed_to: string
  line_items: InvoiceLineItem[]
  subtotal: number
  gaji_pekerja: number
  total: number
  status: 'draft' | 'sent' | 'paid'
  created_at: any
  type?: 'custom'
  reference?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

export const fmtRM = (n: number): string =>
  'RM ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export function fmtFilenameDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}${mm}${d.getFullYear()}`
}

export function sanitizePart(s: string): string {
  return s
    .replace(/^Majlis\s+/i, '')
    .replace(/\s+&\s+/g, '-')
    .replace(/\s+dan\s+/gi, '-')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function buildInvoiceFilename(
  params:
    | { type: 'regular'; hallName: string; eventDate: Date; sesi: string; eventName: string }
    | { type: 'custom';  billedTo?: string; reference?: string; date: Date }
): string {
  let name: string
  if (params.type === 'regular') {
    const hall    = sanitizePart(params.hallName.replace(/\bHall\b/gi, '').trim())
    const date    = fmtFilenameDate(params.eventDate)
    const session = params.sesi.toUpperCase()
    const event   = sanitizePart(params.eventName)
    name = `INV-${hall}_${date}_${session}_${event}`
  } else if (params.reference?.trim()) {
    const date = fmtFilenameDate(params.date)
    const ref  = sanitizePart(params.reference)
    name = `INV-${date}_${ref}`
  } else {
    const date   = fmtFilenameDate(params.date)
    const billed = sanitizePart(params.billedTo ?? '')
    name = `INV-${billed}_${date}`
  }
  if (name.length > 80) name = name.slice(0, 80).replace(/[_-]+$/, '')
  return `${name}.pdf`
}

// ── PDF generation ─────────────────────────────────────────────────────────

export async function generateInvoicePDF(
  invoice: InvoiceDoc,
  eventName: string,
  logoBase64: string,
  filename?: string,
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const W = A4_PORTRAIT.w
  const M = PAGE_MARGIN

  const { bold, reg } = fonts(pdf)

  const invDate = tsToDate(invoice.invoice_date)

  // ── Logo ──────────────────────────────────────────────────────────────────
  let y = M
  drawLogo(pdf, logoBase64, { x: M, y, w: 45, h: 15 })
  y += 18

  // ── Left: Company address ─────────────────────────────────────────────────
  y = drawCompanyAddress(pdf, M, y)

  // ── Right: Invoice details ─────────────────────────────────────────────────
  let ry = M + 2
  bold(14); pdf.setTextColor(...COLOR.ink)
  pdf.text('INVOICE', W - M, ry, { align: 'right' })
  ry += 5.5

  reg(7.5); pdf.setTextColor(...COLOR.gray)
  pdf.text(`Date: ${fmtDateDMY(invDate)}`, W - M, ry, { align: 'right' }); ry += 4
  pdf.text(`Invoice #: ${invoice.invoice_no}`, W - M, ry, { align: 'right' }); ry += 4
  pdf.text('Customer ID: CUST-001', W - M, ry, { align: 'right' })
  y = Math.max(y, ry) + 6

  // ── Red separator line (2pt) ──────────────────────────────────────────────
  pdf.setDrawColor(...COLOR.brandRed); pdf.setLineWidth(0.71)
  pdf.line(M, y, W - M, y); y += 5

  // ── Bill To ───────────────────────────────────────────────────────────────
  reg(7); pdf.setTextColor(...COLOR.grayLight)
  pdf.text('BILL TO:', M, y); y += 4.5
  bold(9); pdf.setTextColor(...COLOR.ink)
  pdf.text(invoice.billed_to, M, y); y += 4.5
  if (eventName) {
    reg(7.5); pdf.setTextColor(...COLOR.gray)
    pdf.text(`Event: ${eventName}`, M, y); y += 4.5
  }
  y += 4.5

  // ── Table header ──────────────────────────────────────────────────────────
  const ITEM_X = M
  const DESC_X = M + 12
  const QTY_X  = M + 115
  const UNIT_X = M + 130
  const TAX_X  = M + 158
  const TOT_X  = W - M

  pdf.setFillColor(...COLOR.ink)
  pdf.rect(M, y - 3.5, W - M * 2, 7.5, 'F')

  bold(7); pdf.setTextColor(...COLOR.white)
  pdf.text('ITEM#',       ITEM_X + 1, y + 1)
  pdf.text('DESCRIPTION', DESC_X,     y + 1)
  pdf.text('QTY',         QTY_X,      y + 1, { align: 'right' })
  pdf.text('UNIT PRICE',  UNIT_X,     y + 1)
  pdf.text('TAX',         TAX_X,      y + 1)
  pdf.text('TOTAL',       TOT_X,      y + 1, { align: 'right' })
  y += 7.5

  // ── Line items ────────────────────────────────────────────────────────────
  const items = invoice.line_items.filter(li => !li.is_deduction)
  for (let i = 0; i < items.length; i++) {
    const li = items[i]
    if (i % 2 === 0) {
      pdf.setFillColor(...COLOR.rowAlt)
      pdf.rect(M, y - 2.5, W - M * 2, 7, 'F')
    }
    reg(7.5)
    pdf.setTextColor(...COLOR.grayLight); pdf.text(String(i + 1), ITEM_X + 1, y + 1.5)
    pdf.setTextColor(...COLOR.ink)
    const descText = pdf.splitTextToSize(li.description, 96)
    pdf.text(descText[0], DESC_X, y + 1.5)
    pdf.setTextColor(...COLOR.gray); pdf.text(String(li.qty), QTY_X, y + 1.5, { align: 'right' })
    pdf.setTextColor(...COLOR.ink); pdf.text(fmtRM(li.unit_price), UNIT_X, y + 1.5)
    pdf.setTextColor(...COLOR.grayLight); pdf.text('-', TAX_X, y + 1.5)
    pdf.setTextColor(...COLOR.ink); pdf.text(fmtRM(li.total), TOT_X, y + 1.5, { align: 'right' })
    y += 7
  }

  pdf.setDrawColor(...COLOR.line); pdf.setLineWidth(0.2)
  pdf.line(M, y, W - M, y); y += 8

  // ── Totals ────────────────────────────────────────────────────────────────
  const TLX = W - M - 55
  const TVX = W - M
  const TH  = 5.5

  const totRows: [string, string][] = [
    ['SUBTOTAL:',  fmtRM(invoice.subtotal)],
    ['TAXABLE:',   '-'],
    ['TAX RATE:',  '0.000%'],
    ['TAX:',       '-'],
    ['S & H:',     '-'],
  ]
  for (const [lbl, val] of totRows) {
    reg(7.5); pdf.setTextColor(...COLOR.gray); pdf.text(lbl, TLX, y)
    pdf.setTextColor(...COLOR.ink); pdf.text(val, TVX, y, { align: 'right' })
    y += TH
  }
  if (invoice.gaji_pekerja > 0) {
    reg(7.5); pdf.setTextColor(...COLOR.gray); pdf.text('GAJI PEKERJA:', TLX, y)
    pdf.setTextColor(...COLOR.brandRed); pdf.text(`(${fmtRM(invoice.gaji_pekerja)})`, TVX, y, { align: 'right' })
    y += TH
  }

  pdf.setDrawColor(...COLOR.lineDark); pdf.setLineWidth(0.3)
  pdf.line(TLX, y, TVX, y); y += 4.5

  bold(9); pdf.setTextColor(...COLOR.ink); pdf.text('TOTAL:', TLX, y)
  bold(11); pdf.setTextColor(...COLOR.brandRed); pdf.text(fmtRM(invoice.total), TVX, y, { align: 'right' })

  // ── Footer ────────────────────────────────────────────────────────────────
  drawFooterNote(pdf, { y: 268, x: M, right: W - M, pageLabel: 'Page 1 of 1', lines: [
    { text: 'Thank You For Your Business!', bold: true, size: 8,   gapAfter: 5   },
    { text: COMPANY.name,                   bold: true, size: 7.5, gapAfter: 4.5 },
    { text: COMPANY.bankAccount,                        size: 7.5, gapAfter: 4.5 },
    { text: COMPANY.bankName,                           size: 7.5, gapAfter: 0   },
  ]})

  pdf.save(filename ?? `${invoice.invoice_no}.pdf`)
}
