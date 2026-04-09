'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { registerAction } from '@/app/actions/auth'
import { UserPlus } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName || !email || !password) return
    if (password.length < 6) {
      toast.error('Kata laluan mestilah sekurang-kurangnya 6 aksara.')
      return
    }

    setLoading(true)
    const result = await registerAction(fullName.trim(), email.trim(), password)
    setLoading(false)

    if ('error' in result) {
      toast.error(result.error)
      return
    }

    toast.success('Akaun berjaya didaftarkan! Sila tunggu kelulusan admin.')
    router.push('/pending')
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
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">Daftar Akaun</h2>
        <p className="text-xs text-gray-500 mb-5">
          Selepas daftar, admin akan luluskan akaun anda.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nama Penuh
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Cth: Siti Aminah"
              required
              autoComplete="name"
              className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              E-mel
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="contoh@email.com"
              required
              autoComplete="email"
              className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Kata Laluan
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Sekurang-kurangnya 6 aksara"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full min-h-[48px] border border-gray-300 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !fullName || !email || !password}
            className="w-full min-h-[48px] bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <UserPlus size={16} />
            )}
            {loading ? 'Mendaftar…' : 'Daftar'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          Sudah ada akaun?{' '}
          <Link href="/login" className="text-green-600 font-medium hover:underline">
            Log masuk
          </Link>
        </p>
      </div>
    </div>
  )
}
