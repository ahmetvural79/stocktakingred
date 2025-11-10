'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, ArrowLeft, Edit, Trash2, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface CorridorData {
  id: string
  name: string
  created_at: string
  shelves_count?: number
}

interface WarehouseData {
  id: string
  name: string
  description: string | null
}

export default function WarehouseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const warehouseId = params.id as string
  const [warehouse, setWarehouse] = useState<WarehouseData | null>(null)
  const [corridors, setCorridors] = useState<CorridorData[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddCorridorModal, setShowAddCorridorModal] = useState(false)
  const [newCorridorName, setNewCorridorName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (warehouseId) {
      loadWarehouse()
      loadCorridors()
    }
  }, [warehouseId])

  const loadWarehouse = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', warehouseId)
        .single()

      if (error) throw error
      setWarehouse(data as WarehouseData)
    } catch (error) {
      console.error('Error loading warehouse:', error)
      alert('Depo bilgisi yüklenemedi')
    }
  }

  const loadCorridors = async () => {
    try {
      const { data, error } = await supabase
        .from('corridors')
        .select(`
          *,
          shelves_aggregate: shelves(count)
        `)
        .eq('warehouse_id', warehouseId)
        .order('name')

      if (error) throw error
      
      const formattedData = (data || []).map((corridor: any) => ({
        id: corridor.id,
        name: corridor.name,
        created_at: corridor.created_at,
        shelves_count: corridor.shelves_aggregate?.[0]?.count || 0,
      }))
      
      setCorridors(formattedData)
    } catch (error) {
      console.error('Error loading corridors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCorridor = async () => {
    if (!newCorridorName.trim()) {
      alert('Lütfen koridor adı girin')
      return
    }

    try {
      const { data, error } = await supabase
        .from('corridors')
        .insert({
          warehouse_id: warehouseId,
          name: newCorridorName.trim(),
        })
        .select()

      if (error) {
        console.error('Insert error:', error)
        throw new Error(`Koridor eklenemedi: ${error.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error('Koridor eklenemedi: Veri döndürülmedi')
      }

      setNewCorridorName('')
      setShowAddCorridorModal(false)
      await loadCorridors()
    } catch (error: any) {
      console.error('Error adding corridor:', error)
      alert(error.message || 'Koridor ekleme hatası. Lütfen tekrar deneyin.')
    }
  }

  const handleDeleteCorridor = async (corridorId: string) => {
    if (!confirm('Bu koridoru silmek istediğinizden emin misiniz? Tüm raflar da silinecektir.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('corridors')
        .delete()
        .eq('id', corridorId)

      if (error) throw error
      await loadCorridors()
    } catch (error: any) {
      console.error('Error deleting corridor:', error)
      alert(`Koridor silinemedi: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    )
  }

  if (!warehouse) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Depo bulunamadı</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/warehouses"
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{warehouse.name}</h1>
                {warehouse.description && (
                  <p className="text-sm text-gray-600 mt-1">{warehouse.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Koridorlar</h2>
            <p className="mt-2 text-gray-600">Koridorları ve rafları yönetin.</p>
          </div>
          <button
            onClick={() => setShowAddCorridorModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            <span>Yeni Koridor</span>
          </button>
        </div>

        {/* Corridors List */}
        {corridors.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">Henüz koridor eklenmemiş.</p>
            <button
              onClick={() => setShowAddCorridorModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              İlk Koridoru Ekle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {corridors.map((corridor) => (
              <div
                key={corridor.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{corridor.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {corridor.shelves_count || 0} raf
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      href={`/dashboard/warehouses/${warehouseId}/corridors/${corridor.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                    <button
                      onClick={() => handleDeleteCorridor(corridor.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <Link
                  href={`/dashboard/warehouses/${warehouseId}/corridors/${corridor.id}`}
                  className="block w-full text-center py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Detayları Gör
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Corridor Modal */}
      {showAddCorridorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold mb-4">Yeni Koridor Ekle</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Koridor Adı *
                </label>
                <input
                  type="text"
                  value={newCorridorName}
                  onChange={(e) => setNewCorridorName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Örn: Koridor A"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCorridor()
                    }
                  }}
                />
              </div>
            </div>
            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => {
                  setShowAddCorridorModal(false)
                  setNewCorridorName('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleAddCorridor}
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

