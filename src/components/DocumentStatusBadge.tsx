import { Badge } from '@/components/ui-kit'
import { useLanguage } from '@/context/LanguageContext'
import { getStatusMeta } from '@/lib/document-status'
import type { DocumentKind } from '@/lib/document-number'

interface DocumentStatusBadgeProps {
  kind: DocumentKind
  status: string
  className?: string
}

/** Status pill for invoices (and, in Phase 2, quotations) — tone + label from document-status meta. */
export function DocumentStatusBadge({ kind, status, className }: DocumentStatusBadgeProps) {
  const { t } = useLanguage()
  const meta  = getStatusMeta(kind, status)
  return <Badge status={meta.badge} className={className}>{t(meta.labelKey)}</Badge>
}
