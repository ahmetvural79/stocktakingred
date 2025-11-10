import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WarehousesManagement from '@/components/warehouses/WarehousesManagement'

export default async function WarehousesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <WarehousesManagement />
}

