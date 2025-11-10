import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MatchingPanel from '@/components/matching/MatchingPanel'

export default async function MatchingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <MatchingPanel />
}

