'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Warehouse, ChevronRight, Trash2, X } from 'lucide-react'
import Link from 'next/link'

interface CompanyData {
  id: string
  name: string
}

type UserRole = 'main_admin' | 'admin' | 'manager' | 'user'

interface CurrentUser {
  id: string
  role: UserRole
  company_id: string | null
}

interface WarehouseData {
  id: string
  name: string
  description: string | null
  created_at: string
  company_id: string
  company_name: string | null
}

export default function WarehousesManagement() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newWarehouseName, setNewWarehouseName] = useState('')
  const [newWarehouseDesc, setNewWarehouseDesc] = useState('')
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [companies, setCompanies] = useState<CompanyData[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [warehouseToDelete, setWarehouseToDelete] = useState<WarehouseData | null>(null)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  )

  const loadWarehousesForCompany = async (companyId: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('warehouses')
        .select(
          `
            id,
            name,
            description,
            created_at,
            company_id,
            companies (
              id,
              name
            )
          `
        )
        .eq('company_id', companyId)
        .order('name')

      if (error) {
        throw error
      }

      const formattedData = (data || []).map((warehouse: any) => ({
        id: warehouse.id,
        name: warehouse.name,
        description: warehouse.description,
        created_at: warehouse.created_at,
        company_id: warehouse.company_id,
        company_name: warehouse.companies?.name ?? null,
      }))

      setWarehouses(formattedData)
    } catch (error) {
      console.error('Error loading warehouses:', error)
      alert('Depolar yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
          throw new Error('Kullanıcı oturumu bulunamadı')
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, role, company_id')
          .eq('id', user.id)
          .single()

        if (userError || !userData) {
          throw new Error(userError?.message || 'Kullanıcı bilgisi alınamadı')
        }

        const normalizedUser: CurrentUser = {
          id: userData.id,
          role: userData.role as UserRole,
          company_id: userData.company_id,
        }

        setCurrentUser(normalizedUser)

        if (normalizedUser.role === 'main_admin') {
          const { data: companiesData, error: companiesError } = await supabase
            .from('companies')
            .select('id, name')
            .order('name')

          if (companiesError) {
            throw companiesError
          }

          setCompanies(companiesData || [])
          const initialCompanyId =
            companiesData && companiesData.length > 0 ? companiesData[0].id : null
          setSelectedCompanyId((prev) => prev ?? initialCompanyId)
        }
      } catch (error) {
        console.error('Error loading user context:', error)
        alert(
          error instanceof Error
            ? error.message
            : 'Kullanıcı bilgileri yüklenemedi. Lütfen tekrar deneyin.'
        )
        setLoading(false)
      }
    }

    bootstrap()
  }, [supabase])

  useEffect(() => {
    if (!currentUser) {
      return
    }

    if (currentUser.role === 'main_admin') {
      if (!selectedCompanyId) {
        setWarehouses([])
        setLoading(false)
        return
      }

      void loadWarehousesForCompany(selectedCompanyId)
      return
    }

    if (!currentUser.company_id) {
      alert('Firma bilgisi alınamadı')
      setWarehouses([])
      setLoading(false)
      return
    }

    void loadWarehousesForCompany(currentUser.company_id)
  }, [currentUser, selectedCompanyId])

  const handleAddWarehouse = async () => {
    if (!newWarehouseName.trim()) {
      alert('Lütfen depo adı girin')
      return
    }

    const targetCompanyId =
      currentUser?.role === 'main_admin' ? selectedCompanyId : currentUser?.company_id

    if (!targetCompanyId) {
      alert('Lütfen bir firma seçin')
      return
    }

    try {
      const { data, error: insertError } = await supabase
        .from('warehouses')
        .insert({
          company_id: targetCompanyId,
          name: newWarehouseName.trim(),
          description: newWarehouseDesc.trim() || null,
        })
        .select()

      if (insertError) {
        console.error('Insert error:', insertError)
        throw new Error(`Depo eklenemedi: ${insertError.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error('Depo eklenemedi: Veri döndürülmedi')
      }

      setNewWarehouseName('')
      setNewWarehouseDesc('')
      setShowAddModal(false)
      await loadWarehousesForCompany(targetCompanyId)
    } catch (error: any) {
      console.error('Error adding warehouse:', error)
      alert(error.message || 'Depo ekleme hatası. Lütfen tekrar deneyin.')
    }
  }

  const handleDeleteWarehouse = (warehouse: WarehouseData) => {
    console.log('Delete warehouse clicked:', warehouse)
    setWarehouseToDelete(warehouse)
    setShowDeleteModal(true)
  }

  const confirmDeleteWarehouse = async () => {
    if (!warehouseToDelete) {
      console.error('No warehouse selected for deletion')
      return
    }

    console.log('Confirming deletion of warehouse:', warehouseToDelete.id)
    setDeleting(true)
    
    try {
      // Check if warehouse has related data
      // 1. Check for corridors
      const { data: corridors, error: corridorsError } = await supabase
        .from('corridors')
        .select('id')
        .eq('warehouse_id', warehouseToDelete.id)
        .limit(1)

      if (corridorsError) {
        console.error('Corridors check error:', corridorsError)
        throw new Error(`Koridor kontrolü yapılamadı: ${corridorsError.message}`)
      }

      if (corridors && corridors.length > 0) {
        alert('Bu depoda koridorlar bulunmaktadır. Önce koridorları silmeniz gerekmektedir.')
        setDeleting(false)
        setShowDeleteModal(false)
        setWarehouseToDelete(null)
        return
      }

      // 2. Check for count sessions
      const { data: countSessions, error: sessionsError } = await supabase
        .from('count_sessions')
        .select('id')
        .eq('warehouse_id', warehouseToDelete.id)
        .limit(1)

      if (sessionsError) {
        console.error('Count sessions check error:', sessionsError)
        throw new Error(`Sayım oturumu kontrolü yapılamadı: ${sessionsError.message}`)
      }

      if (countSessions && countSessions.length > 0) {
        alert('Bu depoda sayım oturumları bulunmaktadır. Depo silinemez.')
        setDeleting(false)
        setShowDeleteModal(false)
        setWarehouseToDelete(null)
        return
      }

      console.log('Deleting warehouse:', warehouseToDelete.id)
      
      // Delete warehouse
      const { error: deleteError } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', warehouseToDelete.id)

      if (deleteError) {
        console.error('Delete error:', deleteError)
        throw new Error(`Depo silinemedi: ${deleteError.message}`)
      }

      console.log('Warehouse deleted successfully')

      // Reload warehouses
      const targetCompanyId =
        currentUser?.role === 'main_admin' ? selectedCompanyId : currentUser?.company_id
      
      if (targetCompanyId) {
        await loadWarehousesForCompany(targetCompanyId)
      } else {
        // Fallback: reload current warehouses
        setWarehouses((prev) => prev.filter((w) => w.id !== warehouseToDelete.id))
      }

      setShowDeleteModal(false)
      setWarehouseToDelete(null)
    } catch (error: any) {
      console.error('Error deleting warehouse:', error)
      alert(error.message || 'Depo silinirken hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setDeleting(false)
    }
  }

  const isMainAdmin = currentUser?.role === 'main_admin'
  const canManageWarehouses = !isMainAdmin || Boolean(selectedCompanyId)

  return (
    <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Depo Yönetimi</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Depoları, koridorları ve rafları yönetin.</p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:space-x-3">
            {isMainAdmin && (
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="company-selector">
                  Firma
                </label>
                <select
                  id="company-selector"
                  value={selectedCompanyId ?? ''}
                  onChange={(event) => {
                    const value = event.target.value
                    setSelectedCompanyId(value ? value : null)
                  }}
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                >
                  <option value="">Firma Seçin</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                <Link
                  href="/dashboard/admin/companies"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  Firma Yönetimi
                </Link>
              </div>
            )}
            <button
              disabled={!canManageWarehouses}
              onClick={() => {
                if (!canManageWarehouses) {
                  return
                }
                setShowAddModal(true)
              }}
              className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Yeni Depo</span>
            </button>
          </div>
        </div>

        {isMainAdmin && !selectedCompanyId && (
          <div className="mb-4 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/30 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-200">
            Lütfen depoları görüntülemek veya eklemek için bir firma seçin.
          </div>
        )}

        {/* Warehouses List */}
        {loading ? (
          <div className="py-12 text-center">Yükleniyor...</div>
        ) : warehouses.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center shadow-sm">
            <Warehouse className="mx-auto mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
            <p className="mb-4 text-gray-500 dark:text-gray-400">Henüz depo eklenmemiş.</p>
            <button
              disabled={!canManageWarehouses}
              onClick={() => {
                if (!canManageWarehouses) {
                  return
                }
                setShowAddModal(true)
              }}
              className="rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2 text-white hover:bg-blue-700 dark:hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              İlk Depoyu Ekle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {warehouses.map((warehouse) => (
              <div
                key={warehouse.id}
                className="relative rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <Link
                  href={`/dashboard/warehouses/${warehouse.id}`}
                  className="block"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-8">
                      <div className="mb-2 flex items-center space-x-2">
                        <Warehouse className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{warehouse.name}</h3>
                      </div>
                      <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                        Firma: {warehouse.company_name || 'Bilinmiyor'}
                      </p>
                      {warehouse.description && (
                        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">{warehouse.description}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Oluşturulma: {new Date(warehouse.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1" />
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.log('Delete button clicked for warehouse:', warehouse.id)
                    handleDeleteWarehouse(warehouse)
                  }}
                  className="absolute bottom-3 right-3 z-20 rounded-lg bg-red-50 dark:bg-red-900/30 p-2 text-red-600 dark:text-red-400 shadow-sm transition-all hover:bg-red-100 dark:hover:bg-red-900/50 hover:shadow-md active:bg-red-200 dark:active:bg-red-900/40"
                  title="Depoyu Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h3 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Yeni Depo Ekle</h3>
            <div className="space-y-4">
              {isMainAdmin && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Firma *</label>
                  <input
                    type="text"
                    value={selectedCompany?.name ?? 'Firma seçilmedi'}
                    readOnly
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-800 dark:text-white focus:outline-none"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Depo Adı *
                </label>
                <input
                  type="text"
                  value={newWarehouseName}
                  onChange={(event) => setNewWarehouseName(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 font-medium text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                  placeholder="Örn: Ana Depo"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Açıklama</label>
                <textarea
                  value={newWarehouseDesc}
                  onChange={(event) => setNewWarehouseDesc(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 font-medium text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
                  rows={3}
                  placeholder="Opsiyonel açıklama"
                />
              </div>
            </div>
            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewWarehouseName('')
                  setNewWarehouseDesc('')
                }}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleAddWarehouse}
                className="flex-1 rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2 text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && warehouseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-red-600 dark:text-red-400">Depo Sil</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setWarehouseToDelete(null)
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-200 mb-2">
                <strong className="text-gray-900 dark:text-gray-100">"{warehouseToDelete.name}"</strong> deposunu silmek istediğinize emin misiniz?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Bu işlem geri alınamaz. Depo ile birlikte tüm koridorlar ve raflar silinecektir.
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                ⚠️ Eğer bu depoda sayım oturumları varsa, depo silinemez.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setWarehouseToDelete(null)
                }}
                disabled={deleting}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={confirmDeleteWarehouse}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 dark:bg-red-500 px-4 py-2 text-white hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

