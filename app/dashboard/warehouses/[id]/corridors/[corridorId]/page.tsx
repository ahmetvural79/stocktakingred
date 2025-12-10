'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface ShelfData {
  id: string
  name: string
  created_at: string
}

interface CorridorData {
  id: string
  name: string
  warehouse: {
    id: string
    name: string
    company_name: string | null
  }
}

export default function CorridorDetailPage() {
  const params = useParams()
  const warehouseId = params.id as string
  const corridorId = params.corridorId as string
  const [corridor, setCorridor] = useState<CorridorData | null>(null)
  const [shelves, setShelves] = useState<ShelfData[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddShelfModal, setShowAddShelfModal] = useState(false)
  const [newShelfName, setNewShelfName] = useState('')
  const supabase = createClient()

  const loadCorridor = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('corridors')
        .select(`
          id,
          name,
          warehouses (
            id,
            name,
            companies (
              id,
              name
            )
          )
        `)
        .eq('id', corridorId)
        .single()

      if (error) throw error
      
      // Handle warehouses as it might be an array or single object from Supabase
      const warehouses = data?.warehouses
      if (!warehouses) {
        throw new Error('Koridor depo bilgisi bulunamadı')
      }

      // Check if warehouses is an array (Supabase join behavior)
      const warehouse = Array.isArray(warehouses) ? warehouses[0] : warehouses
      if (!warehouse) {
        throw new Error('Koridor depo bilgisi bulunamadı')
      }

      // Handle companies similarly
      const companies = warehouse.companies
      const company = Array.isArray(companies) ? companies[0] : companies

      setCorridor({
        id: data.id,
        name: data.name,
        warehouse: {
          id: warehouse.id,
          name: warehouse.name,
          company_name: company?.name ?? null,
        },
      })
    } catch (error) {
      console.error('Error loading corridor:', error)
      alert('Koridor bilgisi yüklenemedi')
    }
  }, [corridorId, supabase])

  const loadShelves = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('shelves')
        .select('*')
        .eq('corridor_id', corridorId)
        .order('name')

      if (error) throw error
      setShelves((data || []) as ShelfData[])
    } catch (error) {
      console.error('Error loading shelves:', error)
    } finally {
      setLoading(false)
    }
  }, [corridorId, supabase])

  useEffect(() => {
    if (corridorId) {
      loadCorridor()
      loadShelves()
    }
  }, [corridorId, loadCorridor, loadShelves])

  const handleAddShelf = async () => {
    if (!newShelfName.trim()) {
      alert('Lütfen raf adı girin')
      return
    }

    try {
      const { data, error } = await supabase
        .from('shelves')
        .insert({
          corridor_id: corridorId,
          name: newShelfName.trim(),
        })
        .select()

      if (error) {
        console.error('Insert error:', error)
        throw new Error(`Raf eklenemedi: ${error.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error('Raf eklenemedi: Veri döndürülmedi')
      }

      setNewShelfName('')
      setShowAddShelfModal(false)
      await loadShelves()
    } catch (error) {
      console.error('Error adding shelf:', error)
      const errorMessage = error instanceof Error ? error.message : 'Raf ekleme hatası. Lütfen tekrar deneyin.'
      alert(errorMessage)
    }
  }

  const handleDeleteShelf = async (shelfId: string) => {
    if (!confirm('Bu rafı silmek istediğinizden emin misiniz? Tüm sayım kayıtları da silinecektir.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('shelves')
        .delete()
        .eq('id', shelfId)

      if (error) throw error
      await loadShelves()
    } catch (error) {
      console.error('Error deleting shelf:', error)
      const errorMessage = error instanceof Error ? error.message : 'Raf silinemedi'
      alert(`Raf silinemedi: ${errorMessage}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    )
  }

  if (!corridor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">Koridor bulunamadı</div>
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
                href={`/dashboard/warehouses/${warehouseId}`}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{corridor.name}</h1>
                <p className="text-sm text-gray-600 mt-1">{corridor.warehouse.name}</p>
                {corridor.warehouse.company_name && (
                  <p className="text-xs text-gray-500 mt-1">
                    Firma: {corridor.warehouse.company_name}
                  </p>
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
            <h2 className="text-3xl font-bold text-gray-900">Raflar</h2>
            <p className="mt-2 text-gray-600">Rafları yönetin.</p>
          </div>
          <button
            onClick={() => setShowAddShelfModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            <span>Yeni Raf</span>
          </button>
        </div>

        {/* Shelves List */}
        {shelves.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-300 mb-4">Henüz raf eklenmemiş.</p>
            <button
              onClick={() => setShowAddShelfModal(true)}
              className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              İlk Rafı Ekle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shelves.map((shelf) => (
              <div
                key={shelf.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{shelf.name}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
                      Oluşturulma: {new Date(shelf.created_at).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteShelf(shelf.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 ml-4"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Shelf Modal */}
      {showAddShelfModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mx-4 p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Yeni Raf Ekle</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Raf Adı *
                </label>
                <input
                  type="text"
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400"
                  placeholder="Örn: Raf 1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddShelf()
                    }
                  }}
                />
              </div>
            </div>
            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => {
                  setShowAddShelfModal(false)
                  setNewShelfName('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
              >
                İptal
              </button>
              <button
                onClick={handleAddShelf}
                className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600"
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

