'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, CheckCircle2 } from 'lucide-react'
import Image from 'next/image'

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

interface ERPItem {
  id: string
  product_code: string
  product_name: string
  stock_qty: number
}

interface MatchResult {
  id: string
  count_item_id: string
  erp_item_id: string | null
  matched_score: number
  difference: number
  status: 'pending' | 'matched' | 'rejected'
  count_items: CountItem
  erp_items: {
    id: string
    product_code: string
    product_name: string
    stock_qty: number
  } | null
}

interface MatchingItemPanelProps {
  match: MatchResult
  onMatched: () => void
}

export default function MatchingItemPanel({ match, onMatched }: MatchingItemPanelProps) {
  const [erpItems, setErpItems] = useState<ERPItem[]>([])
  const [filteredItems, setFilteredItems] = useState<ERPItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<ERPItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [matching, setMatching] = useState(false)
  const [showERPList, setShowERPList] = useState(true)
  const supabase = createClient()

  const loadERPItems = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('erp_items').select('*').limit(200)

      if (error) throw error
      if (data) {
        setErpItems(data as ERPItem[])
        setFilteredItems(data as ERPItem[])
      }
    } catch (error) {
      console.error('Error loading ERP items:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const initialize = async () => {
      await loadERPItems()
      // If erp_item_id is already set, set it as selected
      if (match.erp_item_id && match.erp_items) {
        setSelectedItem(match.erp_items as ERPItem)
        setShowERPList(false)
      } else {
        // If erp_item_id is null, show ERP list for selection
        setShowERPList(true)
      }
    }
    initialize()
  }, [match.erp_item_id, match.erp_items, loadERPItems])

  useEffect(() => {
    if (searchQuery) {
      const filtered = erpItems.filter(
        (item) =>
          item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.product_code.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredItems(filtered)
    } else {
      setFilteredItems(erpItems)
    }
  }, [searchQuery, erpItems])

  const getShelfLocation = (item: CountItem) => {
    if (!item.shelves) return 'Bilinmiyor'
    return item.shelves.name || 'Bilinmiyor'
  }

  const getCounterName = (item: CountItem) => {
    return item.count_sessions?.users?.full_name || 'Bilinmiyor'
  }

  const handleMatch = async () => {
    if (!selectedItem) return

    try {
      setMatching(true)
      const { error } = await supabase
        .from('match_results')
        .update({
          erp_item_id: selectedItem.id,
          matched_score: 1.0,
          difference: match.count_items.quantity - selectedItem.stock_qty,
          status: 'matched',
          matched_at: new Date().toISOString(),
        })
        .eq('id', match.id)

      if (error) throw error

      onMatched()
    } catch (error) {
      console.error('Match error:', error)
      alert('Eşleştirme hatası')
    } finally {
      setMatching(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all">
      {/* Count Item Info */}
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
          Adet: {match.count_items.quantity} {match.count_items.quantity_unit}
        </p>
        <p className="text-sm text-gray-600">
          Raf: {getShelfLocation(match.count_items)}
        </p>
        <p className="text-sm text-gray-600">
          Sayıcı: {getCounterName(match.count_items)}
        </p>
        {match.count_items.product_name && (
          <p className="text-sm text-gray-600">
            Ürün: {match.count_items.product_name}
          </p>
        )}
      </div>

      {/* ERP Selection Panel */}
      {showERPList && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">ERP Ürün Seçimi</h4>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="ERP ürünü ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* ERP Items List */}
          <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
            {loading ? (
              <div className="text-center py-4 text-sm text-gray-500">Yükleniyor...</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">Ürün bulunamadı</div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedItem?.id === item.id
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product_name}</p>
                      <p className="text-xs text-gray-600">Kod: {item.product_code}</p>
                      <p className="text-xs text-gray-600">Stok: {item.stock_qty}</p>
                    </div>
                    {selectedItem?.id === item.id && (
                      <CheckCircle2 className="h-5 w-5 text-red-600 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2">
            <button
              onClick={handleMatch}
              disabled={!selectedItem || matching}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {matching ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Eşleştiriliyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Onayla</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Already Matched Info */}
      {!showERPList && match.erp_items && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-green-800 mb-1">
              ERP: {match.erp_items.product_code}
            </p>
            <p className="text-sm text-green-700">{match.erp_items.product_name}</p>
            <p className="text-xs text-green-600 mt-1">Stok: {match.erp_items.stock_qty}</p>
          </div>
        </div>
      )}
    </div>
  )
}

