import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package, FileText, Barcode, Users, Warehouse, BarChart3, TrendingUp, Clock, CheckCircle2 } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default async function DashboardPage() {
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
    // main_admin users may not have a company_id
    if (userData?.role !== 'main_admin') {
      redirect('/login')
    }
  }

  const isMainAdmin = userData.role === 'main_admin'

  // Get real statistics
  const [
    countSessionsCountResponse,
    erpImportsCountResponse,
    matchedItemsCountResponse,
    pendingItemsCountResponse,
    warehousesCountResponse,
    usersCountResponse,
  ] = await Promise.all([
    (isMainAdmin
      ? supabase.from('count_sessions').select('*', { count: 'exact', head: true })
      : supabase
          .from('count_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userData.company_id)),
    (isMainAdmin
      ? supabase.from('erp_imports').select('*', { count: 'exact', head: true })
      : supabase
          .from('erp_imports')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userData.company_id)),
    supabase.from('match_results').select('*', { count: 'exact', head: true }).eq('status', 'matched'),
    supabase.from('match_results').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    (isMainAdmin
      ? supabase.from('warehouses').select('*', { count: 'exact', head: true })
      : supabase
          .from('warehouses')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userData.company_id)),
    (isMainAdmin
      ? supabase.from('users').select('*', { count: 'exact', head: true })
      : supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', userData.company_id)),
  ])

  const countSessionsCount = countSessionsCountResponse.count ?? 0
  const erpImportsCount = erpImportsCountResponse.count ?? 0
  const matchedItemsCount = matchedItemsCountResponse.count ?? 0
  const pendingItemsCount = pendingItemsCountResponse.count ?? 0
  const warehousesCount = warehousesCountResponse.count ?? 0
  const usersCount = usersCountResponse.count ?? 0

  // Get recent activities
  const recentSessionsQuery = supabase
    .from('count_sessions')
    .select('id, created_at, status, warehouses(name), users(full_name)')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: recentSessions } = isMainAdmin
    ? await recentSessionsQuery
    : await recentSessionsQuery.eq('company_id', userData.company_id)

  const { data: recentMatches } = await supabase
    .from('match_results')
    .select('id, matched_at, count_items(product_name), erp_items(product_code)')
    .eq('status', 'matched')
    .order('matched_at', { ascending: false })
    .limit(5)

  const stats = [
    {
      name: 'Sayım Listeleri',
      value: countSessionsCount.toString(),
      icon: FileText,
      href: '/dashboard/count-sessions',
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'increase',
    },
    {
      name: 'ERP Import',
      value: erpImportsCount.toString(),
      icon: Package,
      href: '/dashboard/erp-import',
      color: 'bg-green-500',
      change: 'Toplam',
      changeType: 'neutral',
    },
    {
      name: 'Eşleştirildi',
      value: matchedItemsCount.toString(),
      icon: CheckCircle2,
      href: '/dashboard/matching',
      color: 'bg-purple-500',
      change: `${pendingItemsCount} bekliyor`,
      changeType: 'neutral',
    },
    {
      name: 'Barkodlama',
      value: matchedItemsCount.toString(),
      icon: Barcode,
      href: '/dashboard/barcoding',
      color: 'bg-orange-500',
      change: 'Hazır',
      changeType: 'neutral',
    },
    {
      name: 'Depolar',
      value: warehousesCount.toString(),
      icon: Warehouse,
      href: '/dashboard/warehouses',
      color: 'bg-indigo-500',
      change: 'Aktif',
      changeType: 'neutral',
    },
    {
      name: 'Kullanıcılar',
      value: usersCount.toString(),
      icon: Users,
      href: '/dashboard/users',
      color: 'bg-pink-500',
      change: 'Toplam',
      changeType: 'neutral',
    },
  ]

  const companyName = !isMainAdmin
    ? (typeof userData?.companies === 'object' && userData.companies !== null
        ? (userData.companies as { name?: string }).name
        : undefined)
    : undefined

  return (
    <DashboardLayout
      userName={userData?.full_name || user.email}
      companyName={companyName}
      userRole={userData.role}
    >
      <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
          <p className="mt-2 text-gray-700 dark:text-gray-300">
            Depo sayım sistemine hoş geldiniz
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Link
                key={stat.name}
                href={stat.href}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-all border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className={`text-xs font-medium ${
                    stat.changeType === 'increase' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </Link>
            )
          })}
        </div>

        {/* Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sessions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Son Sayım Listeleri</h3>
              <Clock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <div className="space-y-3">
              {recentSessions && recentSessions.length > 0 ? (
                recentSessions.map((session: any) => (
                  <div key={session.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {session.warehouses?.name || 'Depo'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {session.users?.full_name || 'Kullanıcı'} • {new Date(session.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      session.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300 text-center py-4">Henüz sayım listesi yok</p>
              )}
            </div>
          </div>

          {/* Recent Matches */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Son Eşleştirmeler</h3>
              <TrendingUp className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <div className="space-y-3">
              {recentMatches && recentMatches.length > 0 ? (
                recentMatches.map((match: any) => (
                  <div key={match.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {match.count_items?.product_name || 'Ürün'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        ERP: {match.erp_items?.product_code || 'N/A'}
                      </p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400 flex-shrink-0 ml-2" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300 text-center py-4">Henüz eşleştirme yok</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

