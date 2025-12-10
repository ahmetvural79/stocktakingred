import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Building2, Users, Warehouse, FileText, Package, TrendingUp, BarChart2 } from 'lucide-react'

type CompanyWithStats = {
  id: string
  name: string
  created_at: string
  users?: Array<{ count: number }>
  warehouses?: Array<{ count: number }>
  count_sessions?: Array<{ count: number }>
  erp_imports?: Array<{ count: number }>
}

export default async function CompanyManagementPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!currentUser || currentUser.role !== 'main_admin') {
    redirect('/dashboard')
  }

  const [
    totalCompaniesResponse,
    totalUsersResponse,
    totalWarehousesResponse,
    totalSessionsResponse,
    totalImportsResponse,
    companiesResponse,
  ] = await Promise.all([
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('warehouses').select('*', { count: 'exact', head: true }),
    supabase.from('count_sessions').select('*', { count: 'exact', head: true }),
    supabase.from('erp_imports').select('*', { count: 'exact', head: true }),
    supabase
      .from('companies')
      .select('id, name, created_at, users(count), warehouses(count), count_sessions(count), erp_imports(count)')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const totalCompanies = totalCompaniesResponse.count ?? 0
  const totalUsers = totalUsersResponse.count ?? 0
  const totalWarehouses = totalWarehousesResponse.count ?? 0
  const totalSessions = totalSessionsResponse.count ?? 0
  const totalImports = totalImportsResponse.count ?? 0

  const companies = (companiesResponse.data ?? []) as CompanyWithStats[]

  const getCount = (arr?: Array<{ count: number }>) => (arr && arr.length > 0 ? arr[0].count : 0)

  return (
    <DashboardLayout userName={currentUser.full_name || user.email} userRole={currentUser.role}>
      <div className="p-6 bg-white dark:bg-gray-900 min-h-screen">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Firma Yönetimi</h2>
          <p className="mt-2 text-gray-700 dark:text-gray-300">
            Sistem genelindeki tüm firmaları, kullanıcılarını ve aktivitelerini izleyin.
          </p>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Building2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Toplam Firma</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">{totalCompanies}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Toplam Kullanıcı</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">{totalUsers}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <Warehouse className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Toplam Depo</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">{totalWarehouses}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Sayım Listesi</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">{totalSessions}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Package className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">ERP Import</span>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-4">{totalImports}</p>
          </div>
        </div>

        {/* Company table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Firmalar</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Sistemde kayıtlı en son 50 firma listelenir.</p>
            </div>
            <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-300">
              <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400" />
              <span>Aktif şirket izleme</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    Firma
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    Depo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    Sayım Listesi
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    ERP Import
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    Oluşturulma
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-600 dark:text-gray-300">
                      Henüz firma bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  companies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">{company.name}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              ID: {company.id.slice(0, 8)} • {new Date(company.created_at).toLocaleDateString('tr-TR')}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {getCount(company.users)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {getCount(company.warehouses)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {getCount(company.count_sessions)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                        {getCount(company.erp_imports)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {new Date(company.created_at).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Analytics summary */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Genel Analitik</h3>
            <BarChart2 className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-700 dark:text-gray-300">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">Firma Başına Ortalama Kullanıcı</p>
              <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                {totalCompanies > 0 ? (totalUsers / totalCompanies).toFixed(1) : '0'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">Firma Başına Depo</p>
              <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                {totalCompanies > 0 ? (totalWarehouses / totalCompanies).toFixed(1) : '0'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">Firma Başına Sayım</p>
              <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                {totalCompanies > 0 ? (totalSessions / totalCompanies).toFixed(1) : '0'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-xs text-gray-600 dark:text-gray-400 uppercase">Firma Başına ERP Import</p>
              <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                {totalCompanies > 0 ? (totalImports / totalCompanies).toFixed(1) : '0'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


