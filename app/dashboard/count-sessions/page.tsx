import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CountSessionsList from '@/components/count-sessions/CountSessionsList'

export default async function CountSessionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <CountSessionsList />
}

