import jsPDF from 'jspdf'

export interface InvoiceLineItem {
  description: string
  qty: number
  unit_price: number
  total: number
  is_deduction: boolean
}

export interface InvoiceDoc {
  id: string
  event_id: string
  invoice_no: string
  invoice_date: any
  billed_to: string
  line_items: InvoiceLineItem[]
  subtotal: number
  gaji_pekerja: number
  total: number
  status: 'draft' | 'sent' | 'paid'
  created_at: any
}

// ── Helpers ────────────────────────────────────────────────────────────────

export const fmtRM = (n: number): string =>
  'RM ' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export function tsToDate(ts: any): Date {
  if (!ts) return new Date()
  if (ts instanceof Date) return ts
  if (typeof ts.toDate === 'function') return ts.toDate()
  if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000)
  return new Date(ts)
}

function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function fillRgb(pdf: jsPDF, hex: string) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  pdf.setFillColor(r, g, b)
}

// ── PDF generation ─────────────────────────────────────────────────────────

export function generateInvoicePDF(invoice: InvoiceDoc, eventName: string): void {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const W = 210
  const M = 14

  const bold = (sz: number) => { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(sz) }
  const reg  = (sz: number) => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(sz) }
  const c    = (hex: string) => pdf.setTextColor(hex)

  const invDate = tsToDate(invoice.invoice_date)

  // ── Left: Company ─────────────────────────────────────────────────────────
  let y = M
  bold(14); c('#1B4332')
  pdf.text('KAKMELL RESOURCES', M, y)
  y += 5.5

  reg(7.5); c('#6B7280')
  pdf.text('NO 58, JALAN JAMBU 4, TAMAN KOTA MASAI,', M, y); y += 4
  pdf.text('81700 PASIR GUDANG, JOHOR', M, y); y += 4
  pdf.text('Phone: +6018-397 0769', M, y)

  // ── Right: Invoice details ─────────────────────────────────────────────────
  let ry = M
  bold(14); c('#111827')
  pdf.text('INVOICE', W - M, ry, { align: 'right' })
  ry += 5.5

  reg(7.5); c('#6B7280')
  pdf.text(`Date: ${fmtDate(invDate)}`, W - M, ry, { align: 'right' }); ry += 4
  pdf.text(`Invoice #: ${invoice.invoice_no}`, W - M, ry, { align: 'right' }); ry += 4
  pdf.text('Customer ID: CUST-001', W - M, ry, { align: 'right' })
  y = Math.max(y, ry) + 6

  // ── Green hairline ─────────────────────────────────────────────────────────
  pdf.setDrawColor('#1B4332'); pdf.setLineWidth(0.5)
  pdf.line(M, y, W - M, y); y += 5

  // ── Bill To ───────────────────────────────────────────────────────────────
  reg(7); c('#9CA3AF')
  pdf.text('BILL TO:', M, y); y += 4.5
  bold(9); c('#111827')
  pdf.text('ZB GROUP SDN BHD', M, y); y += 4.5
  reg(7.5); c('#6B7280')
  pdf.text(`Event: ${eventName}`, M, y); y += 9

  // ── Table header ──────────────────────────────────────────────────────────
  const ITEM_X = M
  const DESC_X = M + 12
  const QTY_X  = M + 115
  const UNIT_X = M + 130
  const TAX_X  = M + 158
  const TOT_X  = W - M

  fillRgb(pdf, '#111827')
  pdf.rect(M, y - 3.5, W - M * 2, 7.5, 'F')

  bold(7); pdf.setTextColor('#FFFFFF')
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
      fillRgb(pdf, '#F9FAFB')
      pdf.rect(M, y - 2.5, W - M * 2, 7, 'F')
    }
    reg(7.5)
    c('#9CA3AF'); pdf.text(String(i + 1), ITEM_X + 1, y + 1.5)
    c('#111827')
    const descText = pdf.splitTextToSize(li.description, 96)
    pdf.text(descText[0], DESC_X, y + 1.5)
    c('#6B7280'); pdf.text(String(li.qty), QTY_X, y + 1.5, { align: 'right' })
    c('#111827'); pdf.text(fmtRM(li.unit_price), UNIT_X, y + 1.5)
    c('#9CA3AF'); pdf.text('-', TAX_X, y + 1.5)
    c('#111827'); pdf.text(fmtRM(li.total), TOT_X, y + 1.5, { align: 'right' })
    y += 7
  }

  pdf.setDrawColor('#E5E7EB'); pdf.setLineWidth(0.2)
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
    reg(7.5); c('#6B7280'); pdf.text(lbl, TLX, y)
    c('#111827'); pdf.text(val, TVX, y, { align: 'right' })
    y += TH
  }
  if (invoice.gaji_pekerja > 0) {
    reg(7.5); c('#6B7280'); pdf.text('GAJI PEKERJA:', TLX, y)
    c('#DC2626'); pdf.text(`(${fmtRM(invoice.gaji_pekerja)})`, TVX, y, { align: 'right' })
    y += TH
  }

  pdf.setDrawColor('#D1D5DB'); pdf.setLineWidth(0.3)
  pdf.line(TLX, y, TVX, y); y += 4.5

  bold(9); c('#111827'); pdf.text('TOTAL:', TLX, y)
  bold(11); c('#1B4332'); pdf.text(fmtRM(invoice.total), TVX, y, { align: 'right' })

  // ── Footer ────────────────────────────────────────────────────────────────
  const footY = 268
  pdf.setDrawColor('#E5E7EB'); pdf.setLineWidth(0.2)
  pdf.line(M, footY, W - M, footY)

  let fy = footY + 5
  bold(8); c('#111827')
  pdf.text('Thank You For Your Business!', M, fy); fy += 5
  reg(7.5); c('#6B7280')
  pdf.text('If you have any questions about this invoice, please contact', M, fy); fy += 4.5
  pdf.text('NORMILA (018-3970769)', M, fy); fy += 4.5
  pdf.text('Make all checks payable to KAKMELL RESOURCES', M, fy)

  reg(6.5); c('#9CA3AF')
  pdf.text('Page 1 of 1', W - M, footY + 5, { align: 'right' })

  pdf.save(`${invoice.invoice_no}.pdf`)
}
