'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Package, ArrowLeft, CheckCircle2 } from 'lucide-react'
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
  count_items: {
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

export default function CountSessionDetail({ sessionId }: CountSessionDetailProps) {
  const [session, setSession] = useState<CountSession | null>(null)
  const [allItems, setAllItems] = useState<CountItemData[]>([])
  const [matchedItems, setMatchedItems] = useState<MatchResultData[]>([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    loadData()

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

    return () => {
      supabase.removeChannel(countItemsChannel)
      supabase.removeChannel(matchResultsChannel)
    }
  }, [loadData, supabase, sessionId])

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
              <h2 className="text-3xl font-bold text-gray-900">{session.warehouses.name}</h2>
              <p className="text-gray-500 mt-1">
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
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">{session.notes}</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Toplam Ürün</p>
              <p className="text-2xl font-bold text-gray-900">{allItems.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-gray-500">Eşleştirilmiş</p>
              <p className="text-2xl font-bold text-green-600">{matchedItems.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-500">Bekleyen</p>
              <p className="text-2xl font-bold text-yellow-600">{allItems.length - matchedItems.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-gray-500">Durum</p>
              <p className="text-lg font-medium text-gray-900">{getStatusText(session.status)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* All Items List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Tüm Ürünler</h3>
          <p className="text-sm text-gray-500 mt-1">
            Bu sayım listesindeki tüm ürünler. Eşleştirilmiş ürünler PDF veya Excel olarak export edilebilir.
          </p>
        </div>
        <div className="divide-y divide-gray-200">
          {allItems.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Henüz ürün bulunmuyor.</p>
              <p className="text-sm text-gray-400 mt-2">
                Mobil uygulamadan ürün ekledikten sonra burada görünecek.
              </p>
            </div>
          ) : (
            allItems.map((item) => {
              // Check if this item is matched
              const match = matchedItems.find((m) => m.count_items.id === item.id)
              const isMatched = !!match

              return (
                <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start space-x-4">
                    {item.photo_url && normalizeImageUrl(item.photo_url) && (
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <Image
                          src={normalizeImageUrl(item.photo_url)!}
                          alt={item.product_name || 'Ürün'}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="text-lg font-medium text-gray-900">
                              {item.product_name || 'Ürün Adı Yok'}
                            </h4>
                            {isMatched && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                                Eşleştirildi
                              </span>
                            )}
                            {!isMatched && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                                Bekliyor
                              </span>
                            )}
                          </div>
                          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Sayım Miktarı</p>
                              <p className="font-medium text-gray-900">
                                {item.quantity} {item.quantity_unit}
                              </p>
                            </div>
                            {isMatched && match && (
                              <>
                                <div>
                                  <p className="text-gray-500">ERP Kodu</p>
                                  <p className="font-medium text-gray-900">{match.erp_items.product_code}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">ERP Stok</p>
                                  <p className="font-medium text-gray-900">{match.erp_items.stock_qty}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Fark</p>
                                  <p
                                    className={`font-medium ${
                                      match.difference > 0
                                        ? 'text-red-600'
                                        : match.difference < 0
                                          ? 'text-blue-600'
                                          : 'text-green-600'
                                    }`}
                                  >
                                    {match.difference > 0 ? '+' : ''}
                                    {match.difference}
                                  </p>
                                </div>
                              </>
                            )}
                            {!isMatched && (
                              <div className="col-span-2 md:col-span-3">
                                <p className="text-gray-500">Durum</p>
                                <p className="font-medium text-yellow-600">Eşleştirme bekliyor</p>
                              </div>
                            )}
                          </div>
                          {item.shelves && (
                            <div className="mt-2 text-sm text-gray-500">
                              <p>
                                Raf: {item.shelves.name}
                                {item.shelves.corridors && (
                                  <> • Koridor: {item.shelves.corridors.name}</>
                                )}
                                {item.shelves.corridors?.warehouses && (
                                  <> • Depo: {item.shelves.corridors.warehouses.name}</>
                                )}
                              </p>
                            </div>
                          )}
                          {item.note && (
                            <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              <p>{item.note}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

