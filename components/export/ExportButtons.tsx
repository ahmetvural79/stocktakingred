'use client'

import { useEffect, useState } from 'react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { FileDown, FileSpreadsheet } from 'lucide-react'
import { exportToExcel } from '@/lib/export/excel-export'
import type { MatchResult } from '@/lib/export/pdf-export'
import { generateCountReportPDF } from '@/lib/export/pdf-export'
import type { DocumentProps } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

interface ExportButtonsProps {
  matches: MatchResult[]
  sessionName?: string
}

export default function ExportButtons({ matches, sessionName }: ExportButtonsProps) {
  const [pdfDocument, setPdfDocument] = useState<ReactElement | null>(null)
  const [loadingPdf, setLoadingPdf] = useState(false)

  useEffect(() => {
    let isMounted = true
    const loadPdf = async () => {
      try {
        setLoadingPdf(true)
        const document = await generateCountReportPDF(
          matches,
          sessionName ? `Sayım Raporu - ${sessionName}` : 'Sayım Raporu'
        )
        if (isMounted) {
          setPdfDocument(document)
        }
      } catch (error) {
        console.error('PDF generate error:', error)
        if (isMounted) {
          setPdfDocument(null)
        }
      } finally {
        if (isMounted) {
          setLoadingPdf(false)
        }
      }
    }

    loadPdf()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(matches), sessionName])

  const handleExcelExport = () => {
    const filename = sessionName
      ? `sayim-raporu-${sessionName}-${new Date().toISOString().split('T')[0]}.xlsx`
      : `sayim-raporu-${new Date().toISOString().split('T')[0]}.xlsx`
    exportToExcel(matches, filename)
  }

  return (
    <div className="flex space-x-2">
      {pdfDocument ? (
        <PDFDownloadLink
          document={pdfDocument as ReactElement<DocumentProps>}
          fileName={`sayim-raporu-${new Date().toISOString().split('T')[0]}.pdf`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <FileDown className="h-4 w-4 mr-2" />
          PDF İndir
        </PDFDownloadLink>
      ) : (
        <button
          type="button"
          disabled
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-500 bg-gray-100 cursor-not-allowed"
        >
          <FileDown className="h-4 w-4 mr-2" />
          {loadingPdf ? 'PDF hazırlanıyor...' : 'PDF hazır değil'}
        </button>
      )}
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

