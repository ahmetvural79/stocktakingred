'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  warehouses: {
    id: string
    name: string
  }
}

export default function CorridorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const warehouseId = params.id as string
  const corridorId = params.corridorId as string
  const [corridor, setCorridor] = useState<CorridorData | null>(null)
  const [shelves, setShelves] = useState<ShelfData[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddShelfModal, setShowAddShelfModal] = useState(false)
  const [newShelfName, setNewShelfName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (corridorId) {
      loadCorridor()
      loadShelves()
    }
  }, [corridorId])

  const loadCorridor = async () => {
    try {
      const { data, error } = await supabase
        .from('corridors')
        .select(`
          *,
          warehouses (
            id,
            name
          )
        `)
        .eq('id', corridorId)
        .single()

      if (error) throw error
      setCorridor(data as any)
    } catch (error) {
      console.error('Error loading corridor:', error)
      alert('Koridor bilgisi yüklenemedi')
    }
  }

  const loadShelves = async () => {
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
  }

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
    } catch (error: any) {
      console.error('Error adding shelf:', error)
      alert(error.message || 'Raf ekleme hatası. Lütfen tekrar deneyin.')
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
    } catch (error: any) {
      console.error('Error deleting shelf:', error)
      alert(`Raf silinemedi: ${error.message}`)
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
                <p className="text-sm text-gray-600 mt-1">
                  {corridor.warehouses?.name}
                </p>
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
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">Henüz raf eklenmemiş.</p>
            <button
              onClick={() => setShowAddShelfModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              İlk Rafı Ekle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shelves.map((shelf) => (
              <div
                key={shelf.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{shelf.name}</h3>
                    <p className="text-xs text-gray-500 mt-2">
                      Oluşturulma: {new Date(shelf.created_at).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteShelf(shelf.id)}
                    className="text-red-600 hover:text-red-900 ml-4"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold mb-4">Yeni Raf Ekle</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Raf Adı *
                </label>
                <input
                  type="text"
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleAddShelf}
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

