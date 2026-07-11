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

function fmtFilenameDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}${mm}${d.getFullYear()}`
}

function sanitizePart(s: string): string {
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

export function getLogoBase64(): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = '/logo.png'
  })
}

// ── PDF generation ─────────────────────────────────────────────────────────

export async function generateInvoicePDF(
  invoice: InvoiceDoc,
  eventName: string,
  logoBase64: string,
  filename?: string,
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const W = 210
  const M = 14

  const bold = (sz: number) => { pdf.setFont('helvetica', 'bold'); pdf.setFontSize(sz) }
  const reg  = (sz: number) => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(sz) }

  const invDate = tsToDate(invoice.invoice_date)

  // ── Logo ──────────────────────────────────────────────────────────────────
  let y = M
  pdf.addImage(logoBase64, 'PNG', M, y, 45, 15)
  y += 18

  // ── Left: Company address ─────────────────────────────────────────────────
  reg(7.5); pdf.setTextColor(107, 114, 128)
  pdf.text('NO 58, JALAN JAMBU 4, TAMAN KOTA MASAI,', M, y); y += 4
  pdf.text('81700 PASIR GUDANG, JOHOR', M, y); y += 4
  pdf.text('Phone: +6018-397 0769', M, y)

  // ── Right: Invoice details ─────────────────────────────────────────────────
  let ry = M + 2
  bold(14); pdf.setTextColor(17, 24, 39)
  pdf.text('INVOICE', W - M, ry, { align: 'right' })
  ry += 5.5

  reg(7.5); pdf.setTextColor(107, 114, 128)
  pdf.text(`Date: ${fmtDate(invDate)}`, W - M, ry, { align: 'right' }); ry += 4
  pdf.text(`Invoice #: ${invoice.invoice_no}`, W - M, ry, { align: 'right' }); ry += 4
  pdf.text('Customer ID: CUST-001', W - M, ry, { align: 'right' })
  y = Math.max(y, ry) + 6

  // ── Red separator line (2pt) ──────────────────────────────────────────────
  pdf.setDrawColor(196, 32, 42); pdf.setLineWidth(0.71)
  pdf.line(M, y, W - M, y); y += 5

  // ── Bill To ───────────────────────────────────────────────────────────────
  reg(7); pdf.setTextColor(156, 163, 175)
  pdf.text('BILL TO:', M, y); y += 4.5
  bold(9); pdf.setTextColor(17, 24, 39)
  pdf.text(invoice.billed_to, M, y); y += 4.5
  if (eventName) {
    reg(7.5); pdf.setTextColor(107, 114, 128)
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

  pdf.setFillColor(17, 24, 39)
  pdf.rect(M, y - 3.5, W - M * 2, 7.5, 'F')

  bold(7); pdf.setTextColor(255, 255, 255)
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
      pdf.setFillColor(249, 249, 249)
      pdf.rect(M, y - 2.5, W - M * 2, 7, 'F')
    }
    reg(7.5)
    pdf.setTextColor(156, 163, 175); pdf.text(String(i + 1), ITEM_X + 1, y + 1.5)
    pdf.setTextColor(17, 24, 39)
    const descText = pdf.splitTextToSize(li.description, 96)
    pdf.text(descText[0], DESC_X, y + 1.5)
    pdf.setTextColor(107, 114, 128); pdf.text(String(li.qty), QTY_X, y + 1.5, { align: 'right' })
    pdf.setTextColor(17, 24, 39); pdf.text(fmtRM(li.unit_price), UNIT_X, y + 1.5)
    pdf.setTextColor(156, 163, 175); pdf.text('-', TAX_X, y + 1.5)
    pdf.setTextColor(17, 24, 39); pdf.text(fmtRM(li.total), TOT_X, y + 1.5, { align: 'right' })
    y += 7
  }

  pdf.setDrawColor(229, 231, 235); pdf.setLineWidth(0.2)
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
    reg(7.5); pdf.setTextColor(107, 114, 128); pdf.text(lbl, TLX, y)
    pdf.setTextColor(17, 24, 39); pdf.text(val, TVX, y, { align: 'right' })
    y += TH
  }
  if (invoice.gaji_pekerja > 0) {
    reg(7.5); pdf.setTextColor(107, 114, 128); pdf.text('GAJI PEKERJA:', TLX, y)
    pdf.setTextColor(196, 32, 42); pdf.text(`(${fmtRM(invoice.gaji_pekerja)})`, TVX, y, { align: 'right' })
    y += TH
  }

  pdf.setDrawColor(209, 213, 219); pdf.setLineWidth(0.3)
  pdf.line(TLX, y, TVX, y); y += 4.5

  bold(9); pdf.setTextColor(17, 24, 39); pdf.text('TOTAL:', TLX, y)
  bold(11); pdf.setTextColor(196, 32, 42); pdf.text(fmtRM(invoice.total), TVX, y, { align: 'right' })

  // ── Footer ────────────────────────────────────────────────────────────────
  const footY = 268
  pdf.setDrawColor(229, 231, 235); pdf.setLineWidth(0.2)
  pdf.line(M, footY, W - M, footY)

  let fy = footY + 5
  bold(8); pdf.setTextColor(17, 24, 39)
  pdf.text('Thank You For Your Business!', M, fy); fy += 5
  bold(7.5); pdf.setTextColor(17, 24, 39)
  pdf.text('KAKMELL RESOURCES', M, fy); fy += 4.5
  reg(7.5)
  pdf.text('32601052091', M, fy); fy += 4.5
  pdf.text('HONG LEONG BANK', M, fy)

  reg(6.5); pdf.setTextColor(156, 163, 175)
  pdf.text('Page 1 of 1', W - M, footY + 5, { align: 'right' })

  pdf.save(filename ?? `${invoice.invoice_no}.pdf`)
}
