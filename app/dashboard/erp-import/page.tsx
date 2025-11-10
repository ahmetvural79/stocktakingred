import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ERPImportPanel from '@/components/erp-import/ERPImportPanel'

export default async function ERPImportPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <ERPImportPanel />
}

