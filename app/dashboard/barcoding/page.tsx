import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BarcodingPanel from '@/components/barcoding/BarcodingPanel'

export default async function BarcodingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <BarcodingPanel />
}

