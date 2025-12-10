'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Search, CheckCircle2, XCircle } from 'lucide-react'
import { autoMatch, createMatchResults } from '@/lib/matching/auto-match'
import Image from 'next/image'
import { normalizeImageUrl } from '@/lib/utils/image-url'

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
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manuel Eşleştirme</h2>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Count Item Info */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-start space-x-4">
            {countItem.photo_url && normalizeImageUrl(countItem.photo_url) && (
              <div className="relative w-24 h-24 rounded overflow-hidden">
                <Image
                  src={normalizeImageUrl(countItem.photo_url)!}
                  alt="Product"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <div>
              <h3 className="font-medium text-lg text-gray-900 dark:text-white">{countItem.product_name || 'Ürün'}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Miktar: {countItem.quantity} {countItem.quantity_unit}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-5 w-5" />
            <input
              type="text"
              placeholder="ERP ürünü ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400"
            />
          </div>
        </div>

        {/* ERP Items List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-300">Yükleniyor...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-300">Ürün bulunamadı</div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedItem?.id === item.id
                      ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Kod: {item.product_code}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Stok: {item.stock_qty}</p>
                    </div>
                    {selectedItem?.id === item.id && (
                      <CheckCircle2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800"
          >
            İptal
          </button>
          <button
            onClick={handleMatch}
            disabled={!selectedItem || matching}
            className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 flex items-center space-x-2"
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

