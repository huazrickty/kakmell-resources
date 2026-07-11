import jsPDF from 'jspdf'

// ── Layout constants (landscape A4) ────────────────────────────────────────
const W = 297
const H = 210
const M = 12
const USABLE_W = W - 2 * M   // 273mm

const PAX = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1500, 2000, 3000]
const TOTAL_PAGES = 5

const LABEL_W = 48
const CELL_W  = (USABLE_W - LABEL_W) / PAX.length  // ~14.1mm
const HEAD_H  = 11
const ROW_H   = 14

// Colours
const BLACK:    [number, number, number] = [0,   0,   0  ]
const DARK:     [number, number, number] = [20,  20,  20 ]
const DGRAY:    [number, number, number] = [80,  80,  80 ]
const BORDER:   [number, number, number] = [100, 100, 100]
const HEAD_BG:  [number, number, number] = [220, 220, 220]
const ROW_ALT:  [number, number, number] = [248, 248, 248]

// ── Current system reference values (matches ingredient-calculator.ts) ────
// Index order matches section rows defined below

const REF_BRACKETS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]

const REF_MAIN: Partial<Record<number, string[]>> = {
  100:  ['0.75', '10', '10', '20', '5' ],
  200:  ['1.5',  '20', '20', '25', '5' ],
  300:  ['2',    '21', '18', '25', '10'],
  400:  ['3',    '28', '24', '30', '10'],
  500:  ['3.5',  '35', '30', '30', '15'],
  600:  ['4',    '42', '36', '30', '15'],
  700:  ['4.5',  '49', '42', '30', '20'],
  800:  ['5',    '56', '48', '30', '20'],
  900:  ['6',    '63', '54', '30', '25'],
  1000: ['7',    '70', '60', '40', '30'],
}

const REF_DALCA: Partial<Record<number, string[]>> = {
  100:  ['1', '0.6', '1/3 bag',   '5 biji' ],
  200:  ['1', '1.2', '1/2 bag',   '5 biji' ],
  300:  ['2', '1.8', '1/2 bag',   '10 biji'],
  400:  ['2', '2.4', '2/3 bag',   '15 biji'],
  500:  ['3', '3',   '1 bag',     '20 biji'],
  600:  ['3', '3.6', '1 1/3 bag', '20 biji'],
  700:  ['3', '4.2', '1 1/2 bag', '20 biji'],
  800:  ['3', '4.8', '1 1/2 bag', '25 biji'],
  900:  ['3', '5.4', '1 2/3 bag', '25 biji'],
  1000: ['3', '6',   '2 bag',     '25 biji'],
}

const REF_PACERI: Partial<Record<number, string>> = {
  100: '10', 200: '15', 300: '20', 400: '25', 500: '30',
  600: '35', 700: '40', 800: '45', 900: '50', 1000: '60',
}
const REF_TIMUN: Partial<Record<number, string>> = {
  100: '3', 200: '6', 300: '10', 400: '12', 500: '15',
  600: '15', 700: '20', 800: '25', 900: '25', 1000: '30',
}
const REF_NENAS_ACAR: Partial<Record<number, string>> = {
  100: '3', 200: '6', 300: '10', 400: '10', 500: '10',
  600: '10', 700: '10', 800: '12', 900: '15', 1000: '20',
}

