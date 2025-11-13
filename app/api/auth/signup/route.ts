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

    // Check environment variables before creating admin client
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('[Signup] Missing environment variables:', {
        hasServiceRoleKey: !!serviceRoleKey,
        hasSupabaseUrl: !!supabaseUrl,
      })
      return NextResponse.json(
        { error: 'Sunucu yapılandırma hatası. Lütfen yöneticiyle iletişime geçin.' },
        { status: 500 }
      )
    }

    let adminClient
    try {
      adminClient = createAdminClient()
    } catch (clientError) {
      console.error('[Signup] Failed to create admin client:', clientError)
      return NextResponse.json(
        { error: 'Sunucu yapılandırma hatası. Lütfen yöneticiyle iletişime geçin.' },
        { status: 500 }
      )
    }

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
      console.error('[Signup] Create user error:', {
        message: createUserError.message,
        status: createUserError.status,
        name: createUserError.name,
      })

      // Handle specific error cases
      if (createUserError.status === 422) {
        return NextResponse.json(
          { error: 'Bu email adresiyle daha önce kayıt yapılmış.' },
          { status: 409 }
        )
      }

      // Handle invalid API key errors
      const errorMessage = createUserError.message?.toLowerCase() || ''
      if (
        errorMessage.includes('invalid api key') ||
        errorMessage.includes('invalid key') ||
        errorMessage.includes('api key') ||
        createUserError.status === 401 ||
        createUserError.status === 403
      ) {
        console.error('[Signup] API key validation failed')
        return NextResponse.json(
          { error: 'Sunucu kimlik doğrulama hatası. Lütfen yöneticiyle iletişime geçin.' },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: `Kimlik doğrulama hatası: ${createUserError.message}` },
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
      console.error('[Signup] Company creation error:', {
        error: companyError,
        message: companyError?.message,
        code: companyError?.code,
      })

      // Handle invalid API key errors in company creation
      const errorMessage = companyError?.message?.toLowerCase() || ''
      if (
        errorMessage.includes('invalid api key') ||
        errorMessage.includes('invalid key') ||
        errorMessage.includes('api key') ||
        companyError?.code === 'PGRST301' ||
        companyError?.code === '42501'
      ) {
        console.error('[Signup] API key validation failed during company creation')
        // cleanup auth user
        try {
          await adminClient.auth.admin.deleteUser(userId)
        } catch (cleanupError) {
          console.error('[Signup] Failed to cleanup auth user:', cleanupError)
        }
        return NextResponse.json(
          { error: 'Sunucu kimlik doğrulama hatası. Lütfen yöneticiyle iletişime geçin.' },
          { status: 500 }
        )
      }

      // cleanup auth user
      try {
        await adminClient.auth.admin.deleteUser(userId)
      } catch (cleanupError) {
        console.error('[Signup] Failed to cleanup auth user:', cleanupError)
      }

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
      console.error('[Signup] User insert error:', {
        error: userInsertError,
        message: userInsertError.message,
        code: userInsertError.code,
      })

      // Handle invalid API key errors in user insert
      const errorMessage = userInsertError.message?.toLowerCase() || ''
      if (
        errorMessage.includes('invalid api key') ||
        errorMessage.includes('invalid key') ||
        errorMessage.includes('api key') ||
        userInsertError.code === 'PGRST301' ||
        userInsertError.code === '42501'
      ) {
        console.error('[Signup] API key validation failed during user insert')
        // cleanup
        try {
          await adminClient.auth.admin.deleteUser(userId)
          await adminClient.from('companies').delete().eq('id', company.id)
        } catch (cleanupError) {
          console.error('[Signup] Failed to cleanup:', cleanupError)
        }
        return NextResponse.json(
          { error: 'Sunucu kimlik doğrulama hatası. Lütfen yöneticiyle iletişime geçin.' },
          { status: 500 }
        )
      }

      // cleanup
      try {
        await adminClient.auth.admin.deleteUser(userId)
        await adminClient.from('companies').delete().eq('id', company.id)
      } catch (cleanupError) {
        console.error('[Signup] Failed to cleanup:', cleanupError)
      }

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
    console.error('[Signup] Unexpected error:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      const errorMessage = error.message?.toLowerCase() || ''
      
      // Check for API key related errors
      if (
        errorMessage.includes('invalid api key') ||
        errorMessage.includes('invalid key') ||
        errorMessage.includes('api key') ||
        errorMessage.includes('service role') ||
        errorMessage.includes('environment variables')
      ) {
        return NextResponse.json(
          { error: 'Sunucu kimlik doğrulama hatası. Lütfen yöneticiyle iletişime geçin.' },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: `Kayıt işlemi başarısız oldu: ${error.message}` },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Kayıt işlemi başarısız oldu. Lütfen tekrar deneyin.' },
      { status: 500 }
    )
  }
}

