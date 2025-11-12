'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Warehouse, ChevronRight } from 'lucide-react'
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

  const isMainAdmin = currentUser?.role === 'main_admin'
  const canManageWarehouses = !isMainAdmin || Boolean(selectedCompanyId)

  return (
    <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Depo Yönetimi</h2>
            <p className="mt-2 text-gray-600">Depoları, koridorları ve rafları yönetin.</p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:space-x-3">
            {isMainAdmin && (
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700" htmlFor="company-selector">
                  Firma
                </label>
                <select
                  id="company-selector"
                  value={selectedCompanyId ?? ''}
                  onChange={(event) => {
                    const value = event.target.value
                    setSelectedCompanyId(value ? value : null)
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
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
                  className="text-sm text-blue-600 hover:text-blue-800"
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
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-5 w-5" />
              <span>Yeni Depo</span>
            </button>
          </div>
        </div>

        {isMainAdmin && !selectedCompanyId && (
          <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            Lütfen depoları görüntülemek veya eklemek için bir firma seçin.
          </div>
        )}

        {/* Warehouses List */}
        {loading ? (
          <div className="py-12 text-center">Yükleniyor...</div>
        ) : warehouses.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center shadow">
            <Warehouse className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="mb-4 text-gray-500">Henüz depo eklenmemiş.</p>
            <button
              disabled={!canManageWarehouses}
              onClick={() => {
                if (!canManageWarehouses) {
                  return
                }
                setShowAddModal(true)
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              İlk Depoyu Ekle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {warehouses.map((warehouse) => (
              <Link
                key={warehouse.id}
                href={`/dashboard/warehouses/${warehouse.id}`}
                className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center space-x-2">
                      <Warehouse className="h-5 w-5 text-red-600" />
                      <h3 className="text-lg font-medium text-gray-900">{warehouse.name}</h3>
                    </div>
                    <p className="mb-1 text-sm text-gray-500">
                      Firma: {warehouse.company_name || 'Bilinmiyor'}
                    </p>
                    {warehouse.description && (
                      <p className="mb-4 text-sm text-gray-600">{warehouse.description}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Oluşturulma: {new Date(warehouse.created_at).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-4 text-xl font-bold">Yeni Depo Ekle</h3>
            <div className="space-y-4">
              {isMainAdmin && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Firma *</label>
                  <input
                    type="text"
                    value={selectedCompany?.name ?? 'Firma seçilmedi'}
                    readOnly
                    className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 focus:outline-none"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Depo Adı *
                </label>
                <input
                  type="text"
                  value={newWarehouseName}
                  onChange={(event) => setNewWarehouseName(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Örn: Ana Depo"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Açıklama</label>
                <textarea
                  value={newWarehouseDesc}
                  onChange={(event) => setNewWarehouseDesc(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
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
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleAddWarehouse}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