function fmtDate(): string {
  const n = new Date()
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${n.getDate()} ${months[n.getMonth()]} ${n.getFullYear()}`
}

// ── Main export ────────────────────────────────────────────────────────────

export async function generateCalibrationForm(logoBase64: string): Promise<void> {
  const pdf = new jsPDF('l', 'mm', 'a4')

  const bold   = (sz: number) => { pdf.setFont('helvetica', 'bold');   pdf.setFontSize(sz) }
  const reg    = (sz: number) => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(sz) }
  const italic = (sz: number) => { pdf.setFont('helvetica', 'italic'); pdf.setFontSize(sz) }

  // ── Page header — returns y of first content row ───────────────────────
  function drawHeader(page: number, sectionTitle: string): number {
    let y = M

    // ── Top strip: company + logo ─────────────────────────────────────
    if (logoBase64) {
      pdf.addImage(logoBase64, 'PNG', W - M - 36, y, 36, 13)
    }

    bold(15)
    pdf.setTextColor(...BLACK)
    pdf.text('KAKMELL RESOURCES', M, y + 9)

    // Thin rule under company name
    pdf.setDrawColor(...BORDER)
    pdf.setLineWidth(0.6)
    pdf.line(M, y + 12, W - M, y + 12)

    y += 15

    // ── Form title ────────────────────────────────────────────────────
    bold(16)
    pdf.setTextColor(...BLACK)
    pdf.text('INGREDIENT CALIBRATION FORM', W / 2, y + 8, { align: 'center' })
    y += 12

    if (page === 1) {
      reg(10)
      pdf.setTextColor(...DARK)
      pdf.text(
        'Please fill in the required quantity for each pax count.',
        W / 2, y + 5, { align: 'center' },
      )
      y += 10

      // Date / Filled by / Printed
      bold(10)
      pdf.setTextColor(...BLACK)
      pdf.text('Date:', M, y + 5)
      reg(10)
      pdf.text('_______________________________', M + 12, y + 5)

      bold(10)
      pdf.text('Filled by:', M + 90, y + 5)
      reg(10)
      pdf.text('_______________________________', M + 115, y + 5)

      reg(9)
      pdf.setTextColor(...DGRAY)
      pdf.text(`Printed: ${fmtDate()}`, W - M, y + 5, { align: 'right' })
      y += 10
    }

    // ── Section title bar ─────────────────────────────────────────────
    pdf.setFillColor(...HEAD_BG)
    pdf.rect(M, y, USABLE_W, 10, 'F')
    pdf.setDrawColor(...BORDER)
    pdf.setLineWidth(0.5)
    pdf.rect(M, y, USABLE_W, 10)

    bold(13)
    pdf.setTextColor(...BLACK)
    pdf.text(sectionTitle, M + 4, y + 7)

    bold(9)
    pdf.setTextColor(...DGRAY)
    pdf.text(`Page ${page} of ${TOTAL_PAGES}`, W - M - 3, y + 7, { align: 'right' })

    y += 14

    return y
  }

  // ── Blank table for handwriting ────────────────────────────────────────
  function drawTable(startY: number, rows: { label: string; unit: string }[]): number {
    const tx      = M
    const tableH  = HEAD_H + rows.length * ROW_H

    // ── Header row ───────────────────────────────────────────────────
    pdf.setFillColor(...HEAD_BG)
    pdf.rect(tx, startY, USABLE_W, HEAD_H, 'F')

    bold(9)
    pdf.setTextColor(...BLACK)
    pdf.text('Ingredient / Pax', tx + 3, startY + HEAD_H / 2 + 3)

    // Pax column headers
    for (let ci = 0; ci < PAX.length; ci++) {
      const cx = tx + LABEL_W + ci * CELL_W
      bold(9)
      pdf.setTextColor(...BLACK)
      pdf.text(String(PAX[ci]), cx + CELL_W / 2, startY + HEAD_H / 2 + 3, { align: 'center' })
    }

    // ── Data rows ─────────────────────────────────────────────────────
    for (let ri = 0; ri < rows.length; ri++) {
      const ry = startY + HEAD_H + ri * ROW_H

      // Alternating row background
      if (ri % 2 === 1) {
        pdf.setFillColor(...ROW_ALT)
        pdf.rect(tx + 1, ry, LABEL_W - 1, ROW_H, 'F')
      }

      // Ingredient label
      bold(10)
      pdf.setTextColor(...BLACK)
      pdf.text(rows[ri].label, tx + 3, ry + 5.5)

      // Unit on second line
      reg(8)
      pdf.setTextColor(...DGRAY)
      pdf.text(`(${rows[ri].unit})`, tx + 3, ry + 10.5)

      // Writing line in each cell — solid black
      for (let ci = 0; ci < PAX.length; ci++) {
        const cx = tx + LABEL_W + ci * CELL_W
        pdf.setDrawColor(...BLACK)
        pdf.setLineWidth(0.4)
        pdf.line(cx + 3, ry + ROW_H - 3, cx + CELL_W - 3, ry + ROW_H - 3)
      }
    }

    // ── Grid lines ─────────────────────────────────────────────────────
    // Horizontal: header bottom + each row bottom
    pdf.setDrawColor(...BORDER)
    pdf.setLineWidth(0.5)
    pdf.line(tx, startY + HEAD_H, tx + USABLE_W, startY + HEAD_H)

    pdf.setDrawColor(...BORDER)
    pdf.setLineWidth(0.3)
    for (let ri = 0; ri < rows.length - 1; ri++) {
      const ry = startY + HEAD_H + (ri + 1) * ROW_H
      pdf.line(tx, ry, tx + USABLE_W, ry)
    }

    // Vertical: label divider (heavier)
    pdf.setDrawColor(...BORDER)
    pdf.setLineWidth(0.6)
    pdf.line(tx + LABEL_W, startY, tx + LABEL_W, startY + tableH)

    // Vertical: between pax columns (lighter)
    pdf.setDrawColor(...BORDER)
    pdf.setLineWidth(0.2)
    for (let ci = 1; ci < PAX.length; ci++) {
      const cx = tx + LABEL_W + ci * CELL_W
      pdf.line(cx, startY, cx, startY + tableH)
    }

    // Outer border (heaviest)
    pdf.setDrawColor(...BORDER)
    pdf.setLineWidth(0.8)
    pdf.rect(tx, startY, USABLE_W, tableH)

    return startY + tableH
  }

  // ── Reference data block ───────────────────────────────────────────────
  function drawRef(y: number, lines: string[]): void {
    bold(9)
    pdf.setTextColor(...BLACK)
    pdf.text('Current system values:', M, y + 5)

    reg(9)
    pdf.setTextColor(...DGRAY)
    let ly = y + 10
    for (const line of lines) {
      pdf.text(line, M, ly)
      ly += 5
    }
  }

  // ── Page footer ────────────────────────────────────────────────────────
  function drawFooter() {
    pdf.setDrawColor(...BORDER)
    pdf.setLineWidth(0.3)
    pdf.line(M, H - 9, W - M, H - 9)

    reg(8)
    pdf.setTextColor(...DARK)
    pdf.text('KAKMELL RESOURCES  ·  Ingredient Calibration Form', M, H - 5)
  }

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 1 — MAIN INGREDIENTS
  // ════════════════════════════════════════════════════════════════════════
  let y = drawHeader(1, 'SECTION 1: MAIN INGREDIENTS')

  y = drawTable(y, [
    { label: 'Beras Basmati',    unit: 'bag'  },
    { label: 'Ayam Masak Merah', unit: 'ekor' },
    { label: 'Daging',           unit: 'kg'   },
    { label: 'Oren',             unit: 'biji' },
    { label: 'Gula / Air',       unit: 'L'    },
  ])

  y += 5
  const mainLabels = ['Beras (bags)', 'Ayam (pieces)', 'Daging (kg)', 'Oren (pieces)', 'Gula (litres)']
  drawRef(y, mainLabels.map((lbl, i) => {
    const parts = REF_BRACKETS
      .map(p => `${p}:${REF_MAIN[p]?.[i] ?? '—'}`)
      .join('  ')
    return `${lbl}:  ${parts}`
  }))
  drawFooter()

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 2 — DALCA
  // ════════════════════════════════════════════════════════════════════════
  pdf.addPage()
  y = drawHeader(2, 'SECTION 2: DALCA')

  y = drawTable(y, [
    { label: 'Kacang Dall', unit: 'kg'      },
    { label: 'Terung',      unit: 'kg'      },
    { label: 'Kentang',     unit: 'bag'     },
    { label: 'Karot',       unit: 'biji'    },
  ])

  y += 5
  const dalcaLabels = ['Kacang Dall', 'Terung', 'Kentang', 'Karot']
  drawRef(y, dalcaLabels.map((lbl, i) => {
    const parts = REF_BRACKETS
      .map(p => `${p}:${REF_DALCA[p]?.[i] ?? '—'}`)
      .join('  ')
    return `${lbl}:  ${parts}`
  }))
  drawFooter()

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 3 — ACAR & PACERI
  // ════════════════════════════════════════════════════════════════════════
  pdf.addPage()
  y = drawHeader(3, 'SECTION 3: ACAR & PACERI')

  // Sub-section A
  bold(11)
  pdf.setTextColor(...BLACK)
  pdf.text('A.  Paceri Nenas', M, y + 6)
  y += 10

  y = drawTable(y, [
    { label: 'Nenas', unit: 'biji' },
  ])

  y += 8

  // Sub-section B
  bold(11)
  pdf.setTextColor(...BLACK)
  pdf.text('B.  Pencuk (Acar Jelatah)', M, y + 6)
  y += 10

  y = drawTable(y, [
    { label: 'Timun', unit: 'kg'   },
    { label: 'Nenas', unit: 'biji' },
  ])

  y += 5
  const paceriParts = REF_BRACKETS.map(p => `${p}:${REF_PACERI[p] ?? '—'}`).join('  ')
  const timunParts  = REF_BRACKETS.map(p => `${p}:${REF_TIMUN[p] ?? '—'}`).join('  ')
  const nenasParts  = REF_BRACKETS.map(p => `${p}:${REF_NENAS_ACAR[p] ?? '—'}`).join('  ')
  drawRef(y, [
    `Paceri Nenas (pieces):  ${paceriParts}`,
    `Pencuk Cucumber (kg):   ${timunParts}`,
    `Pencuk Pineapple (pcs): ${nenasParts}`,
  ])
  drawFooter()

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 4 — BUBUR (DESSERT PORRIDGE)
  // ════════════════════════════════════════════════════════════════════════
  pdf.addPage()
  y = drawHeader(4, 'SECTION 4: BUBUR (DESSERT PORRIDGE)')

  y = drawTable(y, [
    { label: 'Bubur Pulut Hitam',   unit: 'kg'  },
    { label: 'Santan Pulut Hitam',  unit: 'kg'  },
    { label: 'Sagu Pulut Hitam',    unit: 'kg'  },
    { label: 'Bubur Kacang Hijau',  unit: 'kg'  },
    { label: 'Santan Kacang Hijau', unit: 'kg'  },
    { label: 'Sagu Kacang Hijau',   unit: 'kg'  },
    { label: 'Bubur Jagung',        unit: 'beg' },
    { label: 'Santan Jagung',       unit: 'kg'  },
    { label: 'Sagu Jagung',         unit: 'kg'  },
  ])

  y += 5
  drawRef(y, [
    'Flat for all pax:  PH 2kg · santan 1kg · sagu 0.5kg  |  KH 2kg · santan 1kg · sagu 0.5kg  |  Jagung 2 beg (4kg) · santan 2kg (3kg @1000) · sagu 1kg',
  ])
  drawFooter()

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 5 — BEEF BOXES
  // ════════════════════════════════════════════════════════════════════════
  pdf.addPage()
  y = drawHeader(5, 'SECTION 5: BEEF BOXES')

  // Info box: current weight per box + correction fields
  pdf.setFillColor(245, 245, 245)
  pdf.setDrawColor(...BORDER)
  pdf.setLineWidth(0.5)
  pdf.rect(M, y, USABLE_W, 26, 'FD')

  bold(10)
  pdf.setTextColor(...BLACK)
  pdf.text('Beef Type (kg per box):', M + 4, y + 7)
  reg(10)
  pdf.text('Slice  = 17 kg / box', M + 4, y + 14)
  pdf.text('Trimming = 22 kg / box', M + 4, y + 21)

  // Divider
  pdf.setDrawColor(...BORDER)
  pdf.setLineWidth(0.3)
  pdf.line(M + 85, y + 4, M + 85, y + 23)

  bold(10)
  pdf.setTextColor(...BLACK)
  pdf.text('Correction (fill in if changed):', M + 89, y + 7)
  reg(10)
  pdf.text('Slice  = _________________ kg / box', M + 89, y + 14)
  pdf.text('Trimming = _________________ kg / box', M + 89, y + 21)

  italic(9)
  pdf.setTextColor(...DGRAY)
  pdf.text('Note: Slice/Trim/Lebihan use a fixed', M + 185, y + 14)
  pdf.text('lookup per pax bracket (see below).', M + 185, y + 21)

  y += 30

  y = drawTable(y, [
    { label: 'Slice',              unit: 'kotak'                      },
    { label: 'Trimming',           unit: 'kotak'                      },
    { label: 'Lebihan / Kurangan', unit: 'kg  (+ lebih / − kurang)'   },
  ])

  y += 5
  drawRef(y, [
    'Slice (boxes):  100:1  200:1  300:1  400:1  500:1  600:1  700:2  800:1  900:2  1000:2',
    'Trimming (boxes):  100–400:0  500–700:0.5  800–1000:1   ·   Lebihan (kg):  100:+7  200:−3  300:−2  400:−7  500:−2  600:−8  700:+3  800:−9  900:+2  1000:−4',
  ])
  drawFooter()

  // ── Save ─────────────────────────────────────────────────────────────────
  const iso = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  pdf.save(`KAKMELL-Calibration-Form-${iso}.pdf`)
}
