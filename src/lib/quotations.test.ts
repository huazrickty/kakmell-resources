import { describe, it, expect } from 'vitest'
import {
  defaultValidUntil, effectiveStatus, computeTotals, quoteToInvoicePayload, buildQuotationFilename,
  type QuotationDoc,
} from './quotations'
import { getStatusMeta } from './document-status'
import { parseDocumentNumber } from './document-number'
import { fromLineItems, itemTotal } from '@/hooks/useLineItems'

const base: QuotationDoc = {
  id: 'q1',
  quotation_no: 'QUO-2026-001',
  quotation_date: new Date(2026, 8, 9, 10, 30),
  valid_until: new Date(2026, 8, 23, 10, 30),
  event_id: 'ev1',
  event_name: 'Majlis Ujian',
  pax: 600,
  customer: { name: 'Syarikat ABC Sdn Bhd', phone: '012-3456789' },
  line_items: [
    { description: 'Katering — Elham Hall — 600 pax', qty: 600, unit_price: 10.5, total: 6300, is_deduction: false },
    { description: 'Makan Beradab', qty: 1, unit_price: 100, total: 100, is_deduction: false },
  ],
  subtotal: 6400,
  discount: 50,
  total: 6350,
  status: 'draft',
  created_by: 'u1',
  created_at: new Date(2026, 8, 9),
  updated_at: new Date(2026, 8, 9),
}

describe('defaultValidUntil', () => {
  it('adds 14 days keeping the time', () => {
    const d = defaultValidUntil(new Date(2026, 8, 9, 10, 30))
    expect(d.getTime()).toBe(new Date(2026, 8, 23, 10, 30).getTime())
  })
  it('accepts custom days and rolls over month/year', () => {
    expect(defaultValidUntil(new Date(2026, 11, 25), 10).getTime()).toBe(new Date(2027, 0, 4).getTime())
  })
})

describe('effectiveStatus', () => {
  const past = new Date(2026, 9, 1)
  it('draft/sent past valid_until → expired (display only)', () => {
    expect(effectiveStatus({ status: 'draft', valid_until: base.valid_until }, past)).toBe('expired')
    expect(effectiveStatus({ status: 'sent',  valid_until: base.valid_until }, past)).toBe('expired')
  })
  it('draft/sent before valid_until → unchanged', () => {
    expect(effectiveStatus({ status: 'sent', valid_until: base.valid_until }, new Date(2026, 8, 10))).toBe('sent')
  })
  it('accepted/rejected never expire', () => {
    expect(effectiveStatus({ status: 'accepted', valid_until: base.valid_until }, past)).toBe('accepted')
    expect(effectiveStatus({ status: 'rejected', valid_until: base.valid_until }, past)).toBe('rejected')
  })
  it('handles Firestore Timestamp-like valid_until', () => {
    const ts = { toDate: () => new Date(2026, 8, 23) } as unknown as QuotationDoc['valid_until']
    expect(effectiveStatus({ status: 'draft', valid_until: ts }, past)).toBe('expired')
  })
})

describe('computeTotals', () => {
  it('clamps discount to [0, subtotal]', () => {
    expect(computeTotals(100, 30)).toEqual({ subtotal: 100, discount: 30, total: 70 })
    expect(computeTotals(100, -5)).toEqual({ subtotal: 100, discount: 0, total: 100 })
    expect(computeTotals(100, 500)).toEqual({ subtotal: 100, discount: 100, total: 0 })
    expect(computeTotals(100, NaN)).toEqual({ subtotal: 100, discount: 0, total: 100 })
  })
})

describe('quoteToInvoicePayload', () => {
  it('event quote → /invoices/new with eventId + quotationId, discount as negative line', () => {
    const p = quoteToInvoicePayload(base)
    expect(p.target).toBe('/invoices/new')
    expect(p.search).toBe('?eventId=ev1&quotationId=q1')
    expect(p.items).toHaveLength(3)
    expect(p.items[0]).toMatchObject({ description: 'Katering — Elham Hall — 600 pax', qty: '600', unit_price: '10.50' })
    expect(p.items[2]).toMatchObject({ description: 'Diskaun (QUO-2026-001)', qty: '1', unit_price: '-50' })
    // invoice subtotal from the prefilled rows equals the quote total (discount never dropped)
    expect(p.items.reduce((s, li) => s + itemTotal(li), 0)).toBe(base.total)
  })
  it('standalone quote → custom invoice with billedTo + reference', () => {
    const p = quoteToInvoicePayload({ ...base, event_id: null, discount: 0 })
    expect(p.target).toBe('/invoices/custom/new')
    expect(p.search).toBe('?quotationId=q1')
    expect(p.billedTo).toBe('Syarikat ABC Sdn Bhd')
    expect(p.reference).toBe('QUO-2026-001')
    expect(p.items).toHaveLength(2)                       // no discount line when 0
  })
  it('undefined discount → no discount line', () => {
    const noDiscount: QuotationDoc = { ...base }
    delete noDiscount.discount
    expect(quoteToInvoicePayload(noDiscount).items).toHaveLength(2)
  })
})

describe('fromLineItems', () => {
  it('round-trips totals through form rows', () => {
    const rows = fromLineItems(base.line_items, 'x')
    expect(rows.map(r => r.unit_price)).toEqual(['10.50', '100'])
    expect(rows.reduce((s, li) => s + itemTotal(li), 0)).toBe(base.subtotal)
    expect(new Set(rows.map(r => r.id)).size).toBe(2)
  })
})

describe('buildQuotationFilename', () => {
  it('sanitises customer and formats date', () => {
    expect(buildQuotationFilename(base)).toBe('QUO-2026-001_SyarikatABCSdnBhd_09092026.pdf')
  })
  it('caps at 80 chars', () => {
    const long = buildQuotationFilename({ ...base, customer: { name: 'A'.repeat(120) } })
    expect(long.length).toBeLessThanOrEqual(84)
    expect(long.endsWith('.pdf')).toBe(true)
  })
})

describe('document-status quotation entries', () => {
  it('maps every quotation status', () => {
    expect(getStatusMeta('quotation', 'draft').badge).toBe('neutral')
    expect(getStatusMeta('quotation', 'sent').badge).toBe('warn')
    expect(getStatusMeta('quotation', 'accepted').badge).toBe('ok')
    expect(getStatusMeta('quotation', 'rejected').badge).toBe('danger')
    expect(getStatusMeta('quotation', 'expired').labelKey).toBe('quotation.statusExpired')
    expect(getStatusMeta('quotation', 'bogus').labelKey).toBe('quotation.statusDraft')   // fallback
  })
  it('invoice entries unchanged', () => {
    expect(getStatusMeta('invoice', 'paid')).toEqual({ badge: 'ok', labelKey: 'invoice.statusPaid', strip: 'bg-ok' })
  })
})

describe('parseDocumentNumber for QUO', () => {
  it('parses', () => {
    expect(parseDocumentNumber('QUO-2026-007')).toEqual({ kind: 'quotation', year: 2026, seq: 7 })
  })
})
