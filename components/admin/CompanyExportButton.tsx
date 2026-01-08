'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { exportCompaniesToExcel } from '@/lib/export/excel-export'

export default function CompanyExportButton() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleExport = async () => {
    try {
      setLoading(true)

      // Tüm firmaları çek (sayfalama olmadan)
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })

      if (companiesError) throw companiesError
      if (!companies || companies.length === 0) {
        alert('Export için firma bulunamadı')
        return
      }

      // Her firma için detaylı bilgileri çek
      const companiesWithDetails = await Promise.all(
        companies.map(async (company) => {
          // Kullanıcıları çek
          const { data: users } = await supabase
            .from('users')
            .select('id, email, full_name, role, created_at')
            .eq('company_id', company.id)
            .order('created_at', { ascending: false })

          // İstatistikleri çek
          const [
            { count: usersCount },
            { count: warehousesCount },
            { count: sessionsCount },
            { count: importsCount },
          ] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
            supabase.from('warehouses').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
            supabase.from('count_sessions').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
            supabase.from('erp_imports').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
          ])

          return {
            id: company.id,
            name: company.name,
            created_at: company.created_at,
            users_count: usersCount || 0,
            warehouses_count: warehousesCount || 0,
            count_sessions_count: sessionsCount || 0,
            erp_imports_count: importsCount || 0,
            users: users || [],
          }
        })
      )

      // Excel dosyasını oluştur
      const filename = `firma-analizi-${new Date().toISOString().split('T')[0]}.xlsx`
      exportCompaniesToExcel(companiesWithDetails, filename)

      alert('Excel dosyası başarıyla oluşturuldu!')
    } catch (error) {
      console.error('Export error:', error)
      alert('Excel dosyası oluşturulurken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span>Hazırlanıyor...</span>
        </>
      ) : (
        <>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          <span>Excel İndir</span>
        </>
      )}
    </button>
  )
}

