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

interface CompanyExportData {
  id: string
  name: string
  created_at: string
  users_count: number
  warehouses_count: number
  count_sessions_count: number
  erp_imports_count: number
  users?: Array<{
    id: string
    email: string | null
    full_name: string | null
    role: string
    created_at: string
  }>
}

export function exportCompaniesToExcel(
  companies: CompanyExportData[],
  filename: string = 'firma-analizi.xlsx'
) {
  // Ana firma verileri
  const companyData = companies.map((company) => ({
    'Firma ID': company.id,
    'Firma Adı': company.name,
    'Kullanıcı Sayısı': company.users_count,
    'Depo Sayısı': company.warehouses_count,
    'Sayım Listesi Sayısı': company.count_sessions_count,
    'ERP Import Sayısı': company.erp_imports_count,
    'Oluşturulma Tarihi': new Date(company.created_at).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  }))

  // Kullanıcı detayları (her firma için)
  const usersData: Array<{
    'Firma Adı': string
    'Kullanıcı Adı': string
    'E-posta': string
    'Rol': string
    'Oluşturulma Tarihi': string
  }> = []

  companies.forEach((company) => {
    if (company.users && company.users.length > 0) {
      company.users.forEach((user) => {
        usersData.push({
          'Firma Adı': company.name,
          'Kullanıcı Adı': user.full_name || 'İsimsiz',
          'E-posta': user.email || '-',
          'Rol': user.role === 'main_admin' ? 'Ana Admin' : 
                 user.role === 'admin' ? 'Admin' :
                 user.role === 'manager' ? 'Yönetici' : 'Kullanıcı',
          'Oluşturulma Tarihi': new Date(user.created_at).toLocaleDateString('tr-TR'),
        })
      })
    }
  })

  // Workbook oluştur
  const wb = XLSX.utils.book_new()

  // Firma özeti sayfası
  const wsCompanies = XLSX.utils.json_to_sheet(companyData)
  wsCompanies['!cols'] = [
    { wch: 36 }, // Firma ID
    { wch: 30 }, // Firma Adı
    { wch: 15 }, // Kullanıcı Sayısı
    { wch: 15 }, // Depo Sayısı
    { wch: 18 }, // Sayım Listesi Sayısı
    { wch: 18 }, // ERP Import Sayısı
    { wch: 20 }, // Oluşturulma Tarihi
  ]
  XLSX.utils.book_append_sheet(wb, wsCompanies, 'Firma Özeti')

  // Kullanıcı detayları sayfası (eğer varsa)
  if (usersData.length > 0) {
    const wsUsers = XLSX.utils.json_to_sheet(usersData)
    wsUsers['!cols'] = [
      { wch: 30 }, // Firma Adı
      { wch: 25 }, // Kullanıcı Adı
      { wch: 30 }, // E-posta
      { wch: 15 }, // Rol
      { wch: 20 }, // Oluşturulma Tarihi
    ]
    XLSX.utils.book_append_sheet(wb, wsUsers, 'Kullanıcı Detayları')
  }

  // Dosyayı indir
  XLSX.writeFile(wb, filename)
}

