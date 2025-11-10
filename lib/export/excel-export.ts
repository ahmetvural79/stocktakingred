import * as XLSX from 'xlsx'

interface CountItem {
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

interface MatchResult {
  count_items: CountItem
  erp_items: {
    product_code: string
    product_name: string
    stock_qty: number
  }
  difference: number
}

export function exportToExcel(matches: MatchResult[], filename: string = 'sayim-raporu.xlsx') {
  // Prepare data
  const data = matches.map((match) => ({
    'Ürün Adı': match.count_items.product_name || 'Bilinmiyor',
    'ERP Kodu': match.erp_items.product_code,
    'ERP Ürün Adı': match.erp_items.product_name,
    'Sayım Miktarı': match.count_items.quantity,
    'Birim': match.count_items.quantity_unit,
    'ERP Stok': match.erp_items.stock_qty,
    'Fark': match.difference,
    'Raf': match.count_items.shelves?.name || '',
    'Koridor': match.count_items.shelves?.corridors?.name || '',
    'Depo': match.count_items.shelves?.corridors?.warehouses?.name || '',
  }))

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)

  // Set column widths
  const colWidths = [
    { wch: 30 }, // Ürün Adı
    { wch: 15 }, // ERP Kodu
    { wch: 30 }, // ERP Ürün Adı
    { wch: 12 }, // Sayım Miktarı
    { wch: 8 }, // Birim
    { wch: 10 }, // ERP Stok
    { wch: 10 }, // Fark
    { wch: 15 }, // Raf
    { wch: 15 }, // Koridor
    { wch: 15 }, // Depo
  ]
  ws['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Sayım Raporu')

  // Write file
  XLSX.writeFile(wb, filename)
}

export function exportCountItemsToExcel(
  items: CountItem[],
  filename: string = 'sayim-listesi.xlsx'
) {
  const data = items.map((item) => ({
    'Ürün Adı': item.product_name || 'Bilinmiyor',
    'Miktar': item.quantity,
    'Birim': item.quantity_unit,
    'Raf': item.shelves?.name || '',
    'Koridor': item.shelves?.corridors?.name || '',
    'Depo': item.shelves?.corridors?.warehouses?.name || '',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)

  const colWidths = [
    { wch: 30 }, // Ürün Adı
    { wch: 12 }, // Miktar
    { wch: 8 }, // Birim
    { wch: 15 }, // Raf
    { wch: 15 }, // Koridor
    { wch: 15 }, // Depo
  ]
  ws['!cols'] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, 'Sayım Listesi')
  XLSX.writeFile(wb, filename)
}

