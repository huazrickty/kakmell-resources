import { useState, useMemo } from 'react'
import type { InvoiceLineItem } from '@/lib/invoice-pdf'

/**
 * One editable line-item row. Flags are optional so a plain row (custom
 * invoice, future quotation) needs none of them:
 *  - protected   description locked, no delete button (preset rows)
 *  - toggled     undefined = true; false → row dimmed + excluded from subtotal
 *  - toggleable  leading cell renders a checkbox instead of the row index
 *  - qtyLocked   qty input disabled
 */
export interface FormItem {
  id: string
  description: string
  qty: string
  unit_price: string
  protected?: boolean
  toggled?: boolean
  toggleable?: boolean
  qtyLocked?: boolean
}

export function newBlankItem(id?: string): FormItem {
  return { id: id ?? `item-${Date.now()}`, description: '', qty: '1', unit_price: '' }
}

export function itemTotal(li: FormItem): number {
  return (parseFloat(li.qty) || 0) * (parseFloat(li.unit_price) || 0)
}

export function isActive(li: FormItem): boolean {
  return li.toggled !== false
}

export interface UseLineItemsOptions {
  /** removeItem() is a no-op when items.length <= minItems (default 0) */
  minItems?: number
}

export function useLineItems(initial: FormItem[] = [], opts: UseLineItemsOptions = {}) {
  const minItems = opts.minItems ?? 0
  const [items, setItems] = useState<FormItem[]>(initial)

  const subtotal = useMemo(
    () => items.filter(isActive).reduce((sum, li) => sum + itemTotal(li), 0),
    [items],
  )

  function updateItem(id: string, field: keyof FormItem, value: string | boolean) {
    setItems(prev => prev.map(li => (li.id === id ? { ...li, [field]: value } : li)))
  }

  function addItem() {
    setItems(prev => [...prev, newBlankItem()])
  }

  function removeItem(id: string) {
    if (items.length <= minItems) return
    setItems(prev => prev.filter(li => li.id !== id))
  }

  const canRemove = items.length > minItems

  /** Map to the persisted invoice shape. `filter` defaults to every item. */
  function toLineItems(filter: (li: FormItem) => boolean = () => true): InvoiceLineItem[] {
    return items.filter(filter).map(li => ({
      description:  li.description,
      qty:          parseFloat(li.qty) || 0,
      unit_price:   parseFloat(li.unit_price) || 0,
      total:        itemTotal(li),
      is_deduction: false,
    }))
  }

  return { items, setItems, updateItem, addItem, removeItem, canRemove, subtotal, toLineItems }
}
