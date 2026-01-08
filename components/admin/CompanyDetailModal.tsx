'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, User, Mail, Calendar, Building2, Users, Warehouse, FileText, Package } from 'lucide-react'

interface UserData {
  id: string
  email: string | null
  full_name: string | null
  role: 'admin' | 'manager' | 'user' | 'main_admin'
  created_at: string
}

interface CompanyStats {
  users: number
  warehouses: number
  count_sessions: number
  erp_imports: number
}

interface CompanyDetailModalProps {
  companyId: string
  companyName: string
  onClose: () => void
}

export default function CompanyDetailModal({ companyId, companyName, onClose }: CompanyDetailModalProps) {
  const [users, setUsers] = useState<UserData[]>([])
  const [stats, setStats] = useState<CompanyStats>({
    users: 0,
    warehouses: 0,
    count_sessions: 0,
    erp_imports: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadCompanyDetails()
  }, [companyId])

  const loadCompanyDetails = async () => {
    try {
      setLoading(true)
      
      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, role, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Load stats
      const [warehousesRes, sessionsRes, importsRes] = await Promise.all([
        supabase.from('warehouses').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('count_sessions').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
        supabase.from('erp_imports').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
      ])

      setUsers(usersData || [])
      setStats({
        users: usersData?.length || 0,
        warehouses: warehousesRes.count || 0,
        count_sessions: sessionsRes.count || 0,
        erp_imports: importsRes.count || 0,
      })
    } catch (error) {
      console.error('Error loading company details:', error)
      alert('Firma detayları yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      main_admin: 'Ana Admin',
      admin: 'Admin',
      manager: 'Yönetici',
      user: 'Kullanıcı',
    }
    return labels[role] || role
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      main_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      manager: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      user: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    }
    return colors[role] || colors.user
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{companyName}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Firma Detayları</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Yükleniyor...</p>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-300">Kullanıcılar</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.users}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Warehouse className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-900 dark:text-emerald-300">Depolar</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{stats.warehouses}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-purple-900 dark:text-purple-300">Sayım Listeleri</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.count_sessions}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-900 dark:text-amber-300">ERP Import</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.erp_imports}</p>
                </div>
              </div>

              {/* Users List */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kullanıcılar</h4>
                {users.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Bu firmada henüz kullanıcı bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {user.full_name || 'İsimsiz Kullanıcı'}
                                </p>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}
                                >
                                  {getRoleLabel(user.role)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
                                {user.email && (
                                  <div className="flex items-center space-x-1">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate">{user.email}</span>
                                  </div>
                                )}
                                <div className="flex items-center space-x-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {new Date(user.created_at).toLocaleDateString('tr-TR', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}




