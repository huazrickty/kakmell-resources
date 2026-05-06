import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { toast } from 'sonner'
import { auth } from '@/lib/firebase'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function Login() {
  const { t, toggleLang } = useLanguage()
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
    <div className="relative flex min-h-screen items-center justify-center bg-[#FAFAF8] p-4">
      <button
        onClick={toggleLang}
        className="absolute top-4 right-4 text-sm font-medium text-[#1B4332] hover:underline"
        type="button"
      >
        {t('lang.toggle')}
      </button>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-0">
          <p className="text-xl font-bold tracking-wide text-[#1B4332]">KAKMELL RESOURCES</p>
          <CardTitle className="text-base text-muted-foreground font-normal mt-1">
            {t('auth.login.title')}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t('auth.login.email')}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t('auth.login.password')}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 bg-[#1B4332] text-white hover:bg-[#1B4332]/90 h-10"
            >
              {loading ? '...' : t('auth.login.submit')}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center gap-1 text-sm text-muted-foreground">
          <span>{t('auth.login.noAccount')}</span>
          <Link to="/register" className="font-medium text-[#1B4332] hover:underline">
            {t('auth.login.register')}
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
