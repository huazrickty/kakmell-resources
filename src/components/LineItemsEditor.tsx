import { Trash2, Plus } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { fmtRM } from '@/lib/invoice-pdf'
import { cn } from '@/lib/utils'
import { itemTotal, type FormItem } from '@/hooks/useLineItems'

export interface LineItemsEditorProps {
  items: FormItem[]
  onUpdate(id: string, field: keyof FormItem, value: string | boolean): void
  onRemove(id: string): void
  onAdd(): void
  /** false → delete buttons render disabled (e.g. last remaining row) */
  canRemove: boolean
  /** 'row' = full-width ghost row (event invoice); 'compact' = small inline link (custom invoice) */
  addButtonVariant: 'row' | 'compact'
}

const GRID = { gridTemplateColumns: '24px 1fr 72px 96px 28px' }

/**
 * Editable line-item table (header, rows, add button). Markup is lifted
 * verbatim from NewInvoice / NewCustomInvoice; per-row behaviour is driven by
 * the optional FormItem flags (protected / toggled / toggleable / qtyLocked).
 */
export function LineItemsEditor({ items, onUpdate, onRemove, onAdd, canRemove, addButtonVariant }: LineItemsEditorProps) {
  const { t } = useLanguage()

  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden mb-4">
      {/* Table header */}
      <div className="grid items-center bg-ink/[0.03] border-b border-line px-4 py-2.5" style={GRID}>
        <span className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">#</span>
        <span className="text-[10px] font-bold text-ink-soft uppercase tracking-widest">{t('invoice.description')}</span>
        <span className="text-[10px] font-bold text-ink-soft uppercase tracking-widest text-right">{t('invoice.qty')}</span>
        <span className="text-[10px] font-bold text-ink-soft uppercase tracking-widest text-right pr-2">{t('invoice.unitPrice')}</span>
        <span />
      </div>

      {/* Rows */}
      <div className="divide-y divide-line">
        {items.map((li, i) => {
          const qty      = parseFloat(li.qty) || 0
          const unit     = parseFloat(li.unit_price) || 0
          const rowTotal = itemTotal(li)
          const toggled  = li.toggled !== false
          return (
            <div
              key={li.id}
              className={cn(
                'grid items-center px-4 py-2.5 gap-1',
                !toggled && 'opacity-40'
              )}
              style={GRID}
            >
              {/* Number / toggle checkbox */}
              <div className="shrink-0">
                {li.toggleable ? (
                  <button
                    onClick={() => onUpdate(li.id, 'toggled', !toggled)}
                    className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                      toggled
                        ? 'bg-ink border-ink'
                        : 'border-line bg-surface'
                    )}
                  >
                    {toggled && (
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ) : (
                  <span className="text-xs text-ink-soft font-mono tabular-nums">{i + 1}</span>
                )}
              </div>

              {/* Description */}
              <input
                type="text"
                value={li.description}
                onChange={(e) => onUpdate(li.id, 'description', e.target.value)}
                disabled={!!li.protected}
                placeholder={t('invoice.itemPlaceholder')}
                className="text-sm text-ink py-1 px-1.5 rounded border border-transparent focus:border-line focus:outline-none disabled:bg-transparent disabled:cursor-default w-full"
              />

              {/* Qty */}
              <input
                type="number"
                value={li.qty}
                onChange={(e) => onUpdate(li.id, 'qty', e.target.value)}
                disabled={!!li.qtyLocked}
                className="text-sm text-right text-ink py-1 px-1.5 rounded border border-transparent focus:border-line focus:outline-none w-full disabled:bg-transparent disabled:cursor-default tabular-nums"
              />

              {/* Unit price + row total */}
              <div>
                <input
                  type="number"
                  value={li.unit_price}
                  onChange={(e) => onUpdate(li.id, 'unit_price', e.target.value)}
                  step="0.01"
                  placeholder="0.00"
                  className="text-sm text-right text-ink py-1 px-1.5 rounded border border-transparent focus:border-line focus:outline-none w-full tabular-nums"
                />
                {unit > 0 && qty > 0 && (
                  <p className="text-[10px] text-ink-soft text-right mt-0.5 pr-1.5 tabular-nums">
                    = {fmtRM(rowTotal)}
                  </p>
                )}
              </div>

              {/* Delete */}
              <div className="flex justify-center">
                {!li.protected && (
                  <button
                    onClick={() => onRemove(li.id)}
                    disabled={!canRemove}
                    className="text-ink-soft/50 hover:text-danger transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add item */}
      {addButtonVariant === 'row' ? (
        <button
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-1.5 min-h-12 border-t border-line text-sm font-semibold text-ink-soft hover:text-ink hover:bg-ink/[0.02] transition-colors"
        >
          <Plus size={14} />
          {t('invoice.addItem')}
        </button>
      ) : (
        <div className="px-4 py-3 border-t border-line">
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 text-xs font-semibold text-ink hover:text-ink transition-colors"
          >
            <Plus size={13} />
            {t('invoice.addItem')}
          </button>
        </div>
      )}
    </div>
  )
}
