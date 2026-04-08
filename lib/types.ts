export interface Booking {
  id: string
  client_name: string
  event_date: string        // ISO date string "YYYY-MM-DD"
  hall_name: string | null
  pax: number
  package_price: number | null
  addons: { name: string; price: number }[]
  total_amount: number | null
  deposit_paid: number
  payments: { date: string; amount: number; note?: string }[]
  balance: number | null    // generated: total_amount - deposit_paid
  status: 'confirmed' | 'completed' | 'cancelled'
  notes: string | null
  tentative: string | null
  menu_selection: Record<string, string | string[]> | null
  created_at: string
}
