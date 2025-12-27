'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Package, ArrowLeft, CheckCircle2, Search, ChevronLeft, ChevronRight, Edit2, X, RefreshCw, AlertCircle, Clock, Wifi, WifiOff } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import ExportButtons from '@/components/export/ExportButtons'
import type { MatchResult } from '@/lib/export/pdf-export'
import { normalizeImageUrl } from '@/lib/utils/image-url'

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
}

interface MatchResultData {
  id: string
  count_item_id: string
  erp_item_id: string
  matched_score: number
  difference: number
  status: 'pending' | 'matched' | 'rejected'
  matched_at?: string | null
  count_items: {
    id: string
    product_name: string | null
    quantity: number
    quantity_unit: string
    photo_url: string | null
    note: string | null
    shelf_id: string | null
    created_at?: string | null
    shelves: {
      name: string
      corridors: {
        name: string
        warehouses: {
          name: string
        }
      }
    } | null
  }
  erp_items: {
    id: string
    product_code: string
    product_name: string
    stock_qty: number
  }
}

interface CountSessionDetailProps {
  sessionId: string
}

interface CountItemData {
  id: string
  product_name: string | null
  quantity: number
  quantity_unit: string
  photo_url: string | null
  note: string | null
  shelf_id: string | null
  created_at?: string | null
  shelves: {
    name: string
    corridors?: {
      name: string
      warehouses?: {
        name: string
      }
    }
  } | null
}

interface ERPItem {
  id: string
  product_code: string
  product_name: string
  stock_qty: number
}

interface SyncQueueItem {
  id: string
  table_name: string
  operation: string
  record_id: string
  data: Record<string, unknown>
  status: 'pending' | 'syncing' | 'completed' | 'failed'
  retry_count: number
  error_message?: string | null
  created_at: string
  synced_at?: string | null
  device_id?: string | null
}

const ITEMS_PER_PAGE = 20

