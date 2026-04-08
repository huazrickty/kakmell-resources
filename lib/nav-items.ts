import { LayoutDashboard, CalendarPlus, Calculator, Settings, type LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/bookings/new', label: 'Booking Baru', icon: CalendarPlus },
  { href: '/calculator',   label: 'Kalkulator',   icon: Calculator },
  { href: '/settings',     label: 'Tetapan',      icon: Settings },
]
