import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UsersManagement from '@/components/users/UsersManagement'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default async function UsersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin and get user data
  const { data: userData } = await supabase
    .from('users')
    .select('role, company_id, full_name, companies(name)')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin' && userData?.role !== 'main_admin') {
    redirect('/dashboard')
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
      <UsersManagement />
    </DashboardLayout>
  )
}

