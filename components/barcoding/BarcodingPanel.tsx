'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Printer, CheckCircle2, Clock, Package } from 'lucide-react'

interface CountSession {
  id: string
  warehouse_id: string
  status: 'pending' | 'matched' | 'exported' | 'completed'
  created_at: string
  warehouses: {
    name: string
  } | null
  users: {
    full_name: string | null
  } | null
}

interface MatchedItem {
  id: string
  count_item_id: string
  erp_item_id: string
  matched_at: string | null
  count_items: {
    product_name: string | null
    quantity: number
    quantity_unit: string
    count_session_id: string
    count_sessions?: {
      id: string
    } | null
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
    product_code: string
    product_name: string
  }
}

interface BarcodeItem {
  id: string
  count_item_id: string
  erp_item_id: string | null
  barcode_value: string
  qr_code_value: string | null
  status: 'pending' | 'printing' | 'labeled'
  count_items: {
    product_name: string | null
    quantity: number
    quantity_unit: string
    count_session_id: string
    count_sessions?: {
      id: string
    } | null
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
    product_code: string
    product_name: string
  } | null
}

export default function BarcodingPanel() {
  const [pendingItems, setPendingItems] = useState<MatchedItem[]>([])
  const [printingItems, setPrintingItems] = useState<BarcodeItem[]>([])
  const [labeledItems, setLabeledItems] = useState<BarcodeItem[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [countSessions, setCountSessions] = useState<CountSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('all')
  const supabase = createClient()

  // Load count sessions for dropdown
  const loadCountSessions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('count_sessions')
        .select(`
          id,
          warehouse_id,
          status,
          created_at,
          warehouses (
            name
          ),
          users (
            full_name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading count sessions:', error)
        setCountSessions([])
      } else {
        // Map the data to match the CountSession interface
        const sessions: CountSession[] = (data || []).map((session: {
          id: string
          warehouse_id: string
          status: string
          created_at: string
          warehouses: { name: string } | { name: string }[] | null
          users: { full_name: string | null } | { full_name: string | null }[] | null
        }) => ({
          id: session.id,
          warehouse_id: session.warehouse_id,
          status: session.status as 'pending' | 'matched' | 'exported' | 'completed',
          created_at: session.created_at,
          warehouses: Array.isArray(session.warehouses) 
            ? (session.warehouses[0] || null)
            : (session.warehouses || null),
          users: Array.isArray(session.users)
            ? (session.users[0] || null)
            : (session.users || null),
        }))
        setCountSessions(sessions)
      }
    } catch (error) {
      console.error('Error loading count sessions:', error)
      setCountSessions([])
    }
  }, [supabase])

  useEffect(() => {
    loadCountSessions()
  }, [loadCountSessions])

  useEffect(() => {
    loadData()
  }, [selectedSessionId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Get matched items (eşleştirilmiş ürünler) - these are the items that need barcoding
      let matchedQuery = supabase
        .from('match_results')
        .select(`
          id,
          count_item_id,
          erp_item_id,
          matched_at,
          count_items (
            product_name,
            quantity,
            quantity_unit,
            count_session_id,
            count_sessions (
              id
            ),
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
            product_code,
            product_name
          )
        `)
        .eq('status', 'matched')

      const { data: matched } = await matchedQuery

      // Get existing barcode_labels to check which items already have barcodes
      const { data: existingBarcodes } = await supabase
        .from('barcode_labels')
        .select('count_item_id, status')

      const barcodeItemIds = new Set(
        (existingBarcodes || []).map((b: { count_item_id: string }) => b.count_item_id)
      )
      const labeledItemIds = new Set(
        (existingBarcodes || [])
          .filter((b: { status: string }) => b.status === 'labeled')
          .map((b: { count_item_id: string }) => b.count_item_id)
      )

      // Map the data to match the MatchedItem interface
      const matchedItems: MatchedItem[] = (matched || []).map((item: any) => {
        // Handle array/object conversion for nested relations
        const countItem = Array.isArray(item.count_items) 
          ? item.count_items[0] 
          : item.count_items
        const erpItem = Array.isArray(item.erp_items)
          ? item.erp_items[0]
          : item.erp_items

        return {
          id: item.id,
          count_item_id: item.count_item_id,
          erp_item_id: item.erp_item_id,
          matched_at: item.matched_at,
          count_items: {
            product_name: countItem?.product_name || null,
            quantity: countItem?.quantity || 0,
            quantity_unit: countItem?.quantity_unit || 'adet',
            count_session_id: countItem?.count_session_id || '',
            count_sessions: Array.isArray(countItem?.count_sessions)
              ? (countItem.count_sessions[0] || null)
              : (countItem?.count_sessions || null),
            shelves: Array.isArray(countItem?.shelves)
              ? (countItem.shelves[0] || null)
              : (countItem?.shelves || null),
          },
          erp_items: {
            product_code: erpItem?.product_code || '',
            product_name: erpItem?.product_name || '',
          },
        }
      })

      // Filter matched items: only show items that don't have labeled barcodes yet
      let filteredMatched = matchedItems.filter((item: MatchedItem) => {
        // Only show items that are not yet labeled
        return !labeledItemIds.has(item.count_item_id)
      })

      // Filter by session if selected
      if (selectedSessionId !== 'all') {
        filteredMatched = filteredMatched.filter((item: MatchedItem) => {
          return item.count_items.count_sessions?.id === selectedSessionId ||
                 item.count_items.count_session_id === selectedSessionId
        })
      }

      setPendingItems(filteredMatched)

      // Get printing items (items that are currently being printed)
      let printingQuery = supabase
        .from('barcode_labels')
        .select(`
          *,
          count_items (
            product_name,
            quantity,
            quantity_unit,
            count_session_id,
            count_sessions (
              id
            ),
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
            product_code,
            product_name
          )
        `)
        .eq('status', 'printing')

      const { data: printing } = await printingQuery

      // Filter printing items by session if selected
      let filteredPrinting = (printing || []) as BarcodeItem[]
      if (selectedSessionId !== 'all' && printing) {
        filteredPrinting = printing.filter((item: BarcodeItem) => {
          return item.count_items.count_sessions?.id === selectedSessionId ||
                 item.count_items.count_session_id === selectedSessionId
        }) as BarcodeItem[]
      }
      setPrintingItems(filteredPrinting)

      // Get labeled items
      let labeledQuery = supabase
        .from('barcode_labels')
        .select(`
          *,
          count_items (
            product_name,
            quantity,
            quantity_unit,
            count_session_id,
            count_sessions (
              id
            ),
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
            product_code,
            product_name
          )
        `)
        .eq('status', 'labeled')
        .order('printed_at', { ascending: false })
        .limit(50)

      const { data: labeled } = await labeledQuery

      // Filter labeled items by session if selected
      let filteredLabeled = (labeled || []) as BarcodeItem[]
      if (selectedSessionId !== 'all' && labeled) {
        filteredLabeled = labeled.filter((item: BarcodeItem) => {
          return item.count_items.count_sessions?.id === selectedSessionId ||
                 item.count_items.count_session_id === selectedSessionId
        }) as BarcodeItem[]
      }
      setLabeledItems(filteredLabeled)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (countItemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(countItemId)) {
      newSelected.delete(countItemId)
    } else {
      newSelected.add(countItemId)
    }
    setSelectedItems(newSelected)
  }

  const handlePrintSelected = async () => {
    if (selectedItems.size === 0) return

    try {
      // For each selected item, create or update barcode_label
      const itemsToProcess = pendingItems.filter((item) => selectedItems.has(item.count_item_id))
      
      for (const item of itemsToProcess) {
        // Get or create barcode_label
        const productCode = item.erp_items.product_code
        
        // Check if barcode_label already exists
        const { data: existing } = await supabase
          .from('barcode_labels')
          .select('id')
          .eq('count_item_id', item.count_item_id)
          .maybeSingle()

        if (existing) {
          // Update existing barcode_label to printing
          await supabase
            .from('barcode_labels')
            .update({ status: 'printing' })
            .eq('id', existing.id)
        } else {
          // Create new barcode_label
          await supabase
            .from('barcode_labels')
            .insert({
              count_item_id: item.count_item_id,
              erp_item_id: item.erp_item_id,
              barcode_value: productCode,
              qr_code_value: JSON.stringify({ productCode, countItemId: item.count_item_id }),
              status: 'printing',
            })
        }
      }

      // Simulate printing process
      setTimeout(async () => {
        for (const item of itemsToProcess) {
          const { data: barcodeLabel } = await supabase
            .from('barcode_labels')
            .select('id')
            .eq('count_item_id', item.count_item_id)
            .maybeSingle()

          if (barcodeLabel) {
            await supabase
              .from('barcode_labels')
              .update({ 
                status: 'labeled', 
                printed_at: new Date().toISOString() 
              })
              .eq('id', barcodeLabel.id)
          }
        }
        setSelectedItems(new Set())
        loadData()
      }, 2000)
    } catch (error) {
      console.error('Error printing barcodes:', error)
      alert('Barkod yazdırma hatası')
    }
  }

  const getShelfLocation = (item: MatchedItem | BarcodeItem) => {
    if (!item.count_items.shelves) return 'Bilinmiyor'
    const shelf = item.count_items.shelves.name
    const corridor = item.count_items.shelves.corridors?.name || ''
    const warehouse = item.count_items.shelves.corridors?.warehouses?.name || ''
    return `${warehouse} - ${corridor} - ${shelf}`
  }

  const getProductCode = (item: MatchedItem | BarcodeItem) => {
    if ('erp_items' in item && item.erp_items) {
      return item.erp_items.product_code
    }
    if ('barcode_value' in item) {
      return item.barcode_value.substring(0, 12)
    }
    return 'N/A'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Barkodlama</h2>
          <p className="mt-2 text-gray-600">Barkod yazdırma ve etiketleme işlemlerini yönetin.</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Count Session Dropdown */}
          <div className="relative">
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-700 font-medium cursor-pointer appearance-none"
              style={{ minWidth: '200px' }}
            >
              <option value="all">Tüm Sayım Listeleri</option>
              {countSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.warehouses?.name || 'Sayım Listesi'} - {new Date(session.created_at).toLocaleDateString('tr-TR')}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Ara..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          {selectedItems.size > 0 && (
            <button
              onClick={handlePrintSelected}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
            >
              <Printer className="h-5 w-5" />
              <span>Seçilenleri Yazdır ({selectedItems.size})</span>
            </button>
          )}
        </div>
      </div>

        {/* Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Pending */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Barkod Bekleyenler</h3>
              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm font-medium">
                {pendingItems.length}
              </span>
            </div>
            <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.count_item_id)}
                      onChange={() => toggleSelection(item.count_item_id)}
                      className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {item.count_items.product_name || 'Ürün'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        ERP Kod: {getProductCode(item)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Adet: {item.count_items.quantity} {item.count_items.quantity_unit}
                      </p>
                      <div className="flex items-center space-x-2 mt-2 text-sm text-gray-500">
                        <Package className="h-4 w-4" />
                        <span>Raf: {getShelfLocation(item)}</span>
                      </div>
                      {item.matched_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          Eşleştirildi: {new Date(item.matched_at).toLocaleDateString('tr-TR')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {pendingItems.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p>Eşleştirilmiş ve barkod bekleyen ürün yok</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Printing */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Barkod Yazdırılıyor</h3>
              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm font-medium">
                {printingItems.length}
              </span>
            </div>
            <div className="space-y-4">
              {printingItems.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <p className="font-medium text-gray-900">
                    {item.count_items.product_name || 'Ürün'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Kod: {getProductCode(item)}</p>
                  <p className="text-sm text-gray-600">
                    Adet: {item.count_items.quantity} {item.count_items.quantity_unit}
                  </p>
                  <div className="flex items-center space-x-2 mt-2 text-sm text-gray-500">
                    <Package className="h-4 w-4" />
                    <span>Raf: {getShelfLocation(item)}</span>
                  </div>
                  <div className="mt-3 flex items-center space-x-2 text-orange-600">
                    <Printer className="h-4 w-4" />
                    <span className="text-xs font-medium">YAZDIRILIYOR</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Labeled */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Etiketlendi</h3>
              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm font-medium">
                {labeledItems.length}
              </span>
            </div>
            <div className="space-y-4">
              {labeledItems.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <p className="font-medium text-gray-900">
                    {item.count_items.product_name || 'Ürün'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Kod: {getProductCode(item)}</p>
                  <p className="text-sm text-gray-600">
                    Adet: {item.count_items.quantity} {item.count_items.quantity_unit}
                  </p>
                  <div className="flex items-center space-x-2 mt-2 text-sm text-gray-500">
                    <Package className="h-4 w-4" />
                    <span>Raf: {getShelfLocation(item)}</span>
                  </div>
                  <div className="mt-3 flex items-center space-x-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-medium">ETİKETLENDİ</span>
                  </div>
                </div>
              ))}
              {labeledItems.length === 0 && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <p className="text-gray-500 text-sm">
                    Bu aşamada bekleyen ürün bulunmuyor.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  )
}

