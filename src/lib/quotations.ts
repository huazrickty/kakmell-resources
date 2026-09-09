// ── Quotation (Sebut Harga) — types + PURE helpers (no Firebase, no React) ──
// Firestore access lives in hooks/useQuotations.ts; the PDF in quotation-pdf.ts.

import type { Timestamp } from 'firebase/firestore'
import type { InvoiceLineItem } from '@/lib/invoice-pdf'
import { sanitizePart, fmtFilenameDate } from '@/lib/invoice-pdf'
import { fromLineItems, type FormItem } from '@/hooks/useLineItems'
import { fmtUnitPriceInput } from '@/lib/pricing'
import { tsToDate } from '@/lib/date-utils'

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
export const QUOTATION_STATUSES: readonly QuotationStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'expired']

/** Default validity window: quotation_date + 14 days */
export const VALIDITY_DAYS = 14

export interface QuotationCustomer {
  name: string
  phone?: string
  address?: string
}

export interface QuotationDoc {
  id: string
  quotation_no: string
  quotation_date: Timestamp | Date
  valid_until: Timestamp | Date
  event_id: string | null
  /** Snapshot at creation — a sent quote must not change when the event is edited */
  event_name: string
  /** Snapshot at creation; 0 when unknown (standalone without pax) */
  pax: number
  customer: QuotationCustomer
  line_items: InvoiceLineItem[]
  subtotal: number
  /** RM, >= 0, <= subtotal */
  discount?: number
  total: number
  /** 'expired' is never written by the app — see effectiveStatus() */
  status: QuotationStatus
  revision_of?: string
  converted_invoice_id?: string
  notes?: string
  created_by: string
  created_at: Timestamp | Date
  updated_at: Timestamp | Date
}

/** quotation_date + `days`, same wall-clock time. */
export function defaultValidUntil(quotationDate: Date, days = VALIDITY_DAYS): Date {
  const d = new Date(quotationDate.getTime())
  d.setDate(d.getDate() + days)
  return d
}

/**
 * Display status. draft/sent past valid_until → 'expired'. Never mutates and
 * nothing in the app writes 'expired' to Firestore — expiry is derived only.
 */
export function effectiveStatus(
  q: Pick<QuotationDoc, 'status' | 'valid_until'>,
  now: Date = new Date(),
): QuotationStatus {
  if ((q.status === 'draft' || q.status === 'sent') && tsToDate(q.valid_until).getTime() < now.getTime()) {
    return 'expired'
  }
  return q.status
}

/** Discount clamped to [0, subtotal]; total = subtotal − discount. */
export function computeTotals(subtotal: number, discount: number): { subtotal: number; discount: number; total: number } {
  const s = Number.isFinite(subtotal) ? subtotal : 0
  const raw = Number.isFinite(discount) ? discount : 0
  const d = Math.min(Math.max(raw, 0), s)
  return { subtotal: s, discount: d, total: s - d }
}

// ── Convert to invoice ─────────────────────────────────────────────────────

export interface InvoicePrefill {
  /** Page that will create the invoice */
  target: '/invoices/new' | '/invoices/custom/new'
  /** Query string (leading '?') — the invoice page re-reads the quote by quotationId */
  search: string
  /** Form rows for useLineItems.setItems — discount carried as a NEGATIVE line (never dropped) */
  items: FormItem[]
  /** custom target: billed_to */
  billedTo: string
  /** custom target: reference */
  reference: string
}

/**
 * Pure mapping quote → invoice form prefill. A discount > 0 becomes an extra
 * line "Diskaun (QUO-…)" qty 1 with a negative unit price, so the invoice
 * never bills more than the customer accepted.
 */
export function quoteToInvoicePayload(q: QuotationDoc): InvoicePrefill {
  const items = fromLineItems(q.line_items, 'q')
  const discount = q.discount ?? 0
  if (discount > 0) {
    items.push({
      id: `q-discount-${q.id}`,
      description: `Diskaun (${q.quotation_no})`,
      qty: '1',
      unit_price: fmtUnitPriceInput(-discount),
    })
  }
  const hasEvent = !!q.event_id
  return {
    target: hasEvent ? '/invoices/new' : '/invoices/custom/new',
    search: hasEvent ? `?eventId=${q.event_id}&quotationId=${q.id}` : `?quotationId=${q.id}`,
    items,
    billedTo: q.customer.name,
    reference: q.quotation_no,
  }
}

// ── Filename ───────────────────────────────────────────────────────────────

/** QUO-2026-001_NamaCustomer_09092026.pdf (≤ 80 chars before .pdf) */
export function buildQuotationFilename(
  q: Pick<QuotationDoc, 'quotation_no' | 'customer' | 'quotation_date'>,
): string {
  const cust = sanitizePart(q.customer.name)
  let name = `${q.quotation_no}_${cust}_${fmtFilenameDate(tsToDate(q.quotation_date))}`
  if (name.length > 80) name = name.slice(0, 80).replace(/[_-]+$/, '')
  return `${name}.pdf`
}
