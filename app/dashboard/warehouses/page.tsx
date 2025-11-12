import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import WarehousesManagement from '@/components/warehouses/WarehousesManagement'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default async function WarehousesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's company info
  const { data: userData } = await supabase
    .from('users')
    .select('company_id, role, full_name, companies(name)')
    .eq('id', user.id)
    .single()

  if (!userData?.company_id) {
    if (userData?.role !== 'main_admin') {
      redirect('/login')
    }
  }

  const companyName = !userData?.role || userData.role !== 'main_admin'
    ? (typeof userData?.companies === 'object' && userData.companies !== null
        ? (userData.companies as { name?: string }).name
        : undefined)
    : undefined

  return (
    <DashboardLayout
      userName={userData?.full_name || user.email || undefined}
      companyName={companyName}
      userRole={userData?.role}
    >
      <WarehousesManagement />
    </DashboardLayout>
  )
}

