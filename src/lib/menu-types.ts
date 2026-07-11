import { type StringKey } from '@/lib/i18n'

export const MENU_TYPES = ['kahwin', 'ala_kampung', 'western', 'raya'] as const

export type MenuType = (typeof MENU_TYPES)[number]

export const MENU_TYPE_LABEL_KEYS: Record<MenuType, StringKey> = {
  kahwin:      'menuType.kahwin',
  ala_kampung: 'menuType.ala_kampung',
  western:     'menuType.western',
  raya:        'menuType.raya',
}

// Events created before Feature A have no menu_type — they are all weddings.
export function resolveMenuType(value: string | undefined): MenuType {
  return (MENU_TYPES as readonly string[]).includes(value ?? '') ? (value as MenuType) : 'kahwin'
}

// BM labels for stored text (activity log descriptions) — stable regardless of UI language
export const MENU_TYPE_LABELS_BM: Record<MenuType, string> = {
  kahwin:      'Lauk Kahwin',
  ala_kampung: 'Lauk Ala Kampung',
  western:     'Western',
  raya:        'Lauk Raya',
}

// Hot/cold drinks with fallback: old kahwin events store a single air_panas
// string — surface it as a one-element hot list. Never rewrites event data.
export function getHotDrinks(menu: { hot_drinks?: string[]; air_panas?: string }): string[] {
  return menu.hot_drinks ?? (menu.air_panas ? [menu.air_panas] : [])
}

export function getColdDrinks(menu: { cold_drinks?: string[] }): string[] {
  return menu.cold_drinks ?? []
}
