'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { logoutAction, refreshRoleAction } from '@/app/actions/auth'
import { Clock, LogOut } from 'lucide-react'

const POLL_INTERVAL_MS = 30_000 // 30 seconds

export default function PendingPage() {
  const router = useRouter()

  // Check if role has been updated by admin — redirect if approved
  const checkRole = useCallback(async () => {
    const role = await refreshRoleAction()

    if (!role) {
      // Session expired
      router.push('/login')
      return
    }

    if (role !== 'pending') {
      toast.success('Akaun anda telah diluluskan! Selamat datang.')
      if (role === 'hall_staff' || role === 'hall_owner') {
        router.push('/hall-view')
      } else {
        router.push('/dashboard')
      }
    }
  }, [router])

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkRole, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [checkRole])

  async function handleLogout() {
    await logoutAction()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">

      {/* Brand */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-green-600 rounded-2xl mb-4">
          <span className="text-white text-2xl font-bold">K</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">KAKMELL RESOURCES</h1>
        <p className="text-sm text-gray-500 mt-1">Sistem Pengurusan Katering</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">

        {/* Animated clock icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-5">
          <Clock size={28} className="text-orange-500" />
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-2">
          Akaun Dalam Semakan
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Terima kasih kerana mendaftar. Akaun anda sedang disemak oleh admin.
          Anda akan diberitahu dan halaman ini akan dikemaskini secara automatik
          sebaik sahaja akaun anda diluluskan.
        </p>

        {/* Pulsing indicator */}
        <div className="flex items-center justify-center gap-2 mt-6 mb-6">
          <span className="inline-block w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
          <span className="text-xs text-gray-500">Sedang menunggu kelulusan…</span>
        </div>

        <p className="text-xs text-gray-400 mb-6">
          Status dikemaskini setiap 30 saat secara automatik.
        </p>

        <button
          onClick={handleLogout}
          className="w-full min-h-[48px] border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut size={15} />
          Log Keluar
        </button>
      </div>
    </div>
  )
}
