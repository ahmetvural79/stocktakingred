'use client'

import { useState } from 'react'
import { generateProductCodes, downloadCode } from '@/lib/barcode/barcode-generator'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Download, Printer } from 'lucide-react'

interface BarcodeGeneratorProps {
  countItemId: string
  productCode: string
  onGenerated?: (barcode: string, qrcode: string) => void
}

export default function BarcodeGenerator({
  countItemId,
  productCode,
  onGenerated,
}: BarcodeGeneratorProps) {
  const [barcode, setBarcode] = useState<string | null>(null)
  const [qrcode, setQrcode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const { barcode: barcodeData, qrcode: qrcodeData } = await generateProductCodes(
        productCode,
        countItemId
      )

      setBarcode(barcodeData)
      setQrcode(qrcodeData)

      // Save to database
      const { error } = await supabase.from('barcode_labels').upsert({
        count_item_id: countItemId,
        barcode_value: productCode,
        qr_code_value: JSON.stringify({ productCode, countItemId }),
        status: 'pending',
      })

      if (error) throw error

      if (onGenerated) {
        onGenerated(barcodeData, qrcodeData)
      }
    } catch (error) {
      console.error('Error generating codes:', error)
      alert('Barkod oluşturma hatası')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    if (!barcode || !qrcode) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <html>
        <head>
          <title>Barkod Etiketi</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .barcode-container {
              margin: 20px 0;
              text-align: center;
            }
            .barcode-container img {
              max-width: 100%;
              height: auto;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            <h3>Barkod</h3>
            <img src="${barcode}" alt="Barcode" />
            <p>${productCode}</p>
          </div>
          <div class="barcode-container">
            <h3>QR Kod</h3>
            <img src="${qrcode}" alt="QR Code" />
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Oluşturuluyor...</span>
          </>
        ) : (
          <span>Barkod ve QR Kod Oluştur</span>
        )}
      </button>

      {barcode && qrcode && (
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4 text-center">
            <h4 className="font-medium mb-2">Barkod</h4>
            <img src={barcode} alt="Barcode" className="mx-auto mb-2" />
            <div className="flex space-x-2 justify-center">
              <button
                onClick={() => downloadCode(barcode, `barcode-${productCode}.png`)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <Download className="h-4 w-4" />
                <span>İndir</span>
              </button>
            </div>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <h4 className="font-medium mb-2">QR Kod</h4>
            <img src={qrcode} alt="QR Code" className="mx-auto mb-2" />
            <div className="flex space-x-2 justify-center">
              <button
                onClick={() => downloadCode(qrcode, `qrcode-${productCode}.png`)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <Download className="h-4 w-4" />
                <span>İndir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {barcode && qrcode && (
        <button
          onClick={handlePrint}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
        >
          <Printer className="h-4 w-4" />
          <span>Yazdır</span>
        </button>
      )}
    </div>
  )
}

