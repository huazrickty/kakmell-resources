import { useNavigate } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function Pending() {
  const { signOut, loading } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-[#1B4332]" />
      </div>
    )
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF8] p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1B4332]/10 mb-2">
            <Clock className="h-7 w-7 text-[#1B4332]" />
          </div>
          <CardTitle className="text-lg">{t('auth.pending.title')}</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>{t('auth.pending.message')}</p>
          <p className="font-medium text-foreground">{t('auth.pending.contact')}</p>
        </CardContent>

        <CardFooter className="justify-center">
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="text-[#1B4332] border-[#1B4332]/30 hover:bg-[#1B4332]/5"
          >
            {t('auth.pending.signOut')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
