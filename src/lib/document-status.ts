// ── Document status metadata — PURE part (no React; unit-testable) ──
// Maps a document kind + status string to the badge tone, i18n label key and
// the colour strip class used on the detail page. The React component that
// renders the badge lives in components/DocumentStatusBadge.tsx.

import type { DocumentKind } from '@/lib/document-number'
import type { BadgeStatus } from '@/components/ui-kit'
import type { StringKey } from '@/lib/i18n'

export interface StatusMeta {
  badge: BadgeStatus
  labelKey: StringKey
  strip: string
}

// Partial: the 'quotation' entry is added in Phase 2 together with its i18n keys.
export const DOCUMENT_STATUS: Partial<Record<DocumentKind, Record<string, StatusMeta>>> = {
  invoice: {
    draft: { badge: 'neutral', labelKey: 'invoice.statusDraft', strip: 'bg-ink/15' },
    sent:  { badge: 'warn',    labelKey: 'invoice.statusSent',  strip: 'bg-warn'   },
    paid:  { badge: 'ok',      labelKey: 'invoice.statusPaid',  strip: 'bg-ok'     },
  },
}

/** Meta for `status` of `kind`; unknown statuses fall back to the kind's `draft` meta. */
export function getStatusMeta(kind: DocumentKind, status: string): StatusMeta {
  const map  = DOCUMENT_STATUS[kind]
  const meta = map?.[status] ?? map?.draft
  if (!meta) throw new Error(`document-status: no status meta registered for kind "${kind}"`)
  return meta
}
