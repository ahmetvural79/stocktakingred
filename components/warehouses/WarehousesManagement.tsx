'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Warehouse, Edit, Trash2, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface WarehouseData {
  id: string
  name: string
  description: string | null
  created_at: string
}

export default function WarehousesManagement() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newWarehouseName, setNewWarehouseName] = useState('')
  const [newWarehouseDesc, setNewWarehouseDesc] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadWarehouses()
  }, [])

  const loadWarehouses = async () => {
    try {
      // First get user's company_id using a direct query (bypasses RLS recursion)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Kullanıcı oturumu bulunamadı')
      }

      // Get user's company_id - this should work with the fixed RLS policy
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (userError || !userData?.company_id) {
        throw new Error('Firma bilgisi alınamadı')
      }

      // Now load warehouses filtered by company_id
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('company_id', userData.company_id)
        .order('name')

      if (error) throw error
      if (data) {
        setWarehouses(data as WarehouseData[])
      }
    } catch (error) {
      console.error('Error loading warehouses:', error)
      alert('Depolar yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleAddWarehouse = async () => {
    if (!newWarehouseName.trim()) {
      alert('Lütfen depo adı girin')
      return
    }

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error('Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.')
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (userError) {
        throw new Error(`Kullanıcı bilgisi alınamadı: ${userError.message}`)
      }

      if (!userData?.company_id) {
        throw new Error('Firma bilgisi bulunamadı. Lütfen kullanıcı ayarlarını kontrol edin.')
      }

      const { data, error: insertError } = await supabase
        .from('warehouses')
        .insert({
          company_id: userData.company_id,
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
      await loadWarehouses()
    } catch (error: any) {
      console.error('Error adding warehouse:', error)
      alert(error.message || 'Depo ekleme hatası. Lütfen tekrar deneyin.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">
                <span className="text-red-600">the</span>
                <span className="text-black">Stocktaking</span>
                <span className="text-red-600"> Red</span>
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Depo Yönetimi</h2>
            <p className="mt-2 text-gray-600">Depoları, koridorları ve rafları yönetin.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            <span>Yeni Depo</span>
          </button>
        </div>

        {/* Warehouses List */}
        {loading ? (
          <div className="text-center py-12">Yükleniyor...</div>
        ) : warehouses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Warehouse className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Henüz depo eklenmemiş.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              İlk Depoyu Ekle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {warehouses.map((warehouse) => (
              <Link
                key={warehouse.id}
                href={`/dashboard/warehouses/${warehouse.id}`}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Warehouse className="h-5 w-5 text-red-600" />
                      <h3 className="text-lg font-medium text-gray-900">{warehouse.name}</h3>
                    </div>
                    {warehouse.description && (
                      <p className="text-sm text-gray-600 mb-4">{warehouse.description}</p>
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
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold mb-4">Yeni Depo Ekle</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Depo Adı *
                </label>
                <input
                  type="text"
                  value={newWarehouseName}
                  onChange={(e) => setNewWarehouseName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Örn: Ana Depo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıklama
                </label>
                <textarea
                  value={newWarehouseDesc}
                  onChange={(e) => setNewWarehouseDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleAddWarehouse}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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