export default function CountSessionDetail({ sessionId }: CountSessionDetailProps) {
  const [session, setSession] = useState<CountSession | null>(null)
  const [allItems, setAllItems] = useState<CountItemData[]>([])
  const [matchedItems, setMatchedItems] = useState<MatchResultData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState<'all' | 'matched' | 'pending'>('all')
  
  // Edit mode state
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editERPSearch, setEditERPSearch] = useState('')
  const [editERPItems, setEditERPItems] = useState<ERPItem[]>([])
  const [editSelectedERP, setEditSelectedERP] = useState<ERPItem | null>(null)
  const [editQuantity, setEditQuantity] = useState<string>('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  
  // Sync queue state
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([])
  const [showSyncPanel, setShowSyncPanel] = useState(false)
  
  const supabase = createClient()

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // Get count session
      const { data: sessionData, error: sessionError } = await supabase
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
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError
      if (sessionData) {
        setSession(sessionData as CountSession)
      }

      // Get ALL count items for this session
      const { data: countItems, error: countItemsError } = await supabase
        .from('count_items')
        .select(`
          id,
          product_name,
          quantity,
          quantity_unit,
          photo_url,
          note,
          shelf_id,
          created_at,
          shelves (
            name,
            corridors (
              name,
              warehouses (
                name
              )
            )
          )
        `)
        .eq('count_session_id', sessionId)
        .order('created_at', { ascending: false })

      if (countItemsError) {
        console.error('Error loading count items:', countItemsError)
        setAllItems([])
      } else if (countItems) {
        // Process count items - handle Supabase join array responses
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const processedItems: CountItemData[] = countItems.map((item: any) => {
          // Handle shelves join (can be array or object)
          let shelves: CountItemData['shelves'] = null
          if (item.shelves) {
            const shelfData = Array.isArray(item.shelves) ? item.shelves[0] : item.shelves
            if (shelfData) {
              let corridors: { name: string; warehouses?: { name: string } } | undefined
              if (shelfData.corridors) {
                const corridorData = Array.isArray(shelfData.corridors) ? shelfData.corridors[0] : shelfData.corridors
                if (corridorData) {
                  let warehouses: { name: string } | undefined
                  if (corridorData.warehouses) {
                    const warehouseData = Array.isArray(corridorData.warehouses) ? corridorData.warehouses[0] : corridorData.warehouses
                    if (warehouseData) {
                      warehouses = { name: String(warehouseData.name) }
                    }
                  }
                  corridors = {
                    name: String(corridorData.name),
                    warehouses,
                  }
                }
              }
              shelves = {
                name: String(shelfData.name),
                corridors,
              }
            }
          }
          
          return {
            id: String(item.id),
            product_name: item.product_name || null,
            quantity: Number(item.quantity),
            quantity_unit: String(item.quantity_unit),
            photo_url: item.photo_url || null,
            note: item.note || null,
            shelf_id: item.shelf_id || null,
            created_at: item.created_at || null,
            shelves,
          }
        })
        setAllItems(processedItems)
      } else {
        setAllItems([])
      }

      // Get match results for this session
      if (countItems && countItems.length > 0) {
        const countItemIds = countItems.map((item) => item.id)

        const { data: matchResults, error: matchError } = await supabase
          .from('match_results')
          .select(`
            *,
            count_items (
              id,
              product_name,
              quantity,
              quantity_unit,
              photo_url,
              note,
              shelf_id,
              created_at,
              shelves (
                name,
                corridors (
                  name,
                  warehouses (
                    name
                  )
                )
              )
            ),
            erp_items (
              id,
              product_code,
              product_name,
              stock_qty
            )
          `)
          .in('count_item_id', countItemIds)
          .eq('status', 'matched')
          .order('matched_at', { ascending: false })

        if (matchError) {
          console.error('Error loading match results:', matchError)
          setMatchedItems([])
        } else if (matchResults) {
          setMatchedItems(matchResults as MatchResultData[])
        } else {
          setMatchedItems([])
        }
      } else {
        setMatchedItems([])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [sessionId, supabase])

  // Load sync queue for this session
  const loadSyncQueue = useCallback(async () => {
    try {
      // Check if sync_queue table exists
      const { data, error } = await supabase
        .from('sync_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        // Table might not exist yet
        if (error.code === '42P01') {
          console.log('sync_queue table does not exist yet')
          setSyncQueue([])
          return
        }
        console.error('Error loading sync queue:', error)
        setSyncQueue([])
      } else {
        setSyncQueue(data as SyncQueueItem[] || [])
      }
    } catch (error) {
      console.error('Error loading sync queue:', error)
      setSyncQueue([])
    }
  }, [supabase])

  // Load ERP items for editing
  const loadERPItems = useCallback(async () => {
    try {
      const { data: latestImport } = await supabase
        .from('erp_imports')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (latestImport) {
        const { data } = await supabase
          .from('erp_items')
          .select('*')
          .eq('erp_import_id', latestImport.id)
          .order('product_name')

        if (data) {
          setEditERPItems(data as ERPItem[])
        }
      }
    } catch (error) {
      console.error('Error loading ERP items:', error)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
    loadSyncQueue()

    // Real-time subscription for count_items
    const countItemsChannel = supabase
      .channel('count_items_changes_detail')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'count_items',
          filter: `count_session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('New count item added:', payload.new)
          loadData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'count_items',
          filter: `count_session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Count item updated:', payload.new)
          loadData()
        }
      )
      .subscribe()

    // Real-time subscription for match_results
    const matchResultsChannel = supabase
      .channel('match_results_changes_detail')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'match_results',
        },
        (payload) => {
          console.log('Match result updated:', payload.new)
          loadData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_results',
        },
        (payload) => {
          console.log('New match result:', payload.new)
          loadData()
        }
      )
      .subscribe()

    // Real-time subscription for sync_queue
    const syncQueueChannel = supabase
      .channel('sync_queue_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_queue',
        },
        () => {
          loadSyncQueue()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(countItemsChannel)
      supabase.removeChannel(matchResultsChannel)
      supabase.removeChannel(syncQueueChannel)
    }
  }, [loadData, loadSyncQueue, supabase, sessionId])

  // Handle export and update status
  const handleExport = useCallback(async () => {
    if (!session || matchedItems.length === 0) return

    try {
      // Update session status to 'exported' when export is triggered
      const { error } = await supabase
        .from('count_sessions')
        .update({ status: 'exported' })
        .eq('id', sessionId)

      if (error) {
        console.error('Error updating session status:', error)
      } else {
        // Reload data to reflect status change
        await loadData()
      }
    } catch (error) {
      console.error('Error updating session status:', error)
    }
  }, [session, matchedItems.length, sessionId, supabase, loadData])

  // Filter and search items
  const filteredItems = useMemo(() => {
    let items = [...allItems]
    
    // Apply status filter
    if (filterStatus === 'matched') {
      const matchedIds = new Set(matchedItems.map(m => m.count_items.id))
      items = items.filter(item => matchedIds.has(item.id))
    } else if (filterStatus === 'pending') {
      const matchedIds = new Set(matchedItems.map(m => m.count_items.id))
      items = items.filter(item => !matchedIds.has(item.id))
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      items = items.filter(item => {
        const match = matchedItems.find(m => m.count_items.id === item.id)
        const productName = item.product_name?.toLowerCase() || ''
        const shelfName = item.shelves?.name?.toLowerCase() || ''
        const erpCode = match?.erp_items?.product_code?.toLowerCase() || ''
        const erpName = match?.erp_items?.product_name?.toLowerCase() || ''
        
        return productName.includes(query) || 
               shelfName.includes(query) || 
               erpCode.includes(query) ||
               erpName.includes(query)
      })
    }
    
    return items
  }, [allItems, matchedItems, filterStatus, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE)
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredItems, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus])

  // Start editing an item
  const startEditing = (itemId: string) => {
    const match = matchedItems.find(m => m.count_items.id === itemId)
    const item = allItems.find(i => i.id === itemId)
    
    setEditingItemId(itemId)
    setEditQuantity(item?.quantity.toString() || '')
    setEditSelectedERP(match?.erp_items || null)
    setEditERPSearch(match?.erp_items?.product_code || '')
    loadERPItems()
  }

  // Save edit
  const saveEdit = async () => {
    if (!editingItemId) return
    
    setIsSavingEdit(true)
    try {
      const newQuantity = parseInt(editQuantity, 10)
      if (isNaN(newQuantity) || newQuantity < 0) {
        alert('Geçerli bir miktar giriniz')
        return
      }

      // Update count_item quantity
      const { error: itemError } = await supabase
        .from('count_items')
        .update({ quantity: newQuantity })
        .eq('id', editingItemId)

      if (itemError) throw itemError

      // Update or create match_result if ERP is selected
      if (editSelectedERP) {
        const existingMatch = matchedItems.find(m => m.count_items.id === editingItemId)
        
        if (existingMatch) {
          // Update existing match
          const { error: matchError } = await supabase
            .from('match_results')
            .update({
              erp_item_id: editSelectedERP.id,
              difference: newQuantity - editSelectedERP.stock_qty,
              matched_at: new Date().toISOString(),
            })
            .eq('id', existingMatch.id)

          if (matchError) throw matchError
        } else {
          // Create new match
          const { error: matchError } = await supabase
            .from('match_results')
            .insert({
              count_item_id: editingItemId,
              erp_item_id: editSelectedERP.id,
              status: 'matched',
              matched_score: 1.0,
              difference: newQuantity - editSelectedERP.stock_qty,
              matched_at: new Date().toISOString(),
            })

          if (matchError) throw matchError
        }
      }

      setEditingItemId(null)
      await loadData()
    } catch (error) {
      console.error('Error saving edit:', error)
      alert('Düzenleme kaydedilirken hata oluştu')
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Filter ERP items for search
  const filteredERPItems = useMemo(() => {
    if (!editERPSearch.trim()) return editERPItems.slice(0, 20)
    
    const query = editERPSearch.toLowerCase().trim()
    return editERPItems.filter(item => 
      item.product_code.toLowerCase().includes(query) ||
      item.product_name.toLowerCase().includes(query)
    ).slice(0, 20)
  }, [editERPItems, editERPSearch])

  // Convert MatchResultData to MatchResult format for export
  const exportMatches: MatchResult[] = useMemo(() => {
    return matchedItems.map((match) => ({
      count_items: {
        product_name: match.count_items.product_name,
        quantity: match.count_items.quantity,
        quantity_unit: match.count_items.quantity_unit,
        shelves: match.count_items.shelves
          ? {
              name: match.count_items.shelves.name,
              corridors: match.count_items.shelves.corridors
                ? {
                    name: match.count_items.shelves.corridors.name,
                    warehouses: match.count_items.shelves.corridors.warehouses
                      ? {
                          name: match.count_items.shelves.corridors.warehouses.name,
                        }
                      : undefined,
                  }
                : undefined,
            }
          : null,
      },
      erp_items: {
        product_code: match.erp_items.product_code,
        product_name: match.erp_items.product_name,
        stock_qty: match.erp_items.stock_qty,
      },
      difference: match.difference,
    }))
  }, [matchedItems])

  // Sync queue stats
  const syncStats = useMemo(() => {
    return {
      pending: syncQueue.filter(s => s.status === 'pending').length,
      syncing: syncQueue.filter(s => s.status === 'syncing').length,
      failed: syncQueue.filter(s => s.status === 'failed').length,
      completed: syncQueue.filter(s => s.status === 'completed').length,
    }
  }, [syncQueue])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Sayım listesi bulunamadı</div>
      </div>
    )
  }

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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/count-sessions"
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{session.warehouses.name}</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
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
          <div className="flex items-center space-x-4">
            {/* Sync Status Button */}
            <button
              onClick={() => setShowSyncPanel(!showSyncPanel)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                syncStats.pending > 0 || syncStats.failed > 0
                  ? 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                  : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              {syncStats.pending > 0 || syncStats.syncing > 0 ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : syncStats.failed > 0 ? (
                <WifiOff className="h-4 w-4" />
              ) : (
                <Wifi className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {syncStats.pending > 0 ? `${syncStats.pending} bekliyor` :
                 syncStats.failed > 0 ? `${syncStats.failed} hata` :
                 'Senkron'}
              </span>
            </button>
            
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
                session.status
              )}`}
            >
              {getStatusText(session.status)}
            </span>
            <div className="flex items-center space-x-2">
              <ExportButtons
                matches={exportMatches}
                sessionName={session.warehouses.name}
                onExport={handleExport}
              />
              {matchedItems.length === 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  (Eşleştirilmiş ürün yok)
                </span>
              )}
            </div>
          </div>
        </div>
        {session.notes && (
          <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">{session.notes}</p>
          </div>
        )}
      </div>

      {/* Sync Panel */}
      {showSyncPanel && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <RefreshCw className="h-5 w-5" />
              <span>Senkronizasyon Durumu</span>
            </h3>
            <button onClick={() => setShowSyncPanel(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{syncStats.pending}</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">Bekleyen</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{syncStats.syncing}</p>
              <p className="text-xs text-blue-700 dark:text-blue-400">Senkronize Ediliyor</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{syncStats.failed}</p>
              <p className="text-xs text-red-700 dark:text-red-400">Başarısız</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{syncStats.completed}</p>
              <p className="text-xs text-green-700 dark:text-green-400">Tamamlandı</p>
            </div>
          </div>
          
          {syncQueue.length > 0 ? (
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Tablo</th>
                    <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">İşlem</th>
                    <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Durum</th>
                    <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Tarih</th>
                    <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Hata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {syncQueue.slice(0, 10).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{item.table_name}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{item.operation}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          item.status === 'syncing' ? 'bg-blue-100 text-blue-800' :
                          item.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs">
                        {new Date(item.created_at).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-3 py-2 text-red-600 text-xs max-w-[200px] truncate">
                        {item.error_message || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Wifi className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>Tüm veriler senkronize</p>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Toplam Ürün</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{allItems.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Eşleştirilmiş</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{matchedItems.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Bekleyen</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{allItems.length - matchedItems.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Durum</p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">{getStatusText(session.status)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Ürün adı, raf, ERP kodu ile ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Tümü ({allItems.length})
          </button>
          <button
            onClick={() => setFilterStatus('matched')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'matched'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Eşleşmiş ({matchedItems.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Bekleyen ({allItems.length - matchedItems.length})
          </button>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sayım Ürünleri</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {filteredItems.length} ürün gösteriliyor • Sayfa {currentPage} / {totalPages || 1}
            </p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fotoğraf</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ürün / Raf</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sayım</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ERP Kodu</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ERP Stok</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fark</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Durum</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Ürün bulunamadı</p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const match = matchedItems.find((m) => m.count_items.id === item.id)
                  const isMatched = !!match
                  const isEditing = editingItemId === item.id

                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-4 py-3">
                        {item.photo_url && normalizeImageUrl(item.photo_url) ? (
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                            <Image
                              src={normalizeImageUrl(item.photo_url)!}
                              alt={item.product_name || 'Ürün'}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {item.product_name || 'İsimsiz Ürün'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Raf: {item.shelves?.name || 'Bilinmiyor'}
                          </p>
                          {item.note && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate max-w-[200px]">
                              Not: {item.note}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        ) : (
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {item.quantity} {item.quantity_unit}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="relative">
                            <input
                              type="text"
                              value={editERPSearch}
                              onChange={(e) => setEditERPSearch(e.target.value)}
                              placeholder="ERP kodu ara..."
                              className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            {editERPSearch && (
                              <div className="absolute z-10 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {filteredERPItems.map((erp) => (
                                  <button
                                    key={erp.id}
                                    onClick={() => {
                                      setEditSelectedERP(erp)
                                      setEditERPSearch(erp.product_code)
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                      editSelectedERP?.id === erp.id ? 'bg-red-50 dark:bg-red-900/20' : ''
                                    }`}
                                  >
                                    <p className="font-medium text-gray-900 dark:text-white">{erp.product_code}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{erp.product_name}</p>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-900 dark:text-white">
                            {match?.erp_items?.product_code || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {match?.erp_items?.stock_qty ?? (editSelectedERP?.stock_qty ?? '-')}
                      </td>
                      <td className="px-4 py-3">
                        {match && (
                          <span className={`font-medium ${
                            match.difference > 0
                              ? 'text-red-600'
                              : match.difference < 0
                                ? 'text-blue-600'
                                : 'text-green-600'
                          }`}>
                            {match.difference > 0 ? '+' : ''}{match.difference}
                          </span>
                        )}
                        {!match && '-'}
                      </td>
                      <td className="px-4 py-3">
                        {isMatched ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                            Eşleşti
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                            Bekliyor
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={saveEdit}
                              disabled={isSavingEdit}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              {isSavingEdit ? '...' : 'Kaydet'}
                            </button>
                            <button
                              onClick={() => setEditingItemId(null)}
                              className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                            >
                              İptal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(item.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="Düzenle"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredItems.length} üründen {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} arası gösteriliyor
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded text-sm ${
                        currentPage === pageNum
                          ? 'bg-red-600 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
