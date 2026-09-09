import type jsPDF from 'jspdf'

// ── Shared jsPDF primitives ────────────────────────────────────────────────
// Page geometry, palette, company strings and tiny draw helpers used by the
// invoice, weekly-export and calibration-form PDFs. This module never
// constructs a jsPDF instance — callers pass theirs in.

export type RGB = [number, number, number]

export const A4_PORTRAIT  = { w: 210, h: 297 } as const
export const A4_LANDSCAPE = { w: 297, h: 210 } as const
export const PAGE_MARGIN = 14

export const COLOR = {
  ink:       [17, 24, 39]    as RGB,   // headings, table header bg
  brandRed:  [196, 32, 42]   as RGB,   // separator line, total
  gray:      [107, 114, 128] as RGB,   // body meta text
  grayLight: [156, 163, 175] as RGB,   // labels, item numbers
  line:      [229, 231, 235] as RGB,   // hairline dividers
  lineDark:  [209, 213, 219] as RGB,   // totals divider
  rowAlt:    [249, 249, 249] as RGB,   // zebra row
  white:     [255, 255, 255] as RGB,
}

export const COMPANY = {
  name: 'KAKMELL RESOURCES',
  address1: 'NO 58, JALAN JAMBU 4, TAMAN KOTA MASAI,',
  address2: '81700 PASIR GUDANG, JOHOR',
  phone: 'Phone: +6018-397 0769',
  bankName: 'HONG LEONG BANK',
  bankAccount: '32601052091',
}

// ── Fonts ──────────────────────────────────────────────────────────────────

export function fonts(pdf: jsPDF): {
  bold(sz: number): void
  reg(sz: number): void
  italic(sz: number): void
} {
  return {
    bold:   (sz: number) => { pdf.setFont('helvetica', 'bold');   pdf.setFontSize(sz) },
    reg:    (sz: number) => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(sz) },
    italic: (sz: number) => { pdf.setFont('helvetica', 'italic'); pdf.setFontSize(sz) },
  }
}

// ── Logo ───────────────────────────────────────────────────────────────────

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

export function drawLogo(
  pdf: jsPDF,
  logo: string,
  box: { x: number; y: number; w: number; h: number },
): void {
  pdf.addImage(logo, 'PNG', box.x, box.y, box.w, box.h)
}

// ── Company address block ──────────────────────────────────────────────────

/** Draws 3 address lines at 7.5pt gray starting at (x, y); returns y of last line. */
export function drawCompanyAddress(pdf: jsPDF, x: number, y: number): number {
  const { reg } = fonts(pdf)
  reg(7.5); pdf.setTextColor(...COLOR.gray)
  pdf.text(COMPANY.address1, x, y); y += 4
  pdf.text(COMPANY.address2, x, y); y += 4
  pdf.text(COMPANY.phone, x, y)
  return y
}

// ── Footer note ────────────────────────────────────────────────────────────

export interface FooterLine {
  text: string
  bold?: boolean
  size: number
  color?: RGB
  gapAfter: number
}

export interface FooterNoteOptions {
  y: number
  x: number
  right: number
  lines: FooterLine[]
  pageLabel?: string
}

/** Divider at y, then bold/regular lines below, optional right-aligned page label. */
export function drawFooterNote(pdf: jsPDF, opts: FooterNoteOptions): void {
  const { bold, reg } = fonts(pdf)
  pdf.setDrawColor(...COLOR.line); pdf.setLineWidth(0.2)
  pdf.line(opts.x, opts.y, opts.right, opts.y)

  let fy = opts.y + 5
  for (const ln of opts.lines) {
    (ln.bold ? bold : reg)(ln.size)
    pdf.setTextColor(...(ln.color ?? COLOR.ink))
    pdf.text(ln.text, opts.x, fy)
    fy += ln.gapAfter
  }

  if (opts.pageLabel) {
    reg(6.5); pdf.setTextColor(...COLOR.grayLight)
    pdf.text(opts.pageLabel, opts.right, opts.y + 5, { align: 'right' })
  }
}
