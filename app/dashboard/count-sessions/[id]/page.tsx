import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CountSessionDetail from '@/components/count-sessions/CountSessionDetail'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CountSessionDetailPage({ params }: PageProps) {
  const { id } = await params
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

  // Get count session
  const { data: session } = await supabase
    .from('count_sessions')
    .select(`
      *,
      warehouses (
        name
      ),
      users (
        full_name
      )
    `)
    .eq('id', id)
    .single()

  if (!session) {
    redirect('/dashboard/count-sessions')
  }

  return (
    <DashboardLayout
      userName={userData?.full_name || user.email || undefined}
      companyName={companyName}
      userRole={userData?.role}
    >
      <CountSessionDetail sessionId={id} />
    </DashboardLayout>
  )
}

