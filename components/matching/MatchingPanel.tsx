'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, FileText, Calendar, User, MapPin, Mic, Edit2, Check, X } from 'lucide-react'
import Image from 'next/image'
import MatchingItemPanel from './MatchingItemPanel'
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
  count_sessions: {
    id: string
    created_by: string | null
    users: {
      full_name: string | null
    } | null
  } | null
}

interface MatchResult {
  id: string
  count_item_id: string
  erp_item_id: string | null
  matched_score: number
  difference: number
  status: 'pending' | 'matched' | 'rejected'
  matched_at?: string | null
  created_at?: string
  count_items: CountItem
  erp_items: {
    id: string
    product_code: string
    product_name: string
    stock_qty: number
  } | null
}

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

export default function MatchingPanel() {
  const [pendingItems, setPendingItems] = useState<CountItem[]>([])
  const [matchingItems, setMatchingItems] = useState<MatchResult[]>([])
  const [matchedItems, setMatchedItems] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [countSessions, setCountSessions] = useState<CountSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('all')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editQuantity, setEditQuantity] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [selectedNoteItem, setSelectedNoteItem] = useState<CountItem | null>(null)
  const [filterHasNoteOrPhoto, setFilterHasNoteOrPhoto] = useState(false)
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

  // Memoize loadData to avoid infinite loops
  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // Build query for count items
      let countItemsQuery = supabase
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
            id,
            created_by,
            users (
              full_name
            )
          )
        `)

      // Filter by selected session if not 'all'
      if (selectedSessionId !== 'all') {
        countItemsQuery = countItemsQuery.eq('count_session_id', selectedSessionId)
      }

      const { data: allCountItems, error: countItemsError } = await countItemsQuery
        .order('created_at', { ascending: true }) // FIFO: En eski önce

      if (countItemsError) {
        console.error('Error loading count items:', countItemsError)
        setPendingItems([])
      }

      // Build query for match results
      const matchResultsQuery = supabase
        .from('match_results')
        .select(`
          *,
          count_items (
            *,
            note,
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
              id,
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
        .in('status', ['pending', 'matched'])

      // Filter match results by session if selected
      if (selectedSessionId !== 'all') {
        // We need to filter by count_item's count_session_id
        // This requires a join, so we'll filter in JavaScript after fetching
      }

      const { data: allMatchResults, error: matchResultsError } = await matchResultsQuery
        .order('created_at', { ascending: true })

      if (matchResultsError) {
        console.error('Error loading match results:', matchResultsError)
      }

      // Process data in JavaScript
      const allItems = (allCountItems || []) as CountItem[]
      let allMatches = (allMatchResults || []) as MatchResult[]

      // Filter match results by session if selected (since we can't filter in SQL join)
      if (selectedSessionId !== 'all') {
        allMatches = allMatches.filter((match) => {
          const countItem = match.count_items as CountItem
          return countItem.count_sessions?.id === selectedSessionId
        })
      }

      // Apply search query filter if provided
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const filteredItems = allItems
          .filter((item) => {
            const productName = item.product_name?.toLowerCase() || ''
            const shelfName = item.shelves?.name?.toLowerCase() || ''
            const counterName = item.count_sessions?.users?.full_name?.toLowerCase() || ''
            return productName.includes(query) || shelfName.includes(query) || counterName.includes(query)
          })
          .filter((item) => {
            const itemsWithMatches = new Set(allMatches.map((match) => match.count_item_id))
            return !itemsWithMatches.has(item.id)
          })
          .sort((a, b) => {
            // FIFO: En eski önce
            const aDate = new Date(a.created_at || 0).getTime()
            const bDate = new Date(b.created_at || 0).getTime()
            return aDate - bDate
          })
        setPendingItems(filteredItems)
      } else {
        // Get items that have match_results with status='pending' or 'matched'
        const itemsWithMatches = new Set(
          allMatches.map((match) => match.count_item_id)
        )

        // Filter pending items: count_items that don't have any match_results
        // FIFO: En eski kayıtlar önce (created_at ascending zaten sıralı)
        const pending = allItems
          .filter((item) => !itemsWithMatches.has(item.id))
          .sort((a, b) => {
            // En eski önce (FIFO)
            const aDate = new Date(a.created_at || 0).getTime()
            const bDate = new Date(b.created_at || 0).getTime()
            return aDate - bDate
          })
        setPendingItems(pending)
      }

      // Filter matching items: match_results with status='pending' (FIFO: sadece 1 adet, en eski)
      const matching = allMatches
        .filter((match) => match.status === 'pending')
        .sort((a, b) => {
          // En eski match_result önce (FIFO)
          const aDate = new Date(a.created_at || 0).getTime()
          const bDate = new Date(b.created_at || 0).getTime()
          return aDate - bDate
        })
        .slice(0, 1) // Sadece 1 adet (en eski olan)
      setMatchingItems(matching)

      // Filter matched items: match_results with status='matched' (limit to 10)
      // Apply search filter if provided
      let matched = allMatches.filter((match) => match.status === 'matched')
      
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        matched = matched.filter((match) => {
          const countItem = match.count_items as CountItem
          const productName = countItem.product_name?.toLowerCase() || ''
          const shelfName = countItem.shelves?.name?.toLowerCase() || ''
          const counterName = countItem.count_sessions?.users?.full_name?.toLowerCase() || ''
          const erpCode = match.erp_items?.product_code?.toLowerCase() || ''
          const erpName = match.erp_items?.product_name?.toLowerCase() || ''
          return (
            productName.includes(query) ||
            shelfName.includes(query) ||
            counterName.includes(query) ||
            erpCode.includes(query) ||
            erpName.includes(query)
          )
        })
      }

      matched = matched
        .sort((a, b) => {
          // En yeni eşleştirilenler önce (matched_at descending)
          const aDate = a.matched_at ? new Date(a.matched_at).getTime() : 0
          const bDate = b.matched_at ? new Date(b.matched_at).getTime() : 0
          return bDate - aDate
        })
        .slice(0, 50) // Daha fazla kayıt göster (limit kaldırıldı, sadece performans için 50)
      setMatchedItems(matched)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, selectedSessionId, searchQuery])

  // Auto-move first pending item to "Eşleştiriliyor" when no item is being matched
  // This happens after a match is completed or when page loads
  const autoMoveNextItem = useCallback(async () => {
    // Only auto-move if no item is currently being matched and there are pending items
    if (matchingItems.length === 0 && pendingItems.length > 0 && !loading) {
      const firstPendingItem = pendingItems[0]
      if (!firstPendingItem) return
      
      try {
        // Check if there's already a pending match for this item
        const { data: existingMatch } = await supabase
          .from('match_results')
          .select('id')
          .eq('count_item_id', firstPendingItem.id)
          .eq('status', 'pending')
          .maybeSingle()
        
        if (!existingMatch) {
          const { error } = await supabase
            .from('match_results')
            .insert({
              count_item_id: firstPendingItem.id,
              erp_item_id: null,
              status: 'pending',
              matched_score: 0,
              difference: 0,
            })
          
          if (!error) {
            // Reload data to show the item in "Eşleştiriliyor" area
            await loadData()
          }
        }
      } catch (error) {
        // Ignore errors (item might already be in matching)
        console.log('Auto-move check:', error)
      }
    }
  }, [matchingItems.length, pendingItems, loading, loadData, supabase])

  // Auto-move next item when matchingItems becomes empty and there are pending items
  useEffect(() => {
    if (!loading && matchingItems.length === 0 && pendingItems.length > 0) {
      const timer = setTimeout(() => {
        autoMoveNextItem()
      }, 500) // Small delay to avoid race conditions
      
      return () => clearTimeout(timer)
    }
  }, [matchingItems.length, pendingItems.length, loading, autoMoveNextItem])

  useEffect(() => {
    loadCountSessions()
  }, [loadCountSessions])

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
  }, [loadData, supabase])

  const getShelfLocation = (item: CountItem) => {
    if (!item.shelves) return 'Bilinmiyor'
    // Format: A-12-03 style (simplified from shelf name)
    return item.shelves.name || 'Bilinmiyor'
  }

  const getCounterName = (item: CountItem) => {
    return item.count_sessions?.users?.full_name || 'Bilinmiyor'
  }

  // Handle note click for matched items
  const handleNoteClick = (countItem: CountItem) => {
    if (countItem.note && countItem.note.trim()) {
      setSelectedNoteItem(countItem)
      setShowNoteModal(true)
    } else {
      alert('Bu ürün için not bulunmamaktadır.')
    }
  }

  // Filter pending items by note/photo
  const filteredPendingItems = useMemo(() => {
    if (!filterHasNoteOrPhoto) return pendingItems
    return pendingItems.filter(item => 
      (item.note && item.note.trim().length > 0) || 
      (item.photo_url && item.photo_url.trim().length > 0)
    )
  }, [pendingItems, filterHasNoteOrPhoto])

  // Count items with notes or photos
  const itemsWithNoteOrPhotoCount = useMemo(() => {
    return pendingItems.filter(item => 
      (item.note && item.note.trim().length > 0) || 
      (item.photo_url && item.photo_url.trim().length > 0)
    ).length
  }, [pendingItems])

  // Handle quantity update for matched items
  const handleUpdateQuantity = useCallback(async (countItemId: string) => {
    const quantity = parseInt(editQuantity, 10)
    
    if (isNaN(quantity) || quantity < 0) {
      alert('Geçerli bir adet giriniz')
      return
    }

    try {
      setSaving(true)
      const { error } = await supabase
        .from('count_items')
        .update({
          quantity: quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', countItemId)

      if (error) {
        console.error('Error updating quantity:', error)
        alert('Adet güncellenirken hata oluştu')
        return
      }

      // Reload data to reflect changes
      await loadData()
      setEditingItemId(null)
      setEditQuantity('')
    } catch (error) {
      console.error('Error updating quantity:', error)
      alert('Adet güncellenirken hata oluştu')
    } finally {
      setSaving(false)
    }
  }, [editQuantity, supabase, loadData])

  // Start editing quantity
  const handleStartEdit = (match: MatchResult) => {
    setEditingItemId(match.count_item_id)
    setEditQuantity(match.count_items.quantity.toString())
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingItemId(null)
    setEditQuantity('')
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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-4xl font-bold text-gray-900">Ürün Eşleştirme Panosu</h2>
          <div className="flex items-center space-x-4">
            {/* Count Session Dropdown */}
            <div className="relative">
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="pl-4 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium cursor-pointer appearance-none"
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-gray-50"
              />
            </div>
          </div>
        </div>
        <p className="text-gray-500 text-lg mt-2">Sayılan ürünleri ERP kodları ile eşleştirin.</p>
      </div>

        {/* Filters */}
        <div className="mb-8 flex space-x-4 flex-wrap gap-2">
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
          <button 
            onClick={() => setFilterHasNoteOrPhoto(!filterHasNoteOrPhoto)}
            className={`flex items-center space-x-2 px-4 py-2.5 border rounded-lg transition-colors ${
              filterHasNoteOrPhoto 
                ? 'bg-purple-600 text-white border-purple-600' 
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <FileText className={`h-5 w-5 ${filterHasNoteOrPhoto ? 'text-white' : 'text-gray-600'}`} />
            <span className={`font-medium ${filterHasNoteOrPhoto ? 'text-white' : 'text-gray-700'}`}>
              Not/Fotoğraf İçerenler ({itemsWithNoteOrPhotoCount})
            </span>
          </button>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Pending Matching */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Eşleştirme Bekleyenler</h3>
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm font-semibold">
                {filteredPendingItems.length}{filterHasNoteOrPhoto ? ` / ${pendingItems.length}` : ''}
              </span>
            </div>
            <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {filteredPendingItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`bg-white dark:bg-gray-800 border rounded-xl p-4 transition-all ${
                    index === 0
                      ? 'border-red-500 dark:border-red-400 border-2 shadow-md ring-2 ring-red-200 dark:ring-red-900/30 cursor-pointer hover:shadow-lg'
                      : 'border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
                  }`}
                  onClick={async (e) => {
                    // Prevent event bubbling to avoid accidental clicks
                    e.stopPropagation()
                    
                    // FIFO mantığı: Sadece ilk sıradaki (en eski) item eşleştirme paneline geçebilir
                    // Filtre aktifse, filtrelenmiş liste içindeki ilk item seçilebilir
                    const isFirstItem = filteredPendingItems.length > 0 && filteredPendingItems[0].id === item.id
                    if (!isFirstItem) {
                      // Kullanıcıya bilgi ver
                      alert('Lütfen sıradaki ilk ürünü eşleştirin. FIFO (İlk Gelen İlk Çıkar) mantığı ile çalışıyoruz.')
                      return
                    }

                    // Eşleştirme panelinde zaten bir item varsa, yeni item eklenemez
                    if (matchingItems.length > 0) {
                      alert('Eşleştirme panelinde zaten bir ürün var. Lütfen önce mevcut ürünü eşleştirin.')
                      return
                    }
                    
                    // Check if item already has a match_result
                    const { data: existingMatch } = await supabase
                      .from('match_results')
                      .select('id')
                      .eq('count_item_id', item.id)
                      .in('status', ['pending', 'matched'])
                      .maybeSingle()

                    if (existingMatch) {
                      // Item already has a match, don't create duplicate
                      console.log('Item already has a match result')
                      loadData() // Reload to sync state
                      return
                    }

                    // Move item to "Eşleştiriliyor" by creating a match_result with status='pending'
                    try {
                      const { error } = await supabase
                        .from('match_results')
                        .insert({
                          count_item_id: item.id,
                          erp_item_id: null, // Will be set when ERP item is selected
                          status: 'pending',
                          matched_score: 0,
                          difference: 0,
                        })
                      
                      if (error) {
                        console.error('Error moving item to matching:', error)
                        // Check if it's a duplicate key error (item already in matching)
                        if (error.code === '23505' || error.message?.includes('duplicate')) {
                          // Item is already in matching, just reload
                          loadData()
                        } else {
                          alert('Ürün eşleştiriliyor alanına taşınırken hata oluştu')
                        }
                      } else {
                        // Reload data to show the item in "Eşleştiriliyor" area
                        loadData()
                      }
                    } catch (error) {
                      console.error('Error moving item to matching:', error)
                      alert('Ürün eşleştiriliyor alanına taşınırken hata oluştu')
                    }
                  }}
                >
                  {item.photo_url && normalizeImageUrl(item.photo_url) && (
                    <div className="relative w-full h-40 mb-4 rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={normalizeImageUrl(item.photo_url)!}
                        alt={item.product_name || 'Ürün'}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    {index === 0 && (
                      <div className="mb-2 px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full inline-block">
                        Sıradaki İlk Ürün (FIFO)
                      </div>
                    )}
                    <p className="font-semibold text-gray-900 dark:text-white text-base">
                      Adet: {item.quantity}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Raf: {getShelfLocation(item)}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Sayıcı: {getCounterName(item)}</p>
                  </div>
                  <div className="mt-4 flex items-center space-x-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    {/* Audio Button */}
                    {item.audio_url && (
                      <button 
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Play audio
                          const audioUrl = normalizeImageUrl(item.audio_url!)
                          if (audioUrl) {
                            const audio = new Audio(audioUrl)
                            audio.play().catch(err => {
                              console.error('Audio play error:', err)
                              alert('Ses dosyası çalınamadı')
                            })
                          }
                        }}
                        title="Ses kaydını dinle"
                      >
                        <Mic className="h-5 w-5" />
                      </button>
                    )}
                    {/* Note Button */}
                    <button 
                      className={`transition-colors ${
                        item.note 
                          ? 'text-blue-500 hover:text-blue-700' 
                          : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (item.note && item.note.trim()) {
                          setSelectedNoteItem(item)
                          setShowNoteModal(true)
                        } else {
                          alert('Bu ürün için not bulunmamaktadır.')
                        }
                      }}
                      title={item.note ? 'Notu görüntüle' : 'Not yok'}
                    >
                      <FileText className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredPendingItems.length === 0 && (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                  <p>{filterHasNoteOrPhoto ? 'Not veya fotoğraf içeren ürün yok' : 'Eşleştirme bekleyen ürün yok'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Being Matched */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Eşleştiriliyor</h3>
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm font-semibold">
                {matchingItems.length}
              </span>
            </div>
            <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {matchingItems.map((match) => (
                <MatchingItemPanel
                  key={match.id}
                  match={match}
                  onMatched={async () => {
                    await loadData()
                    // After a match is completed, auto-move next item if available
                    setTimeout(async () => {
                      await autoMoveNextItem()
                    }, 500)
                  }}
                />
              ))}
              {matchingItems.length === 0 && (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                  <p>Eşleştiriliyor alanında ürün yok</p>
                  <p className="text-sm mt-2 dark:text-gray-400">Bekleyenlerden bir ürün seçin</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Matched */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Eşleştirildi</h3>
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm font-semibold">
                {matchedItems.length}
              </span>
            </div>
            <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {matchedItems.map((match) => (
                <div
                  key={match.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-all"
                >
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
                      {editingItemId === match.count_item_id ? (
                        <div className="flex items-center space-x-2 flex-1">
                          <label className="text-sm font-semibold text-gray-900 dark:text-white">Adet:</label>
                          <input
                            type="number"
                            min="0"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            autoFocus
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400">{match.count_items.quantity_unit}</span>
                          <button
                            onClick={() => handleUpdateQuantity(match.count_item_id)}
                            disabled={saving}
                            className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                            title="Kaydet"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={saving}
                            className="p-1.5 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50"
                            title="İptal"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="font-semibold text-gray-900 dark:text-white text-base">
                            Adet: {match.count_items.quantity} {match.count_items.quantity_unit}
                          </p>
                          <button
                            onClick={() => handleStartEdit(match)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                            title="Adeti düzenle"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Raf: {getShelfLocation(match.count_items)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Sayıcı: {getCounterName(match.count_items)}
                    </p>
                  </div>
                  {match.erp_items && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                      <p className="text-sm font-semibold text-green-800 mb-1">
                        ERP: {match.erp_items.product_code}
                      </p>
                      <p className="text-sm text-green-700">{match.erp_items.product_name}</p>
                    </div>
                  )}
                  <div className="flex items-center space-x-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    {match.count_items.audio_url && (
                      <button 
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        title="Ses dosyasını çal"
                        onClick={() => {
                          const audioUrl = normalizeImageUrl(match.count_items.audio_url!)
                          if (audioUrl) {
                            const audio = new Audio(audioUrl)
                            audio.play().catch(err => {
                              console.error('Audio play error:', err)
                              alert('Ses dosyası çalınamadı')
                            })
                          }
                        }}
                      >
                        <Mic className="h-5 w-5" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleNoteClick(match.count_items)}
                      disabled={!match.count_items.note || !match.count_items.note.trim()}
                      className={`transition-colors ${
                        match.count_items.note && match.count_items.note.trim()
                          ? 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
                          : 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                      }`}
                      title={match.count_items.note && match.count_items.note.trim() ? 'Notu göster' : 'Not yok'}
                    >
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

        {/* Note Modal for Matched Items */}
        {showNoteModal && selectedNoteItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Not</h3>
                </div>
                <button
                  onClick={() => {
                    setShowNoteModal(false)
                    setSelectedNoteItem(null)
                  }}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="prose max-w-none">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {selectedNoteItem.note}
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowNoteModal(false)
                    setSelectedNoteItem(null)
                  }}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
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
