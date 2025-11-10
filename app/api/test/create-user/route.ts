import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Test kullanıcısı oluşturma endpoint'i
 * 
 * Kullanım:
 * POST /api/test/create-user
 * Body: { email: "test@example.com", password: "password123", fullName: "Test User", companyName: "Test Firma A" }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, companyName } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email ve password gerekli' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 1. Kullanıcı oluştur (Supabase Auth)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Email'i otomatik confirm et
    })

    if (authError) {
      // Eğer kullanıcı zaten varsa, onu al
      const { data: existingUser } = await supabase.auth.admin.getUserByEmail(email)
      if (existingUser?.user) {
        // Kullanıcı zaten var, devam et
        const userId = existingUser.user.id
        
        // Firma oluştur veya bul
        let companyId
        if (companyName) {
          const { data: company } = await supabase
            .from('companies')
            .select('id')
            .eq('name', companyName)
            .single()

          if (company) {
            companyId = company.id
          } else {
            const { data: newCompany } = await supabase
              .from('companies')
              .insert({ name: companyName })
              .select()
              .single()
            companyId = newCompany?.id
          }
        } else {
          // Varsayılan test firması
          const { data: defaultCompany } = await supabase
            .from('companies')
            .select('id')
            .eq('name', 'Test Firma A')
            .single()
          companyId = defaultCompany?.id || '00000000-0000-0000-0000-000000000001'
        }

        // Users tablosuna ekle
        await supabase.from('users').upsert({
          id: userId,
          company_id: companyId,
          full_name: fullName || 'Test User',
          email: email,
          role: 'admin',
        })

        return NextResponse.json({
          success: true,
          message: 'Kullanıcı zaten mevcut, bilgileri güncellendi',
          user: {
            email,
            userId,
            companyId,
          },
        })
      }
      
      return NextResponse.json(
        { error: `Auth hatası: ${authError.message}` },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Kullanıcı oluşturulamadı' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // 2. Firma oluştur veya bul
    let companyId
    if (companyName) {
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('name', companyName)
        .single()

      if (company) {
        companyId = company.id
      } else {
        const { data: newCompany } = await supabase
          .from('companies')
          .insert({ name: companyName })
          .select()
          .single()
        companyId = newCompany?.id
      }
    } else {
      // Varsayılan test firması
      const { data: defaultCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('name', 'Test Firma A')
        .single()
      
      if (!defaultCompany) {
        // Test firması yoksa oluştur
        const { data: newCompany } = await supabase
          .from('companies')
          .insert({ name: 'Test Firma A' })
          .select()
          .single()
        companyId = newCompany?.id
      } else {
        companyId = defaultCompany.id
      }
    }

    // 3. Users tablosuna ekle
    const { error: userError } = await supabase.from('users').upsert({
      id: userId,
      company_id: companyId,
      full_name: fullName || 'Test User',
      email: email,
      role: 'admin',
    })

    if (userError) {
      return NextResponse.json(
        { error: `User kaydı hatası: ${userError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Test kullanıcısı başarıyla oluşturuldu',
      user: {
        email,
        password,
        userId,
        companyId,
      },
    })
  } catch (error: any) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: error.message || 'Kullanıcı oluşturma hatası' },
      { status: 500 }
    )
  }
}

