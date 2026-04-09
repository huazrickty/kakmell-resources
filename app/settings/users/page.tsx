import { redirect } from 'next/navigation'
import { getUsersAction, type UserProfileRow } from '@/app/actions/auth'
import { SideNav } from '@/components/side-nav'
import { BottomNav } from '@/components/bottom-nav'
import { UsersClient } from './users-client'
import { Users } from 'lucide-react'

// Server component — fetches data with supabaseAdmin, no RLS issues
export default async function UsersPage() {
  const result = await getUsersAction()

  if ('error' in result) {
    // Not admin or session expired — middleware should have caught this,
    // but handle gracefully
    redirect('/dashboard')
  }

  const pendingCount = result.users.filter((u: UserProfileRow) => u.role === 'pending').length

  return (
    <>
      <SideNav />
      <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8 lg:pl-64">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center gap-3 px-4 lg:px-8 py-3 max-w-3xl mx-auto">
            <Users size={20} className="text-green-600 shrink-0" />
            <div className="flex-1">
              <h1 className="text-base font-bold text-gray-900">Pengurusan Pengguna</h1>
              <p className="text-xs text-gray-400">Luluskan &amp; urus peranan staf</p>
            </div>
            {pendingCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 bg-orange-500 text-white text-xs font-bold rounded-full">
                {pendingCount}
              </span>
            )}
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-5">
          <UsersClient initialUsers={result.users} />
        </div>
      </div>
      <BottomNav />
    </>
  )
}
