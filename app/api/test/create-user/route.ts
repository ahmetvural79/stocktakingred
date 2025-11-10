import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface CreateUserBody {
  email: string
  password: string
  fullName?: string
  companyName?: string
}

const DEFAULT_COMPANY_NAME = 'Test Firma A'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateUserBody
    const { email, password, fullName, companyName } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email ve password gerekli' },
        { status: 400 }
      )
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Supabase servis ortam değişkenleri tanımlı değil' },
        { status: 500 }
      )
    }

    const supabase = await createClient()

    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    }

    let userId: string | null = null
    let createdNewUser = false

    // 1. Auth kullanıcı oluştur
    const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
      }),
    })

    if (createResponse.ok) {
      const authData = await createResponse.json()
      userId = authData.user?.id ?? null
      createdNewUser = true
    } else if (createResponse.status === 422) {
      // Kullanıcı zaten varsa getir
      const existingResponse = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
        { headers: adminHeaders }
      )

      if (existingResponse.ok) {
        const existingData = await existingResponse.json()
        const existingUser =
          Array.isArray(existingData?.users) && existingData.users.length > 0
            ? existingData.users[0]
            : existingData?.user

        userId = existingUser?.id ?? null
      }

      if (!userId) {
        return NextResponse.json(
          { error: 'Kullanıcı zaten var ancak bilgilerine erişilemedi.' },
          { status: 400 }
        )
      }
    } else {
      const errorText = await createResponse.text()
      return NextResponse.json(
        { error: `Auth hatası: ${errorText}` },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Kullanıcı oluşturulamadı' },
        { status: 500 }
      )
    }

    // 2. Firma oluştur veya bul
    const targetCompanyName = companyName?.trim() || DEFAULT_COMPANY_NAME

    const { data: existingCompany, error: companyFetchError } = await supabase
      .from('companies')
      .select('id')
      .eq('name', targetCompanyName)
      .single()

    if (companyFetchError && companyFetchError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: `Firma bilgisi alınamadı: ${companyFetchError.message}` },
        { status: 500 }
      )
    }

    let companyId = existingCompany?.id

    if (!companyId) {
      const { data: newCompany, error: createCompanyError } = await supabase
        .from('companies')
        .insert({ name: targetCompanyName })
        .select()
        .single()

      if (createCompanyError) {
        return NextResponse.json(
          { error: `Firma oluşturulamadı: ${createCompanyError.message}` },
          { status: 500 }
        )
      }

      companyId = newCompany?.id
    }

    if (!companyId) {
      return NextResponse.json(
        { error: 'Firma bilgisi oluşturulamadı' },
        { status: 500 }
      )
    }

    // 3. Users tablosuna ekle/güncelle
    const { error: userError } = await supabase.from('users').upsert({
      id: userId,
      company_id: companyId,
      full_name: fullName?.trim() || 'Test User',
      email,
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
      message: createdNewUser
        ? 'Test kullanıcısı başarıyla oluşturuldu'
        : 'Kullanıcı bilgileri güncellendi',
      user: {
        email,
        password,
        userId,
        companyId,
      },
    })
  } catch (error: unknown) {
    console.error('Create user error:', error)
    const message = error instanceof Error ? error.message : 'Kullanıcı oluşturma hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
