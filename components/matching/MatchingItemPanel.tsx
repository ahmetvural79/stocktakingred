'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, CheckCircle2, X, List, Package, Mic, FileText, Pause } from 'lucide-react'
import Image from 'next/image'
import { normalizeImageUrl } from '@/lib/utils/image-url'

interface CountItem {
  id: string
  product_name: string | null
  quantity: number
  quantity_unit: string
  photo_url: string | null
  audio_url: string | null
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
  created_at?: string
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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<ERPItem | null>(null)
  const [manualStockQty, setManualStockQty] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [matching, setMatching] = useState(false)
  const [showERPList, setShowERPList] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const supabase = createClient()

  // Load ERP items from latest import, sorted by import date
  const loadERPItems = useCallback(async () => {
    try {
      setLoading(true)
      
      // First, get the latest ERP import
      const { data: latestImport, error: importError } = await supabase
        .from('erp_imports')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (importError) {
        console.error('Error loading latest import:', importError)
        // If no import found, try to get all items anyway
        const { data: allItems, error: itemsError } = await supabase
          .from('erp_items')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)

        if (itemsError) throw itemsError
        if (allItems) {
          setErpItems(allItems as ERPItem[])
        }
        return
      }

      if (!latestImport) {
        console.warn('No ERP import found')
        setErpItems([])
        return
      }

      // Get ERP items from the latest import
      const { data, error } = await supabase
        .from('erp_items')
        .select('*')
        .eq('erp_import_id', latestImport.id)
        .order('created_at', { ascending: false })
        .limit(100) // Get all items from latest import

      if (error) throw error
      if (data) {
        setErpItems(data as ERPItem[])
      }
    } catch (error) {
      console.error('Error loading ERP items:', error)
      setErpItems([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const initialize = async () => {
      await loadERPItems()
      // If erp_item_id is already set, set it as selected
      if (match.erp_item_id && match.erp_items) {
        const erpItem = match.erp_items as ERPItem
        setSelectedItem(erpItem)
        setManualStockQty(erpItem.stock_qty.toString())
        setShowERPList(false)
      } else {
        // If erp_item_id is null, show ERP list for selection
        setShowERPList(true)
      }
    }
    initialize()
  }, [match.erp_item_id, match.erp_items, loadERPItems])

  // Real-time search with debounce
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return erpItems.slice(0, 10) // Show only first 10 items when no search
    }
    
    const query = searchQuery.toLowerCase().trim()
    return erpItems.filter(
      (item) =>
        item.product_name.toLowerCase().includes(query) ||
        item.product_code.toLowerCase().includes(query)
    )
  }, [searchQuery, erpItems])

  // Handle search input with debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    
    // Set new timer for debounce (optional, can remove if instant search is preferred)
    const timer = setTimeout(() => {
      // Search is already handled by useMemo
    }, 100)
    setDebounceTimer(timer)
  }

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

  // Handle item selection
  const handleItemSelect = (item: ERPItem) => {
    setSelectedItem(item)
    setManualStockQty(item.stock_qty.toString())
  }

  const getShelfLocation = (item: CountItem) => {
    if (!item.shelves) return 'Bilinmiyor'
    return item.shelves.name || 'Bilinmiyor'
  }

  const getCounterName = (item: CountItem) => {
    return item.count_sessions?.users?.full_name || 'Bilinmiyor'
  }

  // Handle audio play/pause
  const handleAudioPlay = () => {
    if (!match.count_items.audio_url) {
      alert('Ses dosyası bulunamadı')
      return
    }

    // Use normalizeImageUrl for audio URLs as well (same URL normalization logic)
    const audioUrl = normalizeImageUrl(match.count_items.audio_url)
    if (!audioUrl) {
      alert('Ses dosyası URL\'si geçersiz')
      return
    }

    // If audio is already playing, pause it
    if (audioRef.current && isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      return
    }

    // If audio element exists but paused, resume
    if (audioRef.current && audioRef.current.src === audioUrl) {
      audioRef.current.play().catch((error) => {
        console.error('Error playing audio:', error)
        alert('Ses dosyası çalınamadı')
        setIsPlaying(false)
      })
      setIsPlaying(true)
      return
    }

    // Create new audio element
    const audio = new Audio(audioUrl)
    audioRef.current = audio
    
    // Handle audio events
    const handleEnded = () => {
      setIsPlaying(false)
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleEnded)
        audioRef.current.removeEventListener('error', handleError)
      }
    }
    
    const handleError = (error: Event) => {
      console.error('Audio error:', error)
      alert('Ses dosyası çalınamadı')
      setIsPlaying(false)
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleEnded)
        audioRef.current.removeEventListener('error', handleError)
        audioRef.current = null
      }
    }

    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    // Play audio
    audio.play().catch((error) => {
      console.error('Error playing audio:', error)
      alert('Ses dosyası çalınamadı')
      setIsPlaying(false)
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleEnded)
        audioRef.current.removeEventListener('error', handleError)
        audioRef.current = null
      }
    })
    setIsPlaying(true)
  }

  // Cleanup audio on unmount or when match changes
  useEffect(() => {
    // Reset playing state when match changes
    setIsPlaying(false)
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        // Remove all event listeners by cloning the audio element
        audioRef.current.src = ''
        audioRef.current = null
      }
      setIsPlaying(false)
    }
  }, [match.id]) // Cleanup when match changes

  // Handle note modal
  const handleNoteClick = () => {
    if (match.count_items.note) {
      setShowNoteModal(true)
    }
  }

  const handleMatch = async () => {
    if (!selectedItem) return

    try {
      setMatching(true)
      
      // Use manual stock quantity if provided, otherwise use item's stock_qty
      const stockQty = manualStockQty ? parseInt(manualStockQty, 10) : selectedItem.stock_qty
      
      if (isNaN(stockQty) || stockQty < 0) {
        alert('Geçerli bir stok sayısı giriniz')
        return
      }

      const { error } = await supabase
        .from('match_results')
        .update({
          erp_item_id: selectedItem.id,
          matched_score: 1.0,
          difference: match.count_items.quantity - stockQty,
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
      {match.count_items.photo_url && normalizeImageUrl(match.count_items.photo_url) && (
        <div className="relative w-full h-40 mb-4 rounded-lg overflow-hidden bg-gray-100">
          <Image
            src={normalizeImageUrl(match.count_items.photo_url)!}
            alt={match.count_items.product_name || 'Ürün'}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900 text-base">
            Adet: {match.count_items.quantity} {match.count_items.quantity_unit}
          </p>
          <div className="flex items-center space-x-2">
            {/* Audio Button */}
            {match.count_items.audio_url && (
              <button
                onClick={handleAudioPlay}
                className={`p-2 rounded-lg transition-colors ${
                  isPlaying
                    ? 'bg-red-100 text-red-600 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Ses dosyasını çal"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
            )}
            {/* Note Button */}
            {match.count_items.note && (
              <button
                onClick={handleNoteClick}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                title="Notu göster"
              >
                <FileText className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
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
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">ERP Ürün Seçimi</h4>
              <button
                onClick={() => setShowModal(true)}
                className="text-xs text-red-600 hover:text-red-700 flex items-center space-x-1"
              >
                <List className="h-3 w-3" />
                <span>Tüm Liste</span>
              </button>
            </div>
            
            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Ürün kodu veya adı ile ara..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Selected Item Display */}
            {selectedItem && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{selectedItem.product_name}</p>
                    <p className="text-xs text-gray-600">Kod: {selectedItem.product_code}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-red-600 flex-shrink-0 ml-2" />
                </div>
                
                {/* Stock Quantity Input */}
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Stok Sayısı
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={manualStockQty}
                    onChange={(e) => setManualStockQty(e.target.value)}
                    placeholder={selectedItem.stock_qty.toString()}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Mevcut stok: {selectedItem.stock_qty}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ERP Items List - Compact View */}
          <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
            {loading ? (
              <div className="text-center py-4 text-sm text-gray-500">Yükleniyor...</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">
                {searchQuery ? 'Arama sonucu bulunamadı' : 'Ürün bulunamadı'}
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemSelect(item)}
                  className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                    selectedItem?.id === item.id
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs text-gray-900 truncate">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-gray-600">Kod: {item.product_code}</p>
                      <p className="text-xs text-gray-500">Stok: {item.stock_qty}</p>
                    </div>
                    {selectedItem?.id === item.id && (
                      <CheckCircle2 className="h-4 w-4 text-red-600 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Show more indicator */}
          {!searchQuery && erpItems.length > 10 && (
            <div className="text-center mb-4">
              <button
                onClick={() => setShowModal(true)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                +{erpItems.length - 10} daha fazla ürün göster
              </button>
            </div>
          )}

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

      {/* ERP List Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">ERP Ürün Listesi</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Ürün kodu veya adı ile ara..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
              ) : erpItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Ürün bulunamadı</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {erpItems
                    .filter((item) => {
                      if (!searchQuery.trim()) return true
                      const query = searchQuery.toLowerCase().trim()
                      return (
                        item.product_name.toLowerCase().includes(query) ||
                        item.product_code.toLowerCase().includes(query)
                      )
                    })
                    .map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          handleItemSelect(item)
                          setShowModal(false)
                        }}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedItem?.id === item.id
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">{item.product_name}</p>
                            <p className="text-xs text-gray-600 mt-1">Kod: {item.product_code}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              <Package className="inline h-3 w-3 mr-1" />
                              Stok: {item.stock_qty}
                            </p>
                          </div>
                          {selectedItem?.id === item.id && (
                            <CheckCircle2 className="h-5 w-5 text-red-600 flex-shrink-0 ml-2" />
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Not</h3>
              </div>
              <button
                onClick={() => setShowNoteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose max-w-none">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {match.count_items.note}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-end space-x-2">
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

