import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

interface SignupRequestBody {
  email: string
  password: string
  companyName: string
  fullName: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<SignupRequestBody>
    const email = body.email?.trim().toLowerCase() || ''
    const password = body.password || ''
    const companyName = body.companyName?.trim() || ''
    const fullName = body.fullName?.trim() || ''

    if (!email || !password || !companyName || !fullName) {
      return NextResponse.json(
        { error: 'Email, şifre, firma adı ve ad soyad gereklidir.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Şifre en az 6 karakter olmalıdır.' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // 1. Create auth user
    const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        company_name: companyName,
      },
    })

    if (createUserError) {
      if (createUserError.status === 422) {
        return NextResponse.json(
          { error: 'Bu email adresiyle daha önce kayıt yapılmış.' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: `Auth hatası: ${createUserError.message}` },
        { status: 400 }
      )
    }

    const userId = createdUser?.user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Kullanıcı oluşturulamadı.' },
        { status: 500 }
      )
    }

    // 2. Create company
    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .insert({ name: companyName })
      .select('id')
      .single()

    if (companyError || !company) {
      // cleanup auth user
      await adminClient.auth.admin.deleteUser(userId)

      return NextResponse.json(
        { error: `Firma oluşturulamadı: ${companyError?.message ?? 'bilinmeyen hata'}` },
        { status: 500 }
      )
    }

    // 3. Insert user record
    const { error: userInsertError } = await adminClient.from('users').insert({
      id: userId,
      company_id: company.id,
      full_name: fullName,
      email,
      role: 'admin',
    })

    if (userInsertError) {
      // cleanup
      await adminClient.auth.admin.deleteUser(userId)
      await adminClient.from('companies').delete().eq('id', company.id)

      return NextResponse.json(
        { error: `Kullanıcı kaydedilemedi: ${userInsertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Firma kaydı ve kullanıcı oluşturuldu.',
    })
  } catch (error: unknown) {
    console.error('Signup API error:', error)
    const message = error instanceof Error ? error.message : 'Kayıt işlemi başarısız oldu.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

