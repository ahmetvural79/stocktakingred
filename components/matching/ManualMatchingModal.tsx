'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Search, CheckCircle2, XCircle } from 'lucide-react'
import { autoMatch, createMatchResults } from '@/lib/matching/auto-match'

interface CountItem {
  id: string
  product_name: string | null
  quantity: number
  quantity_unit: string
  photo_url: string | null
}

interface ERPItem {
  id: string
  product_code: string
  product_name: string
  stock_qty: number
}

interface ManualMatchingModalProps {
  countItem: CountItem
  isOpen: boolean
  onClose: () => void
  onMatched: () => void
}

export default function ManualMatchingModal({
  countItem,
  isOpen,
  onClose,
  onMatched,
}: ManualMatchingModalProps) {
  const [erpItems, setErpItems] = useState<ERPItem[]>([])
  const [filteredItems, setFilteredItems] = useState<ERPItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<ERPItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [matching, setMatching] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      loadERPItems()
      runAutoMatch()
    }
  }, [isOpen])

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

  const loadERPItems = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('erp_items').select('*').limit(100)

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
  }

  const runAutoMatch = async () => {
    try {
      const { data } = await supabase.from('erp_items').select('*').limit(100)
      if (data) {
        const matches = autoMatch([countItem], data as ERPItem[], 0.6)
        if (matches.length > 0) {
          const bestMatch = matches[0]
          const matchedItem = data.find((item) => item.id === bestMatch.erpItemId)
          if (matchedItem) {
            setSelectedItem(matchedItem as ERPItem)
          }
        }
      }
    } catch (error) {
      console.error('Auto match error:', error)
    }
  }

  const handleMatch = async () => {
    if (!selectedItem) return

    try {
      setMatching(true)
      const { error } = await supabase.from('match_results').upsert({
        count_item_id: countItem.id,
        erp_item_id: selectedItem.id,
        matched_score: 1.0,
        difference: countItem.quantity - selectedItem.stock_qty,
        status: 'matched',
        matched_at: new Date().toISOString(),
      })

      if (error) throw error

      onMatched()
      onClose()
    } catch (error) {
      console.error('Match error:', error)
      alert('Eşleştirme hatası')
    } finally {
      setMatching(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Manuel Eşleştirme</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Count Item Info */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-start space-x-4">
            {countItem.photo_url && (
              <img
                src={countItem.photo_url}
                alt="Product"
                className="w-24 h-24 object-cover rounded"
              />
            )}
            <div>
              <h3 className="font-medium text-lg">{countItem.product_name || 'Ürün'}</h3>
              <p className="text-sm text-gray-600">
                Miktar: {countItem.quantity} {countItem.quantity_unit}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="ERP ürünü ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* ERP Items List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Ürün bulunamadı</div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedItem?.id === item.id
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-gray-600">Kod: {item.product_code}</p>
                      <p className="text-sm text-gray-600">Stok: {item.stock_qty}</p>
                    </div>
                    {selectedItem?.id === item.id && (
                      <CheckCircle2 className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            onClick={handleMatch}
            disabled={!selectedItem || matching}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
          >
            {matching ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Eşleştiriliyor...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Eşleştir</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

