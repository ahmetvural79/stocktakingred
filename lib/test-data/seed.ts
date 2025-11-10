/**
 * Test verileri oluşturma scripti
 * Bu script Next.js API route olarak çalıştırılabilir
 */

import { createClient } from '@/lib/supabase/server'

export async function seedTestData() {
  const supabase = await createClient()
  
  // Test firması oluştur
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .upsert({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Firma A',
    })
    .select()
    .single()

  if (companyError) {
    console.error('Company error:', companyError)
    return { error: companyError }
  }

  // Test depoları
  const warehouses = [
    { name: 'Ana Depo', description: 'Merkez depo binası' },
    { name: 'Yan Depo', description: 'Yan depo binası' },
  ]

  for (const warehouse of warehouses) {
    await supabase.from('warehouses').upsert({
      company_id: company.id,
      name: warehouse.name,
      description: warehouse.description,
    })
  }

  // İlk depoyu al
  const { data: firstWarehouse } = await supabase
    .from('warehouses')
    .select('id')
    .eq('company_id', company.id)
    .limit(1)
    .single()

  if (!firstWarehouse) {
    return { error: 'Warehouse not found' }
  }

  // Test koridorları
  const corridors = ['Koridor A', 'Koridor B', 'Koridor C']
  for (const corridorName of corridors) {
    await supabase.from('corridors').upsert({
      warehouse_id: firstWarehouse.id,
      name: corridorName,
    })
  }

  // İlk koridoru al
  const { data: firstCorridor } = await supabase
    .from('corridors')
    .select('id')
    .eq('warehouse_id', firstWarehouse.id)
    .limit(1)
    .single()

  if (!firstCorridor) {
    return { error: 'Corridor not found' }
  }

  // Test rafları - Image'deki gibi format: A-12-03, C-05-11, etc.
  const shelfNames = ['A-12-03', 'C-05-11', 'B-01-01', 'D-21-09', 'A-02-05', 'Z-99-10']
  const shelfIds: string[] = []
  
  for (const shelfName of shelfNames) {
    const { data: shelf } = await supabase
      .from('shelves')
      .upsert({
        corridor_id: firstCorridor.id,
        name: shelfName,
      })
      .select('id')
      .single()
    
    if (shelf) {
      shelfIds.push(shelf.id)
    }
  }

  // Test ERP import
  const { data: erpImport } = await supabase
    .from('erp_imports')
    .upsert({
      company_id: company.id,
      file_name: 'erp_stock_2024.xlsx',
      file_url: 'https://example.com/files/erp_stock_2024.xlsx',
    })
    .select()
    .single()

  if (!erpImport) {
    return { error: 'ERP import failed' }
  }

  // Test ERP items - Image'deki gibi
  const erpItems = [
    { code: '123-XYZ-001', name: 'Vitra Asma Klozet', qty: 120 },
    { code: '456-ABC-002', name: 'VitrA Gömme Lavabo', qty: 500 },
    { code: 'VTR-4512-B', name: 'Vitra Seramik Lavabo', qty: 150 },
    { code: 'KLE-7890-X', name: 'Kale Asma Klozet', qty: 85 },
    { code: 'IDS-1234-C', name: 'Ideal Standard Banyo Bataryası', qty: 200 },
  ]

  const erpItemIds: string[] = []
  for (const item of erpItems) {
    const { data: erpItem } = await supabase
      .from('erp_items')
      .upsert({
        erp_import_id: erpImport.id,
        product_code: item.code,
        product_name: item.name,
        stock_qty: item.qty,
        unit: 'adet',
      })
      .select('id')
      .single()
    
    if (erpItem) {
      erpItemIds.push(erpItem.id)
    }
  }

  // Test kullanıcıları oluştur (users tablosuna - auth kullanıcıları manuel oluşturulmalı)
  // Önce mevcut kullanıcıları kontrol et
  const { data: existingUsers } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('company_id', company.id)
    .limit(3)

  let userIds: string[] = []
  if (existingUsers && existingUsers.length > 0) {
    userIds = existingUsers.map(u => u.id)
  } else {
    // Eğer kullanıcı yoksa, placeholder ID'ler kullan (gerçek kullanıcılar auth'dan oluşturulmalı)
    console.warn('No users found. Please create users via auth first.')
  }

  // Count sessions oluştur
  const countSessions: string[] = []
  for (let i = 0; i < 3; i++) {
    const userId = userIds[i] || null
    const { data: session } = await supabase
      .from('count_sessions')
      .insert({
        warehouse_id: firstWarehouse.id,
        company_id: company.id,
        created_by: userId,
        status: 'pending',
      })
      .select('id')
      .single()
    
    if (session) {
      countSessions.push(session.id)
    }
  }

  // Count items oluştur - Image'deki örnekler gibi
  const countItemsData = [
    {
      quantity: 15,
      shelfIndex: 0,
      sessionIndex: 0,
      photoUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop',
    },
    {
      quantity: 42,
      shelfIndex: 1,
      sessionIndex: 1,
      photoUrl: 'https://images.unsplash.com/photo-1600077106724-946750eeaf3c?w=400&h=300&fit=crop',
    },
    {
      quantity: 250,
      shelfIndex: 2,
      sessionIndex: 2,
      photoUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop',
    },
    {
      quantity: 8,
      shelfIndex: 3,
      sessionIndex: 0,
      photoUrl: 'https://images.unsplash.com/photo-1600077106724-946750eeaf3c?w=400&h=300&fit=crop',
    },
    {
      quantity: 120,
      shelfIndex: 4,
      sessionIndex: 1,
      photoUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop',
    },
    {
      quantity: 500,
      shelfIndex: 5,
      sessionIndex: 2,
      photoUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop',
    },
  ]

  const countItemIds: string[] = []
  for (const itemData of countItemsData) {
    const { data: countItem } = await supabase
      .from('count_items')
      .insert({
        count_session_id: countSessions[itemData.sessionIndex] || countSessions[0],
        shelf_id: shelfIds[itemData.shelfIndex] || shelfIds[0],
        quantity: itemData.quantity,
        quantity_unit: 'adet',
        photo_url: itemData.photoUrl,
      })
      .select('id')
      .single()
    
    if (countItem) {
      countItemIds.push(countItem.id)
    }
  }

  // Match results oluştur - Image'deki gibi
  // 2 matched item (son 2 count item)
  if (countItemIds.length >= 2 && erpItemIds.length >= 2) {
    // Matched items
    await supabase.from('match_results').upsert([
      {
        count_item_id: countItemIds[countItemIds.length - 2],
        erp_item_id: erpItemIds[0], // 123-XYZ-001
        matched_score: 0.95,
        difference: 0,
        status: 'matched',
        matched_at: new Date().toISOString(),
      },
      {
        count_item_id: countItemIds[countItemIds.length - 1],
        erp_item_id: erpItemIds[1], // 456-ABC-002
        matched_score: 0.92,
        difference: 0,
        status: 'matched',
        matched_at: new Date().toISOString(),
      },
    ])

    // 1 matching item (pending status)
    if (countItemIds.length >= 3) {
      await supabase.from('match_results').upsert({
        count_item_id: countItemIds[countItemIds.length - 3],
        erp_item_id: erpItemIds[2] || erpItemIds[0],
        matched_score: 0.75,
        difference: 5,
        status: 'pending',
      })
    }
  }

  // Users tablosunu güncelle - full_name'leri image'deki gibi ayarla
  // Not: Bu sadece users tablosunu günceller, auth kullanıcıları manuel oluşturulmalı
  const userNames = ['Ali Yılmaz', 'Veli Kaya', 'Ayşe Demir']
  for (let i = 0; i < Math.min(userIds.length, userNames.length); i++) {
    await supabase
      .from('users')
      .update({ full_name: userNames[i] })
      .eq('id', userIds[i])
  }

  return {
    success: true,
    companyId: company.id,
    warehouseId: firstWarehouse.id,
    corridorId: firstCorridor.id,
    message: 'Test data created. Note: Users must be created via Supabase Auth first for full functionality.',
  }
}

