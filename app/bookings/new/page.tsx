import { Suspense } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { SideNav } from '@/components/side-nav'
import { BottomNav } from '@/components/bottom-nav'
import { BookingForm } from './booking-form'

export default async function NewBookingPage() {
  // Fetch active halls from DB; fall back to defaults if table not seeded yet
  const { data: hallRows } = await supabaseAdmin
    .from('halls')
    .select('name')
    .eq('is_active', true)
    .order('name')

  const halls = hallRows?.map(r => r.name) ?? [
    'Asmara Hall',
    'Juwita Hall',
    'Elham Hall',
  ]

  return (
    <>
      <SideNav />
      {/* BookingForm renders its own header + content; it needs sidebar offset */}
      <div className="lg:pl-64">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <p className="text-sm text-gray-400">Memuatkan borang…</p>
          </div>
        }>
          <BookingForm halls={halls} />
        </Suspense>
      </div>
      <BottomNav />
    </>
  )
}
