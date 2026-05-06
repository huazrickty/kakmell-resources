import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { toast } from 'sonner'
import { auth } from '@/lib/firebase'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function Login() {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // Redirect handled automatically by PublicOnly guard in router
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password'
      ) {
        toast.error(t('auth.login.error.invalidCredentials'))
      } else {
        toast.error(t('auth.login.error.generic'))
      }
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#F7F5F2] p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl border border-gray-100 p-8">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="KAKMELL RESOURCES" className="h-14 mx-auto mb-4 object-contain" />
          <p className="text-sm text-gray-500">{t('auth.login.title')}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-gray-700">{t('auth.login.email')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus-visible:ring-red-500 focus-visible:border-red-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-gray-700">{t('auth.login.password')}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="focus-visible:ring-red-500 focus-visible:border-red-500"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="mt-2 bg-red-600 hover:bg-red-700 text-white h-10"
          >
            {loading ? '...' : t('auth.login.submit')}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          {t('auth.login.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-red-600 hover:underline">
            {t('auth.login.register')}
          </Link>
        </p>
      </div>
    </div>
  )
}
