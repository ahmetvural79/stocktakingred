/**
 * Generate sample ERP Excel file for testing
 * 
 * Usage: npx tsx scripts/generate-sample-erp-excel.ts
 */

import * as XLSX from 'xlsx'
import * as path from 'path'
import * as fs from 'fs'

// Sample ERP data
const sampleERPData = [
  {
    product_code: 'PRD-001',
    product_name: 'Ürün Örneği 1 - Seramik Lavabo',
    stock_qty: 150,
    unit: 'adet',
  },
  {
    product_code: 'PRD-002',
    product_name: 'Ürün Örneği 2 - Asma Klozet',
    stock_qty: 85,
    unit: 'adet',
  },
  {
    product_code: 'PRD-003',
    product_name: 'Ürün Örneği 3 - Banyo Bataryası',
    stock_qty: 200,
    unit: 'adet',
  },
  {
    product_code: 'PRD-004',
    product_name: 'Ürün Örneği 4 - Rezervuar İç Takımı',
    stock_qty: 80,
    unit: 'adet',
  },
]

// Create workbook
const workbook = XLSX.utils.book_new()

// Create worksheet from data
const worksheet = XLSX.utils.json_to_sheet(sampleERPData)

// Add worksheet to workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'ERP Stok Listesi')

// Set column widths
worksheet['!cols'] = [
  { wch: 15 }, // product_code
  { wch: 40 }, // product_name
  { wch: 12 }, // stock_qty
  { wch: 10 }, // unit
]

// Write file
const outputPath = path.join(process.cwd(), 'sample-erp-import.xlsx')
XLSX.writeFile(workbook, outputPath)

console.log('✅ Örnek ERP Excel dosyası oluşturuldu:')
console.log(`📁 ${outputPath}`)
console.log('\n📋 İçerik:')
console.log(`   - ${sampleERPData.length} ürün`)
console.log('   - Kolonlar: product_code, product_name, stock_qty, unit')
console.log('\n💡 Kullanım:')
console.log('   Bu dosyayı ERP Import sayfasından yükleyebilirsiniz.')

