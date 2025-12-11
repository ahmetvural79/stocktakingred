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

    // Check environment variables - service role key required for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

    console.log('[Signup] Environment check:', {
      hasServiceRoleKey: !!serviceRoleKey,
      hasSupabaseUrl: !!supabaseUrl,
      serviceRoleKeyLength: serviceRoleKey?.length || 0,
      serviceRoleKeyPrefix: serviceRoleKey ? serviceRoleKey.substring(0, 20) : 'missing',
      serviceRoleKeyStartsWithEyJ: serviceRoleKey?.startsWith('eyJ') || false,
      supabaseUrlValue: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing',
    })

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Signup] Missing environment variables:', {
        hasServiceRoleKey: !!serviceRoleKey,
        hasSupabaseUrl: !!supabaseUrl,
        allEnvKeys: Object.keys(process.env).filter(key => key.includes('SUPABASE')),
      })
      return NextResponse.json(
        { 
          error: 'Sunucu yapılandırma hatası. Lütfen yöneticiyle iletişime geçin.',
          details: 'Environment variables eksik veya yanlış yapılandırılmış.'
        },
        { status: 500 }
      )
    }

    // Create admin client for database operations (bypasses RLS)
    let adminClient
    try {
      adminClient = createAdminClient()
      console.log('[Signup] Admin client created successfully')
    } catch (clientError) {
      console.error('[Signup] Failed to create admin client:', {
        error: clientError,
        message: clientError instanceof Error ? clientError.message : 'Unknown error',
        stack: clientError instanceof Error ? clientError.stack : undefined,
      })
      return NextResponse.json(
        { 
          error: 'Sunucu yapılandırma hatası. Lütfen yöneticiyle iletişime geçin.',
          details: clientError instanceof Error ? clientError.message : 'Admin client oluşturulamadı'
        },
        { status: 500 }
      )
    }

    // 1. Create auth user using Admin API (service role key) - email_confirm: true
    console.log('[Signup] Attempting to create auth user with admin API:', { email, hasPassword: !!password })
    
    let createdUser, createUserError
    
    // Use Admin API directly (bypasses email confirmation requirement)
    try {
      const restResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            company_name: companyName,
          },
        }),
      })
      
      if (restResponse.ok) {
        const userData = await restResponse.json()
        // Supabase Admin API returns { user: {...} } format
        createdUser = userData.user ? userData : { user: userData }
        createUserError = null
        console.log('[Signup] Auth user created successfully via Admin API')
      } else {
        const errorText = await restResponse.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText || 'Unknown error' }
        }
        createUserError = {
          message: errorData.message || errorData.error_description || `HTTP ${restResponse.status}`,
          status: restResponse.status,
        }
        console.error('[Signup] Admin API failed:', {
          status: restResponse.status,
          error: createUserError,
          responseText: errorText.substring(0, 200),
        })
      }
    } catch (authError) {
      console.error('[Signup] Exception during admin API call:', {
        error: authError,
        message: authError instanceof Error ? authError.message : 'Unknown error',
        stack: authError instanceof Error ? authError.stack : undefined,
      })
      createUserError = authError instanceof Error ? {
        message: authError.message,
        status: 500,
        name: authError.name,
      } : { message: 'Unknown error', status: 500, name: 'Error' }
    }

    if (createUserError) {
      console.error('[Signup] Create user error:', {
        message: createUserError.message,
        status: createUserError.status,
        name: createUserError.name,
        fullError: createUserError,
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
        errorMessage.includes('jwt') ||
        errorMessage.includes('unauthorized') ||
        createUserError.status === 401 ||
        createUserError.status === 403
      ) {
        console.error('[Signup] API key validation failed:', {
          errorMessage,
          status: createUserError.status,
        })
        return NextResponse.json(
          { 
            error: 'Sunucu kimlik doğrulama hatası. Lütfen yöneticiyle iletişime geçin.',
            details: `API key hatası: ${createUserError.message}`
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: `Kimlik doğrulama hatası: ${createUserError.message}` },
        { status: 400 }
      )
    }

    // Get user ID from Admin API response (format: { user: { id: ... } })
    const userId = createdUser?.user?.id

    if (!userId) {
      console.error('[Signup] No user ID in response:', { createdUser })
      return NextResponse.json(
        { error: 'Kullanıcı oluşturulamadı.' },
        { status: 500 }
      )
    }

    // 2. Create company using admin client (bypasses RLS)
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
        // cleanup auth user (using admin API)
        try {
          await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
            },
          })
        } catch (cleanupError) {
          console.error('[Signup] Failed to cleanup auth user:', cleanupError)
        }
        return NextResponse.json(
          { error: 'Sunucu kimlik doğrulama hatası. Lütfen yöneticiyle iletişime geçin.' },
          { status: 500 }
        )
      }

      // cleanup auth user (using admin API)
      try {
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
        })
      } catch (cleanupError) {
        console.error('[Signup] Failed to cleanup auth user:', cleanupError)
      }

      return NextResponse.json(
        { error: `Firma oluşturulamadı: ${companyError?.message ?? 'bilinmeyen hata'}` },
        { status: 500 }
      )
    }

    // 3. Insert user record using admin client (bypasses RLS)
    const { error: userInsertError } = await adminClient.from('users').insert({
      id: userId,
      company_id: company.id,
      full_name: fullName,
      email,
      role: 'user',
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
        // cleanup (using admin API and admin client)
        try {
          await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
            },
          })
          await adminClient.from('companies').delete().eq('id', company.id)
        } catch (cleanupError) {
          console.error('[Signup] Failed to cleanup:', cleanupError)
        }
        return NextResponse.json(
          { error: 'Sunucu kimlik doğrulama hatası. Lütfen yöneticiyle iletişime geçin.' },
          { status: 500 }
        )
      }

      // cleanup (using admin API and admin client)
      try {
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
        })
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
    console.error('[Signup] Unexpected error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: error instanceof Error ? error.constructor.name : typeof error,
    })
    
    // Handle specific error types
    if (error instanceof Error) {
      const errorMessage = error.message?.toLowerCase() || ''
      
      // Check for API key related errors
      if (
        errorMessage.includes('invalid api key') ||
        errorMessage.includes('invalid key') ||
        errorMessage.includes('api key') ||
        errorMessage.includes('service role') ||
        errorMessage.includes('environment variables') ||
        errorMessage.includes('jwt') ||
        errorMessage.includes('unauthorized')
      ) {
        return NextResponse.json(
          { 
            error: 'Sunucu kimlik doğrulama hatası. Lütfen yöneticiyle iletişime geçin.',
            details: error.message
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { 
          error: `Kayıt işlemi başarısız oldu: ${error.message}`,
          details: error.stack
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Kayıt işlemi başarısız oldu. Lütfen tekrar deneyin.',
        details: 'Beklenmeyen hata oluştu'
      },
      { status: 500 }
    )
  }
}

