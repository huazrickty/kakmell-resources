import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase'

export default async function RootPage() {
  // Check if there's an active session
  const supabase = await createSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Route based on role cookie (set at login, refreshed by middleware)
  const cookieStore = await cookies()
  const role = cookieStore.get('kakmell_role')?.value

  if (!role || role === 'pending') redirect('/pending')
  if (role === 'hall_staff' || role === 'hall_owner') redirect('/hall-view')
  redirect('/dashboard')
}
