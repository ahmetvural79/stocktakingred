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

    console.log('[Signup] Request received:', {
      hasEmail: !!email,
      hasPassword: !!password,
      hasCompanyName: !!companyName,
      hasFullName: !!fullName,
      emailLength: email.length,
      passwordLength: password.length,
      companyNameLength: companyName.length,
      fullNameLength: fullName.length,
    })

    if (!email || !password || !companyName || !fullName) {
      const missingFields = []
      if (!email) missingFields.push('email')
      if (!password) missingFields.push('password')
      if (!companyName) missingFields.push('companyName')
      if (!fullName) missingFields.push('fullName')
      
      console.error('[Signup] Validation error - Missing required fields:', {
        missingFields,
        receivedData: { email: !!email, password: !!password, companyName: !!companyName, fullName: !!fullName },
      })
      
      return NextResponse.json(
        { error: 'Email, şifre, firma adı ve ad soyad gereklidir.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      console.error('[Signup] Validation error - Password too short:', {
        passwordLength: password.length,
        requiredLength: 6,
      })
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
        console.log('[Signup] ✅ Auth user created successfully via Admin API:', {
          userId: createdUser?.user?.id,
          email: createdUser?.user?.email,
          emailConfirmed: createdUser?.user?.email_confirmed_at ? true : false,
        })
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
        console.error('[Signup] ❌ Admin API failed - Auth user creation error:', {
          step: 'create_auth_user',
          status: restResponse.status,
          statusText: restResponse.statusText,
          error: createUserError,
          errorData: errorData,
          responseText: errorText,
          responseTextLength: errorText.length,
          requestUrl: `${supabaseUrl}/auth/v1/admin/users`,
          requestMethod: 'POST',
          requestHeaders: {
            hasAuthorization: true,
            hasApikey: true,
            contentType: 'application/json',
          },
          requestBody: {
            email,
            hasPassword: !!password,
            passwordLength: password.length,
            email_confirm: true,
            user_metadata: { full_name: fullName, company_name: companyName },
          },
        })
      }
    } catch (authError) {
      console.error('[Signup] ❌ Exception during admin API call - Auth user creation exception:', {
        step: 'create_auth_user',
        error: authError,
        errorType: authError instanceof Error ? authError.constructor.name : typeof authError,
        message: authError instanceof Error ? authError.message : 'Unknown error',
        stack: authError instanceof Error ? authError.stack : undefined,
        cause: authError instanceof Error && 'cause' in authError ? authError.cause : undefined,
        requestUrl: `${supabaseUrl}/auth/v1/admin/users`,
        requestMethod: 'POST',
        hasServiceRoleKey: !!serviceRoleKey,
        serviceRoleKeyLength: serviceRoleKey?.length || 0,
        hasSupabaseUrl: !!supabaseUrl,
      })
      createUserError = authError instanceof Error ? {
        message: authError.message,
        status: 500,
        name: authError.name,
      } : { message: 'Unknown error', status: 500, name: 'Error' }
    }

    if (createUserError) {
      console.error('[Signup] ❌ Create user error - Final error handling:', {
        step: 'create_auth_user',
        message: createUserError.message,
        status: createUserError.status,
        name: createUserError.name,
        fullError: createUserError,
        errorType: 'auth_user_creation_failed',
        timestamp: new Date().toISOString(),
      })

      // Handle specific error cases
      if (createUserError.status === 422) {
        console.error('[Signup] ❌ User already exists (422):', {
          email,
          status: 422,
          errorMessage: createUserError.message,
        })
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
        console.error('[Signup] ❌ API key validation failed:', {
          step: 'create_auth_user',
          errorMessage,
          status: createUserError.status,
          hasServiceRoleKey: !!serviceRoleKey,
          serviceRoleKeyLength: serviceRoleKey?.length || 0,
          serviceRoleKeyPrefix: serviceRoleKey ? serviceRoleKey.substring(0, 30) : 'missing',
          errorType: 'invalid_api_key',
        })
        return NextResponse.json(
          { 
            error: 'Sunucu kimlik doğrulama hatası. Lütfen yöneticiyle iletişime geçin.',
            details: `API key hatası: ${createUserError.message}`
          },
          { status: 500 }
        )
      }

      console.error('[Signup] ❌ Generic auth error:', {
        step: 'create_auth_user',
        errorMessage: createUserError.message,
        status: createUserError.status,
      })
      return NextResponse.json(
        { error: `Kimlik doğrulama hatası: ${createUserError.message}` },
        { status: 400 }
      )
    }

    // Get user ID from Admin API response (format: { user: { id: ... } })
    const userId = createdUser?.user?.id

    if (!userId) {
      console.error('[Signup] ❌ No user ID in response:', {
        step: 'get_user_id',
        createdUser: createdUser,
        createdUserType: typeof createdUser,
        hasUser: !!createdUser?.user,
        userKeys: createdUser?.user ? Object.keys(createdUser.user) : [],
        fullResponse: JSON.stringify(createdUser, null, 2),
      })
      return NextResponse.json(
        { error: 'Kullanıcı oluşturulamadı.' },
        { status: 500 }
      )
    }

    console.log('[Signup] ✅ User ID obtained:', { userId, email })

    // 2. Create company using admin client (bypasses RLS)
    console.log('[Signup] Attempting to create company:', { companyName, userId })
    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .insert({ name: companyName })
      .select('id')
      .single()

    if (companyError || !company) {
      console.error('[Signup] ❌ Company creation error:', {
        step: 'create_company',
        error: companyError,
        errorType: companyError?.constructor?.name || typeof companyError,
        message: companyError?.message,
        code: companyError?.code,
        details: companyError?.details,
        hint: companyError?.hint,
        hasCompany: !!company,
        companyData: company,
        fullError: JSON.stringify(companyError, Object.getOwnPropertyNames(companyError || {}), 2),
        requestData: { name: companyName },
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
        console.error('[Signup] ❌ API key validation failed during company creation:', {
          step: 'create_company',
          errorCode: companyError?.code,
          errorMessage: companyError?.message,
          errorType: 'api_key_validation_failed',
          hasServiceRoleKey: !!serviceRoleKey,
          serviceRoleKeyLength: serviceRoleKey?.length || 0,
        })
        // cleanup auth user (using admin API)
        try {
          console.log('[Signup] Attempting to cleanup auth user after company creation failure...')
          const cleanupResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
            },
          })
          if (cleanupResponse.ok) {
            console.log('[Signup] ✅ Auth user cleanup successful')
          } else {
            console.error('[Signup] ❌ Auth user cleanup failed:', {
              status: cleanupResponse.status,
              statusText: cleanupResponse.statusText,
            })
          }
        } catch (cleanupError) {
          console.error('[Signup] ❌ Exception during auth user cleanup:', {
            error: cleanupError,
            message: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
            stack: cleanupError instanceof Error ? cleanupError.stack : undefined,
          })
        }
        return NextResponse.json(
          { error: 'Sunucu kimlik doğrulama hatası. Lütfen yöneticiyle iletişime geçin.' },
          { status: 500 }
        )
      }

      // cleanup auth user (using admin API)
      try {
        console.log('[Signup] Attempting to cleanup auth user after company creation error...')
        const cleanupResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
        })
        if (cleanupResponse.ok) {
          console.log('[Signup] ✅ Auth user cleanup successful')
        } else {
          console.error('[Signup] ❌ Auth user cleanup failed:', {
            status: cleanupResponse.status,
            statusText: cleanupResponse.statusText,
          })
        }
      } catch (cleanupError) {
        console.error('[Signup] ❌ Exception during auth user cleanup:', {
          error: cleanupError,
          message: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
          stack: cleanupError instanceof Error ? cleanupError.stack : undefined,
        })
      }

      return NextResponse.json(
        { error: `Firma oluşturulamadı: ${companyError?.message ?? 'bilinmeyen hata'}` },
        { status: 500 }
      )
    }

    console.log('[Signup] ✅ Company created successfully:', { companyId: company.id, companyName })

    // 3. Insert user record using admin client (bypasses RLS)
    console.log('[Signup] Attempting to insert user record:', {
      userId,
      companyId: company.id,
      email,
      fullName,
      role: 'user',
    })
    const { error: userInsertError } = await adminClient.from('users').insert({
      id: userId,
      company_id: company.id,
      full_name: fullName,
      email,
      role: 'user',
    })

    if (userInsertError) {
      console.error('[Signup] ❌ User insert error:', {
        step: 'insert_user',
        error: userInsertError,
        errorType: userInsertError?.constructor?.name || typeof userInsertError,
        message: userInsertError.message,
        code: userInsertError.code,
        details: userInsertError.details,
        hint: userInsertError.hint,
        fullError: JSON.stringify(userInsertError, Object.getOwnPropertyNames(userInsertError || {}), 2),
        requestData: {
          id: userId,
          company_id: company.id,
          full_name: fullName,
          email,
          role: 'user',
        },
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
        console.error('[Signup] ❌ API key validation failed during user insert:', {
          step: 'insert_user',
          errorCode: userInsertError.code,
          errorMessage: userInsertError.message,
          errorType: 'api_key_validation_failed',
          hasServiceRoleKey: !!serviceRoleKey,
          serviceRoleKeyLength: serviceRoleKey?.length || 0,
        })
        // cleanup (using admin API and admin client)
        try {
          console.log('[Signup] Attempting to cleanup auth user and company after user insert failure...')
          const cleanupUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
            },
          })
          if (cleanupUserResponse.ok) {
            console.log('[Signup] ✅ Auth user cleanup successful')
          } else {
            console.error('[Signup] ❌ Auth user cleanup failed:', {
              status: cleanupUserResponse.status,
              statusText: cleanupUserResponse.statusText,
            })
          }
          
          const { error: companyDeleteError } = await adminClient.from('companies').delete().eq('id', company.id)
          if (companyDeleteError) {
            console.error('[Signup] ❌ Company cleanup failed:', {
              error: companyDeleteError,
              message: companyDeleteError.message,
              code: companyDeleteError.code,
            })
          } else {
            console.log('[Signup] ✅ Company cleanup successful')
          }
        } catch (cleanupError) {
          console.error('[Signup] ❌ Exception during cleanup:', {
            error: cleanupError,
            message: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
            stack: cleanupError instanceof Error ? cleanupError.stack : undefined,
          })
        }
        return NextResponse.json(
          { error: 'Sunucu kimlik doğrulama hatası. Lütfen yöneticiyle iletişime geçin.' },
          { status: 500 }
        )
      }

      // cleanup (using admin API and admin client)
      try {
        console.log('[Signup] Attempting to cleanup auth user and company after user insert error...')
        const cleanupUserResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
        })
        if (cleanupUserResponse.ok) {
          console.log('[Signup] ✅ Auth user cleanup successful')
        } else {
          console.error('[Signup] ❌ Auth user cleanup failed:', {
            status: cleanupUserResponse.status,
            statusText: cleanupUserResponse.statusText,
          })
        }
        
        const { error: companyDeleteError } = await adminClient.from('companies').delete().eq('id', company.id)
        if (companyDeleteError) {
          console.error('[Signup] ❌ Company cleanup failed:', {
            error: companyDeleteError,
            message: companyDeleteError.message,
            code: companyDeleteError.code,
          })
        } else {
          console.log('[Signup] ✅ Company cleanup successful')
        }
      } catch (cleanupError) {
        console.error('[Signup] ❌ Exception during cleanup:', {
          error: cleanupError,
          message: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
          stack: cleanupError instanceof Error ? cleanupError.stack : undefined,
        })
      }

      return NextResponse.json(
        { error: `Kullanıcı kaydedilemedi: ${userInsertError.message}` },
        { status: 500 }
      )
    }

    console.log('[Signup] ✅ User record inserted successfully:', {
      userId,
      companyId: company.id,
      email,
      role: 'user',
    })

    console.log('[Signup] ✅ Signup completed successfully:', {
      userId,
      companyId: company.id,
      email,
      companyName,
      fullName,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: 'Firma kaydı ve kullanıcı oluşturuldu.',
    })
  } catch (error: unknown) {
    console.error('[Signup] ❌ Unexpected error - Top level catch:', {
      step: 'unexpected_error',
      error: error,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      cause: error instanceof Error && 'cause' in error ? error.cause : undefined,
      name: error instanceof Error ? error.name : undefined,
      timestamp: new Date().toISOString(),
      fullError: error instanceof Error 
        ? JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
        : String(error),
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
        console.error('[Signup] ❌ API key related error detected:', {
          errorMessage: error.message,
          errorType: 'api_key_error',
        })
        return NextResponse.json(
          { 
            error: 'Sunucu kimlik doğrulama hatası. Lütfen yöneticiyle iletişime geçin.',
            details: error.message
          },
          { status: 500 }
        )
      }
      
      console.error('[Signup] ❌ Generic error:', {
        errorMessage: error.message,
        errorStack: error.stack,
      })
      return NextResponse.json(
        { 
          error: `Kayıt işlemi başarısız oldu: ${error.message}`,
          details: error.stack
        },
        { status: 500 }
      )
    }
    
    console.error('[Signup] ❌ Unknown error type:', {
      errorType: typeof error,
      errorValue: String(error),
    })
    return NextResponse.json(
      { 
        error: 'Kayıt işlemi başarısız oldu. Lütfen tekrar deneyin.',
        details: 'Beklenmeyen hata oluştu'
      },
      { status: 500 }
    )
  }
}

