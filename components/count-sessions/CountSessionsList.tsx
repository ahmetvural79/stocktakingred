'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Package, Barcode, Plus, X } from 'lucide-react'
import Link from 'next/link'

interface CountItem {
  id: string
  count_session_id: string
  barcode_no: string | null
}

interface MatchResultData {
  count_item_id: string
  status: string
  erp_items: {
    product_code: string
  }[] | null
}

interface BarcodeLabel {
  count_item_id: string
  barcode_value: string
}

interface CountSession {
  id: string
  warehouse_id: string
  status: 'pending' | 'matched' | 'exported' | 'completed'
  notes: string | null
  created_at: string
  warehouses: {
    name: string
  }
  users: {
    full_name: string | null
  } | null
  count_items_aggregate: {
    aggregate: {
      count: number
    }
  }
  barcode_count?: number
  matched_count?: number
}

interface Warehouse {
  id: string
  name: string
  company_id: string
}

export default function CountSessionsList() {
  const [sessions, setSessions] = useState<CountSession[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'matched' | 'exported'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [isCreating, setIsCreating] = useState(false)
  const supabase = createClient()

  const loadSessions = useCallback(async () => {
    try {
      let query = supabase
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
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      
      if (data && data.length > 0) {
        // Get all count items for these sessions in one query
        const sessionIds = data.map(s => s.id)
        const { data: allCountItems, error: itemsError } = await supabase
          .from('count_items')
          .select('id, count_session_id, barcode_no')
          .in('count_session_id', sessionIds)
        
        if (itemsError) {
          console.error('Error loading count items:', itemsError)
        }
        
        const countItems = (allCountItems || []) as CountItem[]
        const countItemIds = countItems.map(ci => ci.id)
        
        // Initialize session stats
        const sessionStats = new Map<string, {
          itemCount: number
          barcodeCount: number
          matchedCount: number
        }>()
        
        data.forEach(session => {
          sessionStats.set(session.id, {
            itemCount: 0,
            barcodeCount: 0,
            matchedCount: 0
          })
        })
        
        // Count items per session and items with barcode_no
        const itemsWithBarcode = new Set<string>()
        countItems.forEach(item => {
          const stats = sessionStats.get(item.count_session_id)
          if (stats) {
            stats.itemCount++
            // Count items with direct barcode_no
            if (item.barcode_no) {
              itemsWithBarcode.add(item.id)
              stats.barcodeCount++
            }
          }
        })
        
        // Get match results and barcode labels in parallel if we have items
        if (countItemIds.length > 0) {
          const [matchResultsResponse, barcodeLabelsResponse] = await Promise.all([
            // Get matched items with ERP product codes
            supabase
              .from('match_results')
              .select(`
                count_item_id,
                status,
                erp_items (
                  product_code
                )
              `)
              .in('count_item_id', countItemIds)
              .eq('status', 'matched'),
            // Get barcode labels
            supabase
              .from('barcode_labels')
              .select('count_item_id, barcode_value')
              .in('count_item_id', countItemIds)
          ])
          
          // Process match results
          if (matchResultsResponse.data) {
            const matchResults = matchResultsResponse.data as unknown as MatchResultData[]
            matchResults.forEach((match) => {
              const item = countItems.find(ci => ci.id === match.count_item_id)
              if (item) {
                const stats = sessionStats.get(item.count_session_id)
                if (stats) {
                  stats.matchedCount++
                  // Count as barcode if has ERP product_code and not already counted
                  // erp_items is an array from Supabase join, get first item
                  const erpItem = match.erp_items && Array.isArray(match.erp_items) 
                    ? match.erp_items[0] 
                    : match.erp_items
                  if (erpItem && typeof erpItem === 'object' && 'product_code' in erpItem && erpItem.product_code && !itemsWithBarcode.has(match.count_item_id)) {
                    itemsWithBarcode.add(match.count_item_id)
                    stats.barcodeCount++
                  }
                }
              }
            })
          }
          
          // Process barcode labels
          if (barcodeLabelsResponse.data) {
            const barcodeLabels = barcodeLabelsResponse.data as BarcodeLabel[]
            barcodeLabels.forEach((label) => {
              const item = countItems.find(ci => ci.id === label.count_item_id)
              if (item) {
                const stats = sessionStats.get(item.count_session_id)
                if (stats && !itemsWithBarcode.has(label.count_item_id)) {
                  itemsWithBarcode.add(label.count_item_id)
                  stats.barcodeCount++
                }
              }
            })
          }
        }
        
        // Combine session data with stats
        const sessionsWithCounts = data.map(session => {
          const stats = sessionStats.get(session.id) || {
            itemCount: 0,
            barcodeCount: 0,
            matchedCount: 0
          }
          
          return {
            ...session,
            count_items_aggregate: {
              aggregate: {
                count: stats.itemCount
              }
            },
            barcode_count: stats.barcodeCount,
            matched_count: stats.matchedCount
          }
        })
        
        setSessions(sessionsWithCounts as CountSession[])
      } else {
        setSessions([])
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }, [filter, supabase])

  const loadWarehouses = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Get user's company_id
      const { data: userData } = await supabase
        .from('users')
        .select('company_id, role')
        .eq('id', user.id)
        .single()

      if (!userData) return

      // Load warehouses based on user role
      let query = supabase.from('warehouses').select('id, name, company_id').order('name')

      if (userData.role !== 'main_admin') {
        query = query.eq('company_id', userData.company_id)
      }

      const { data, error } = await query

      if (error) throw error
      if (data) {
        setWarehouses(data as Warehouse[])
      }
    } catch (error) {
      console.error('Error loading warehouses:', error)
    }
  }, [supabase])

  const createCountSession = useCallback(async () => {
    if (!selectedWarehouseId) {
      alert('Lütfen bir depo seçin')
      return
    }

    try {
      setIsCreating(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        alert('Kullanıcı bulunamadı')
        return
      }

      // Get user's company_id
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData?.company_id) {
        alert('Kullanıcı firması bulunamadı')
        return
      }

      // Get warehouse to verify company_id
      const { data: warehouse } = await supabase
        .from('warehouses')
        .select('company_id')
        .eq('id', selectedWarehouseId)
        .single()

      if (!warehouse || warehouse.company_id !== userData.company_id) {
        alert('Bu depo için yetkiniz yok')
        return
      }

      // Create count session
      const { error } = await supabase
        .from('count_sessions')
        .insert({
          warehouse_id: selectedWarehouseId,
          company_id: userData.company_id,
          created_by: user.id,
          status: 'pending',
          notes: notes || null,
        })

      if (error) throw error

      // Reset form and close modal
      setSelectedWarehouseId('')
      setNotes('')
      setShowAddModal(false)
      loadSessions()
    } catch (error) {
      console.error('Error creating count session:', error)
      alert('Sayım listesi oluşturulurken bir hata oluştu')
    } finally {
      setIsCreating(false)
    }
  }, [selectedWarehouseId, notes, supabase, loadSessions])

  useEffect(() => {
    loadSessions()
    loadWarehouses()

    // Real-time subscription for count_sessions
    const sessionsChannel = supabase
      .channel('count_sessions_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'count_sessions',
        },
        (payload) => {
          console.log('New count session:', payload.new)
          loadSessions()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'count_sessions',
        },
        (payload) => {
          console.log('Count session updated:', payload.new)
          loadSessions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sessionsChannel)
    }
  }, [loadSessions, loadWarehouses, supabase])

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      matched: 'bg-blue-100 text-blue-800',
      exported: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
    }
    return styles[status as keyof typeof styles] || styles.pending
  }

  const getStatusText = (status: string) => {
    const texts = {
      pending: 'Bekliyor',
      matched: 'Eşleştirildi',
      exported: 'Dışa Aktarıldı',
      completed: 'Tamamlandı',
    }
    return texts[status as keyof typeof texts] || status
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Sayım Listeleri</h2>
            <p className="mt-2 text-gray-600">Mobil uygulamadan gelen sayım listelerini görüntüleyin.</p>
            <div className="mt-2 flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600">✨ Canlı güncelleme aktif</span>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-red-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Yeni Sayım Ekle</span>
          </button>
        </div>
      </div>

        {/* Filters */}
        <div className="mb-6 flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'all'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'pending'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Bekleyenler
          </button>
          <button
            onClick={() => setFilter('matched')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'matched'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Eşleştirilmişler
          </button>
          <button
            onClick={() => setFilter('exported')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'exported'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Dışa Aktarılanlar
          </button>
        </div>

      {/* Sessions List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {sessions.map((session) => (
            <Link
              key={session.id}
              href={`/dashboard/count-sessions/${session.id}`}
              className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {session.warehouses.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {session.users?.full_name || 'Bilinmiyor'} •{' '}
                          {new Date(session.created_at).toLocaleDateString('tr-TR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right space-y-1">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Package className="h-4 w-4" />
                        <span>
                          {session.count_items_aggregate?.aggregate?.count || 0} ürün
                        </span>
                      </div>
                      {session.barcode_count !== undefined && session.barcode_count > 0 && (
                        <div className="flex items-center space-x-2 text-sm text-blue-600">
                          <Barcode className="h-4 w-4" />
                          <span>
                            {session.barcode_count} barkod
                          </span>
                        </div>
                      )}
                      {session.matched_count !== undefined && session.matched_count > 0 && (
                        <div className="flex items-center space-x-2 text-sm text-green-600">
                          <span className="text-xs">✓ {session.matched_count} eşleşti</span>
                        </div>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
                        session.status
                      )}`}
                    >
                      {getStatusText(session.status)}
                    </span>
                  </div>
                </div>
                {session.notes && (
                  <p className="mt-3 text-sm text-gray-600">{session.notes}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
        {sessions.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Henüz sayım listesi bulunmuyor.</p>
            <p className="text-sm text-gray-400 mt-2">
              Mobil uygulamadan yeni sayım yaptığınızda burada görünecek.
            </p>
          </div>
        )}
      </div>

      {/* Add Count Session Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Yeni Sayım Listesi</h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setSelectedWarehouseId('')
                  setNotes('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="warehouse" className="block text-sm font-medium text-gray-700 mb-2">
                  Depo <span className="text-red-600">*</span>
                </label>
                <select
                  id="warehouse"
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Depo Seçin</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Notlar (İsteğe bağlı)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Sayım listesi hakkında notlar..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setSelectedWarehouseId('')
                  setNotes('')
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isCreating}
              >
                İptal
              </button>
              <button
                onClick={createCountSession}
                disabled={isCreating || !selectedWarehouseId}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Oluşturuluyor...' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
