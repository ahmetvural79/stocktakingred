'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, FileText, CheckCircle2, AlertCircle, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

interface ERPImport {
  id: string
  file_name: string | null
  file_url: string | null
  created_at: string
  users: {
    full_name: string | null
  } | null
  erp_items_aggregate: {
    aggregate: {
      count: number
    }
  }
}

export default function ERPImportPanel() {
  const [imports, setImports] = useState<ERPImport[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const loadImports = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('erp_imports')
        .select(`
          *,
          users (
            full_name
          )
        `)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      
      if (data) {
        // Manually fetch count for each import
        const importsWithCounts = await Promise.all(
          data.map(async (importRecord) => {
            const { count } = await supabase
              .from('erp_items')
              .select('*', { count: 'exact', head: true })
              .eq('erp_import_id', importRecord.id)
            
            return {
              ...importRecord,
              erp_items_aggregate: {
                aggregate: {
                  count: count || 0
                }
              }
            }
          })
        )
        setImports(importsWithCounts as ERPImport[])
      }
    } catch (err) {
      console.error('Error loading imports:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadImports()
  }, [])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      // Read Excel file
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet)

      if (jsonData.length === 0) {
        throw new Error('Excel dosyası boş görünüyor.')
      }

      // Get user's company
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('[ERP Import] Auth error:', userError)
        throw new Error(`Kimlik doğrulama hatası: ${userError.message}`)
      }
      
      if (!user) {
        throw new Error('Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.')
      }

      console.log('[ERP Import] User authenticated:', { userId: user.id, email: user.email })

      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('company_id, role')
        .eq('id', user.id)
        .single()

      if (userDataError) {
        console.error('[ERP Import] User data error:', {
          error: userDataError,
          message: userDataError.message,
          details: userDataError.details,
          hint: userDataError.hint,
        })
        throw new Error(`Kullanıcı bilgisi alınamadı: ${userDataError.message || userDataError.details || 'Bilinmeyen hata'}`)
      }

      if (!userData) {
        throw new Error('Kullanıcı kaydı bulunamadı. Lütfen yöneticinizle iletişime geçin.')
      }

      if (!userData.company_id && userData.role !== 'main_admin') {
        throw new Error('Firma bilgisi bulunamadı. Lütfen yöneticinizle iletişime geçin.')
      }

      console.log('[ERP Import] User data loaded:', {
        userId: user.id,
        companyId: userData.company_id,
        role: userData.role,
      })

      // Upload file to storage (optional - for now we'll just process it)
      // In production, upload to Supabase Storage first

      // Create import record
      // For main_admin, we need to handle company_id differently
      // Since erp_imports requires company_id, main_admin should select a company
      // For now, we'll require company_id for all users including main_admin
      if (!userData.company_id && userData.role !== 'main_admin') {
        throw new Error('Firma bilgisi bulunamadı. Lütfen yöneticinizle iletişime geçin.')
      }

      // For main_admin without company_id, we can't create import
      // In future, we might allow main_admin to select a company
      if (userData.role === 'main_admin' && !userData.company_id) {
        throw new Error('Main admin kullanıcıları için firma seçimi gerekli. Lütfen bir firmaya atanın.')
      }

      console.log('[ERP Import] Creating import record:', {
        companyId: userData.company_id,
        fileName: file.name,
        userId: user.id,
      })

      const { data: importRecord, error: importError } = await supabase
        .from('erp_imports')
        .insert({
          company_id: userData.company_id!,
          file_name: file.name,
          imported_by: user.id,
        })
        .select()
        .single()

      if (importError) {
        console.error('[ERP Import] Import record error:', {
          error: importError,
          message: importError.message,
          details: importError.details,
          hint: importError.hint,
          code: importError.code,
        })
        throw new Error(
          importError.message ||
            importError.details ||
            importError.hint ||
            `Import kaydı oluşturulamadı: ${importError.code || 'Bilinmeyen hata'}`
        )
      }
      
      if (!importRecord) {
        throw new Error('Import kaydı oluşturulamadı.')
      }

      console.log('[ERP Import] Import record created:', {
        importId: importRecord.id,
        companyId: importRecord.company_id,
      })

      // Process and validate ERP items
      // Assume Excel has columns: product_code, product_name, stock_qty
      console.log('[ERP Import] Processing Excel data:', {
        rowCount: jsonData.length,
        firstRow: jsonData[0],
        columns: jsonData.length > 0 && jsonData[0] ? Object.keys(jsonData[0] as Record<string, unknown>) : [],
      })

      const erpItems = jsonData
        .map((row: any, index: number) => {
          const productCode = String(row.product_code || row['Ürün Kodu'] || row['Product Code'] || '').trim()
          const productName = String(row.product_name || row['Ürün Adı'] || row['Product Name'] || '').trim()
          const stockQtyStr = String(row.stock_qty || row['Stok Miktarı'] || row['Stock Qty'] || '0').trim()
          const stockQty = parseInt(stockQtyStr, 10)
          const unit = String(row.unit || row['Birim'] || row['Unit'] || 'adet').trim()

          // Validate required fields
          if (!productCode) {
            console.warn(`[ERP Import] Row ${index + 1}: Missing product_code`)
            return null
          }
          if (!productName) {
            console.warn(`[ERP Import] Row ${index + 1}: Missing product_name`)
            return null
          }
          if (isNaN(stockQty)) {
            console.warn(`[ERP Import] Row ${index + 1}: Invalid stock_qty: ${stockQtyStr}`)
            return null
          }

          return {
            erp_import_id: importRecord.id,
            product_code: productCode,
            product_name: productName,
            stock_qty: stockQty,
            unit: unit || 'adet',
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)

      if (erpItems.length === 0) {
        throw new Error('Geçerli ürün bulunamadı. Lütfen Excel dosyasında product_code ve product_name kolonlarının dolu olduğundan emin olun.')
      }

      console.log('[ERP Import] Validated ERP items:', {
        validCount: erpItems.length,
        invalidCount: jsonData.length - erpItems.length,
        sampleItem: erpItems[0],
      })

      // Insert ERP items
      const { data: insertedItems, error: itemsError } = await supabase
        .from('erp_items')
        .insert(erpItems)
        .select()

      if (itemsError) {
        console.error('[ERP Import] Insert error:', {
          error: itemsError,
          message: itemsError.message,
          details: itemsError.details,
          hint: itemsError.hint,
          code: itemsError.code,
        })
        throw new Error(
          itemsError.message ||
            itemsError.details ||
            itemsError.hint ||
            `ERP ürünleri eklenirken hata oluştu: ${itemsError.code || 'Bilinmeyen hata'}`
        )
      }

      console.log('[ERP Import] Successfully inserted items:', {
        count: insertedItems?.length || erpItems.length,
      })

      setSuccess(`${erpItems.length} ürün başarıyla import edildi.`)
      loadImports()
    } catch (err: any) {
      // Enhanced error handling
      let errorMessage = 'Import işlemi başarısız oldu.'
      
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (err && typeof err === 'object') {
        // Handle Supabase errors
        if (err.message) {
          errorMessage = err.message
        } else if (err.details) {
          errorMessage = err.details
        } else if (err.hint) {
          errorMessage = err.hint
        } else if (err.code) {
          errorMessage = `Hata kodu: ${err.code}`
        } else {
          // Try to stringify the error object
          try {
            errorMessage = JSON.stringify(err)
          } catch {
            errorMessage = 'Bilinmeyen hata oluştu'
          }
        }
      } else if (typeof err === 'string') {
        errorMessage = err
      }

      console.error('[ERP Import] Error details:', {
        error: err,
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
      })

      setError(errorMessage)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">ERP Excel Import</h2>
        <p className="mt-2 text-gray-600">
          ERP sisteminden gelen stok listesini Excel formatında yükleyin.
        </p>
      </div>

        {/* Upload Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Excel Dosyası Yükle</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Desteklenen formatlar: .xlsx, .xls
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
              Gerekli kolonlar: product_code (Ürün Kodu), product_name (Ürün Adı), stock_qty
              (Stok Miktarı)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                uploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 cursor-pointer'
              }`}
            >
              {uploading ? 'Yükleniyor...' : 'Dosya Seç'}
            </label>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Hata</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">Başarılı</p>
                <p className="text-sm text-green-700 mt-1">{success}</p>
              </div>
            </div>
          )}
        </div>

        {/* Imports List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Import Geçmişi</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {imports.map((importRecord) => (
              <div key={importRecord.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {importRecord.file_name || 'Dosya'}
                      </h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {importRecord.users?.full_name || 'Bilinmiyor'} •{' '}
                        {new Date(importRecord.created_at).toLocaleDateString('tr-TR', {
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
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {importRecord.erp_items_aggregate?.aggregate?.count || 0} ürün
                      </p>
                    </div>
                    {importRecord.file_url && (
                      <a
                        href={importRecord.file_url}
                        download
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Download className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {imports.length === 0 && !loading && (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Henüz import işlemi yapılmamış.</p>
            </div>
          )}
        </div>
    </div>
  )
}

