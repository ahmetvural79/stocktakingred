'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, FileText, Clock, CheckCircle2, Package } from 'lucide-react'
import Link from 'next/link'

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
}

export default function CountSessionsList() {
  const [sessions, setSessions] = useState<CountSession[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'matched' | 'exported'>('all')
  const supabase = createClient()

  useEffect(() => {
    loadSessions()

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
  }, [filter])

  const loadSessions = async () => {
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
      
      if (data) {
        // Manually fetch count for each session
        const sessionsWithCounts = await Promise.all(
          data.map(async (session) => {
            const { count } = await supabase
              .from('count_items')
              .select('*', { count: 'exact', head: true })
              .eq('count_session_id', session.id)
            
            return {
              ...session,
              count_items_aggregate: {
                aggregate: {
                  count: count || 0
                }
              }
            }
          })
        )
        setSessions(sessionsWithCounts as CountSession[])
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold">
                <span className="text-red-600">the</span>
                <span className="text-black">Stocktaking</span>
                <span className="text-red-600"> Red</span>
              </h1>
              <div className="ml-4 flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-600">Canlı Güncelleme</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Sayım Listeleri</h2>
            <p className="mt-2 text-gray-600">Mobil uygulamadan gelen sayım listelerini görüntüleyin.</p>
            <p className="mt-1 text-sm text-green-600">
              ✨ Yeni sayım listeleri otomatik olarak burada görünecek
            </p>
          </div>
          <Link
            href="/dashboard/count-sessions/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            <span>Yeni Sayım Ekle</span>
          </Link>
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/dashboard/count-sessions/${session.id}`}
                className="block hover:bg-gray-50 transition-colors"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {session.warehouses.name}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
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
                      <div className="text-right">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Package className="h-4 w-4" />
                          <span>
                            {session.count_items_aggregate?.aggregate?.count || 0} ürün
                          </span>
                        </div>
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
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
