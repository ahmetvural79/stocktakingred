'use client'

import { PDFDownloadLink } from '@react-pdf/renderer'
import { FileDown, FileSpreadsheet } from 'lucide-react'
import { exportToExcel, exportCountItemsToExcel } from '@/lib/export/excel-export'
import { generateCountReportPDF } from '@/lib/export/pdf-export'

interface MatchResult {
  count_items: {
    product_name: string | null
    quantity: number
    quantity_unit: string
    shelves?: {
      name: string
      corridors?: {
        name: string
        warehouses?: {
          name: string
        }
      }
    } | null
  }
  erp_items: {
    product_code: string
    product_name: string
    stock_qty: number
  }
  difference: number
}

interface ExportButtonsProps {
  matches: MatchResult[]
  sessionName?: string
}

export default function ExportButtons({ matches, sessionName }: ExportButtonsProps) {
  const handleExcelExport = () => {
    const filename = sessionName
      ? `sayim-raporu-${sessionName}-${new Date().toISOString().split('T')[0]}.xlsx`
      : `sayim-raporu-${new Date().toISOString().split('T')[0]}.xlsx`
    exportToExcel(matches, filename)
  }

  const PDFReport = generateCountReportPDF(
    matches,
    sessionName ? `Sayım Raporu - ${sessionName}` : 'Sayım Raporu'
  )

  return (
    <div className="flex space-x-2">
      <PDFDownloadLink
        document={<PDFReport />}
        fileName={`sayim-raporu-${new Date().toISOString().split('T')[0]}.pdf`}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
      >
        <FileDown className="h-4 w-4 mr-2" />
        PDF İndir
      </PDFDownloadLink>
      <button
        onClick={handleExcelExport}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Excel İndir
      </button>
    </div>
  )
}

