'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Printer, CheckCircle2, Clock, Package } from 'lucide-react'

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
  const [pendingItems, setPendingItems] = useState<BarcodeItem[]>([])
  const [printingItems, setPrintingItems] = useState<BarcodeItem[]>([])
  const [labeledItems, setLabeledItems] = useState<BarcodeItem[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Get pending items
      const { data: pending } = await supabase
        .from('barcode_labels')
        .select(`
          *,
          count_items (
            product_name,
            quantity,
            quantity_unit,
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
        .eq('status', 'pending')

      if (pending) {
        setPendingItems(pending as BarcodeItem[])
      }

      // Get printing items
      const { data: printing } = await supabase
        .from('barcode_labels')
        .select(`
          *,
          count_items (
            product_name,
            quantity,
            quantity_unit,
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

      if (printing) {
        setPrintingItems(printing as BarcodeItem[])
      }

      // Get labeled items
      const { data: labeled } = await supabase
        .from('barcode_labels')
        .select(`
          *,
          count_items (
            product_name,
            quantity,
            quantity_unit,
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
        .limit(10)

      if (labeled) {
        setLabeledItems(labeled as BarcodeItem[])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const handlePrintSelected = async () => {
    if (selectedItems.size === 0) return

    // Update status to printing
    const { error } = await supabase
      .from('barcode_labels')
      .update({ status: 'printing' })
      .in('id', Array.from(selectedItems))

    if (!error) {
      // Simulate printing process
      setTimeout(async () => {
        await supabase
          .from('barcode_labels')
          .update({ status: 'labeled', printed_at: new Date().toISOString() })
          .in('id', Array.from(selectedItems))
        setSelectedItems(new Set())
        loadData()
      }, 2000)
    }
  }

  const getShelfLocation = (item: BarcodeItem) => {
    if (!item.count_items.shelves) return 'Bilinmiyor'
    const shelf = item.count_items.shelves.name
    const corridor = item.count_items.shelves.corridors?.name || ''
    const warehouse = item.count_items.shelves.corridors?.warehouses?.name || ''
    return `${warehouse} - ${corridor} - ${shelf}`
  }

  const getProductCode = (item: BarcodeItem) => {
    if (item.erp_items) {
      return item.erp_items.product_code
    }
    return item.barcode_value.substring(0, 12)
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
            <div className="space-y-4">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => toggleSelection(item.id)}
                      className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {item.count_items.product_name || 'Ürün'}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Kod: {getProductCode(item)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Adet: {item.count_items.quantity} {item.count_items.quantity_unit}
                      </p>
                      <div className="flex items-center space-x-2 mt-2 text-sm text-gray-500">
                        <Package className="h-4 w-4" />
                        <span>Raf: {getShelfLocation(item)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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

