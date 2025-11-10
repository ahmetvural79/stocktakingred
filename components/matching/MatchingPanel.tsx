'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Download, FileText, CheckCircle2, Clock, AlertCircle, Edit, Calendar, User, MapPin, Bell, Settings, Mic } from 'lucide-react'
import Image from 'next/image'
import ManualMatchingModal from './ManualMatchingModal'

interface CountItem {
  id: string
  product_name: string | null
  quantity: number
  quantity_unit: string
  photo_url: string | null
  note: string | null
  shelf_id: string | null
  shelves: {
    name: string
    corridors: {
      name: string
      warehouses: {
        name: string
      }
    }
  } | null
  count_sessions: {
    created_by: string | null
    users: {
      full_name: string | null
    } | null
  } | null
}

interface MatchResult {
  id: string
  count_item_id: string
  erp_item_id: string
  matched_score: number
  difference: number
  status: 'pending' | 'matched' | 'rejected'
  count_items: CountItem
  erp_items: {
    id: string
    product_code: string
    product_name: string
    stock_qty: number
  }
}

export default function MatchingPanel() {
  const [pendingItems, setPendingItems] = useState<CountItem[]>([])
  const [matchingItems, setMatchingItems] = useState<MatchResult[]>([])
  const [matchedItems, setMatchedItems] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItemForMatch, setSelectedItemForMatch] = useState<CountItem | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
    
    // Real-time subscription for count_items
    const countItemsChannel = supabase
      .channel('count_items_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'count_items',
        },
        (payload) => {
          console.log('New count item added:', payload.new)
          // Reload data when new item is added
          loadData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'count_items',
        },
        (payload) => {
          console.log('Count item updated:', payload.new)
          loadData()
        }
      )
      .subscribe()

    // Real-time subscription for match_results
    const matchResultsChannel = supabase
      .channel('match_results_changes')
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
      .subscribe()

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(countItemsChannel)
      supabase.removeChannel(matchResultsChannel)
    }
  }, [])

  const loadData = async () => {
    try {
      // Get count items without matches
      const { data: countItems } = await supabase
        .from('count_items')
        .select(`
          *,
          shelves (
            name,
            corridors (
              name,
              warehouses (
                name
              )
            )
          ),
          count_sessions (
            created_by,
            users (
              full_name
            )
          )
        `)
        .not('id', 'in', `(SELECT count_item_id FROM match_results WHERE status = 'matched')`)

      if (countItems) {
        setPendingItems(countItems as CountItem[])
      }

      // Get matching items (status = 'pending')
      const { data: matching } = await supabase
        .from('match_results')
        .select(`
          *,
          count_items (
            *,
            shelves (
              name,
              corridors (
                name,
                warehouses (
                  name
                )
              )
            ),
            count_sessions (
              created_by,
              users (
                full_name
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
        .eq('status', 'pending')

      if (matching) {
        setMatchingItems(matching as MatchResult[])
      }

      // Get matched items (status = 'matched')
      const { data: matched } = await supabase
        .from('match_results')
        .select(`
          *,
          count_items (
            *,
            shelves (
              name,
              corridors (
                name,
                warehouses (
                  name
                )
              )
            ),
            count_sessions (
              created_by,
              users (
                full_name
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
        .eq('status', 'matched')
        .order('matched_at', { ascending: false })
        .limit(10)

      if (matched) {
        setMatchedItems(matched as MatchResult[])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getShelfLocation = (item: CountItem) => {
    if (!item.shelves) return 'Bilinmiyor'
    // Format: A-12-03 style (simplified from shelf name)
    return item.shelves.name || 'Bilinmiyor'
  }

  const getCounterName = (item: CountItem) => {
    return item.count_sessions?.users?.full_name || 'Bilinmiyor'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">
                <span className="text-black text-sm">the</span>
                <span className="text-red-600 text-2xl">Stocktaking</span>
                <span className="text-red-600">Red</span>
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
                />
              </div>
              <button className="text-gray-600 hover:text-gray-900 p-2">
                <Bell className="h-5 w-5" />
              </button>
              <button className="text-gray-600 hover:text-gray-900 p-2">
                <Settings className="h-5 w-5" />
              </button>
              <div className="h-8 w-8 rounded-full bg-gray-300"></div>
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <button className="bg-blue-600 text-white px-6 py-2.5 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors shadow-sm">
              <FileText className="h-5 w-5" />
              <span className="font-medium">+ Yeni Sayım Ekle</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-2">Ürün Eşleştirme Panosu</h2>
          <p className="text-gray-500 text-lg">Sayılan ürünleri ERP kodları ile eşleştirin.</p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex space-x-4">
          <button className="flex items-center space-x-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Calendar className="h-5 w-5 text-gray-600" />
            <span className="text-gray-700 font-medium">Tarihe Göre</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <User className="h-5 w-5 text-gray-600" />
            <span className="text-gray-700 font-medium">Sayıcıya Göre</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <MapPin className="h-5 w-5 text-gray-600" />
            <span className="text-gray-700 font-medium">Rafa Göre</span>
          </button>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Pending Matching */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Eşleştirme Bekleyenler</h3>
              <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold">
                {pendingItems.length}
              </span>
            </div>
            <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => setSelectedItemForMatch(item)}
                >
                  {item.photo_url && (
                    <div className="relative w-full h-40 mb-4 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={item.photo_url}
                        alt={item.product_name || 'Ürün'}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900 text-base">
                      Adet: {item.quantity}
                    </p>
                    <p className="text-sm text-gray-600">Raf: {getShelfLocation(item)}</p>
                    <p className="text-sm text-gray-600">Sayıcı: {getCounterName(item)}</p>
                  </div>
                  <div className="mt-4 flex items-center space-x-3 pt-3 border-t border-gray-100">
                    <button className="text-gray-500 hover:text-gray-700 transition-colors">
                      <Mic className="h-5 w-5" />
                    </button>
                    <button className="text-gray-500 hover:text-gray-700 transition-colors">
                      <FileText className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
              {pendingItems.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p>Eşleştirme bekleyen ürün yok</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Being Matched */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Eşleştiriliyor</h3>
              <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold">
                {matchingItems.length}
              </span>
            </div>
            <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {matchingItems.map((match) => (
                <div
                  key={match.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all"
                >
                  {match.count_items.photo_url && (
                    <div className="relative w-full h-40 mb-4 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={match.count_items.photo_url}
                        alt={match.count_items.product_name || 'Ürün'}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900 text-base">
                      Adet: {match.count_items.quantity}
                    </p>
                    <p className="text-sm text-gray-600">
                      Raf: {getShelfLocation(match.count_items)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Sayıcı: {getCounterName(match.count_items)}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center space-x-3 pt-3 border-t border-gray-100">
                    <button className="text-gray-500 hover:text-gray-700 transition-colors">
                      <Mic className="h-5 w-5" />
                    </button>
                    <button className="text-gray-500 hover:text-gray-700 transition-colors">
                      <FileText className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
              {matchingItems.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p>Eşleştirilen ürün yok</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Matched */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Eşleştirildi</h3>
              <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold">
                {matchedItems.length}
              </span>
            </div>
            <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {matchedItems.map((match) => (
                <div
                  key={match.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all"
                >
                  {match.count_items.photo_url && (
                    <div className="relative w-full h-40 mb-4 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={match.count_items.photo_url}
                        alt={match.count_items.product_name || 'Ürün'}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="space-y-2 mb-4">
                    <p className="font-semibold text-gray-900 text-base">
                      Adet: {match.count_items.quantity}
                    </p>
                    <p className="text-sm text-gray-600">
                      Raf: {getShelfLocation(match.count_items)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Sayıcı: {getCounterName(match.count_items)}
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                    <p className="text-sm font-semibold text-green-800 mb-1">
                      ERP: {match.erp_items.product_code}
                    </p>
                    <p className="text-sm text-green-700">{match.erp_items.product_name}</p>
                  </div>
                  <div className="flex items-center space-x-3 pt-3 border-t border-gray-100">
                    <button className="text-gray-500 hover:text-gray-700 transition-colors">
                      <Mic className="h-5 w-5" />
                    </button>
                    <button className="text-gray-500 hover:text-gray-700 transition-colors">
                      <FileText className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
              {matchedItems.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p>Eşleştirilmiş ürün yok</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Manual Matching Modal */}
      {selectedItemForMatch && (
        <ManualMatchingModal
          countItem={selectedItemForMatch}
          isOpen={!!selectedItemForMatch}
          onClose={() => setSelectedItemForMatch(null)}
          onMatched={() => {
            loadData()
            setSelectedItemForMatch(null)
          }}
        />
      )}
    </div>
  )
}
