import { NextResponse } from 'next/server'

interface SignupRequestBody {
  email: string
  password: string
  companyName: string
  fullName: string
  role?: string // Optional: defaults to 'admin' for signup
}

export async function POST(request: Request) {
  try {
    // Parse request body with error handling
    let body: Partial<SignupRequestBody>
    try {
      body = (await request.json()) as Partial<SignupRequestBody>
    } catch (parseError) {
      console.error('[Signup] ❌ JSON parse error:', {
        error: parseError,
        message: parseError instanceof Error ? parseError.message : 'Unknown error',
      })
      return NextResponse.json(
        { error: 'Geçersiz istek formatı. Lütfen tekrar deneyin.' },
        { status: 400 }
      )
    }

    const email = body.email?.trim().toLowerCase() || ''
    const password = body.password || ''
    const companyName = body.companyName?.trim() || ''
    const fullName = body.fullName?.trim() || ''
    // Role: Accept from body but default to 'admin' for signup (first user is always admin)
    const role = body.role && ['admin', 'user'].includes(body.role) ? body.role : 'admin'

    console.log('[Signup] Request received:', {
      hasEmail: !!email,
      hasPassword: !!password,
      hasCompanyName: !!companyName,
      hasFullName: !!fullName,
      emailLength: email.length,
      passwordLength: password.length,
      companyNameLength: companyName.length,
      fullNameLength: fullName.length,
      role: role,
      rawBody: JSON.stringify(body).substring(0, 200), // Log first 200 chars of body
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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

    // REST API headers for all Supabase operations
    const restApiHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Prefer': 'return=representation', // Return inserted data
    }

    console.log('[Signup] REST API headers prepared:', {
      hasAuthorization: !!restApiHeaders['Authorization'],
      hasApikey: !!restApiHeaders['apikey'],
      authorizationLength: restApiHeaders['Authorization']?.length || 0,
      apikeyLength: restApiHeaders['apikey']?.length || 0,
      authorizationPrefix: restApiHeaders['Authorization']?.substring(0, 30) || 'missing',
      apikeyPrefix: restApiHeaders['apikey']?.substring(0, 30) || 'missing',
    })

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

    // 2. Create company using REST API (bypasses RLS)
    console.log('[Signup] Attempting to create company via REST API:', { 
      companyName, 
      userId,
      requestUrl: `${supabaseUrl}/rest/v1/companies`,
      headers: {
        hasAuthorization: !!restApiHeaders['Authorization'],
        hasApikey: !!restApiHeaders['apikey'],
        hasContentType: !!restApiHeaders['Content-Type'],
        hasPrefer: !!restApiHeaders['Prefer'],
      },
    })
    
    let company, companyError
    try {
      const companyResponse = await fetch(`${supabaseUrl}/rest/v1/companies`, {
        method: 'POST',
        headers: restApiHeaders,
        body: JSON.stringify({ name: companyName }),
      })

      console.log('[Signup] Company REST API response:', {
        status: companyResponse.status,
        statusText: companyResponse.statusText,
        ok: companyResponse.ok,
        headers: Object.fromEntries(companyResponse.headers.entries()),
      })

      if (companyResponse.ok) {
        const companyData = await companyResponse.json()
        console.log('[Signup] Company REST API response data:', {
          dataType: typeof companyData,
          isArray: Array.isArray(companyData),
          dataLength: Array.isArray(companyData) ? companyData.length : 'N/A',
          rawData: JSON.stringify(companyData).substring(0, 200),
        })
        // REST API returns array when using Prefer: return=representation
        company = Array.isArray(companyData) ? companyData[0] : companyData
        companyError = null
        console.log('[Signup] ✅ Company created successfully via REST API:', { 
          companyId: company?.id, 
          companyName,
          fullCompanyData: company,
        })
      } else {
        const errorText = await companyResponse.text()
        console.error('[Signup] Company REST API error response:', {
          status: companyResponse.status,
          statusText: companyResponse.statusText,
          errorText: errorText.substring(0, 500),
          errorTextLength: errorText.length,
        })
        let errorData
        try {
          errorData = JSON.parse(errorText)
          console.error('[Signup] Parsed error data:', errorData)
        } catch (parseError) {
          console.error('[Signup] Failed to parse error JSON:', parseError)
          errorData = { message: errorText || 'Unknown error' }
        }
        companyError = {
          message: errorData.message || errorData.error_description || errorData.error || `HTTP ${companyResponse.status}`,
          status: companyResponse.status,
          code: errorData.code,
          details: errorData.details,
          hint: errorData.hint,
        }
        console.error('[Signup] ❌ Company creation error via REST API:', {
          step: 'create_company',
          status: companyResponse.status,
          statusText: companyResponse.statusText,
          error: companyError,
          errorData: errorData,
          responseText: errorText,
          responseTextLength: errorText.length,
          requestUrl: `${supabaseUrl}/rest/v1/companies`,
          requestMethod: 'POST',
          requestHeaders: restApiHeaders,
          requestData: { name: companyName },
        })
      }
    } catch (companyFetchError) {
      console.error('[Signup] ❌ Exception during company creation via REST API:', {
        step: 'create_company',
        error: companyFetchError,
        errorType: companyFetchError instanceof Error ? companyFetchError.constructor.name : typeof companyFetchError,
        message: companyFetchError instanceof Error ? companyFetchError.message : 'Unknown error',
        stack: companyFetchError instanceof Error ? companyFetchError.stack : undefined,
      })
      companyError = {
        message: companyFetchError instanceof Error ? companyFetchError.message : 'Unknown error',
        status: 500,
      }
    }

    if (companyError || !company) {
      // Handle invalid API key errors in company creation
      const errorMessage = companyError?.message?.toLowerCase() || ''
      if (
        errorMessage.includes('invalid api key') ||
        errorMessage.includes('invalid key') ||
        errorMessage.includes('api key') ||
        companyError?.code === 'PGRST301' ||
        companyError?.code === '42501' ||
        companyError?.status === 401 ||
        companyError?.status === 403
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

    // 3. Insert user record using REST API (bypasses RLS)
    console.log('[Signup] Attempting to insert user record via REST API:', {
      userId,
      companyId: company.id,
      email,
      fullName,
      role: role,
    })
    
    let userInsertError
    try {
      const userInsertResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
        method: 'POST',
        headers: restApiHeaders,
        body: JSON.stringify({
          id: userId,
          company_id: company.id,
          full_name: fullName,
          email,
          role: role,
        }),
      })

      console.log('[Signup] User insert REST API response:', {
        status: userInsertResponse.status,
        statusText: userInsertResponse.statusText,
        ok: userInsertResponse.ok,
        headers: Object.fromEntries(userInsertResponse.headers.entries()),
      })

      if (userInsertResponse.ok) {
        const userInsertData = await userInsertResponse.json()
        console.log('[Signup] User insert REST API response data:', {
          dataType: typeof userInsertData,
          isArray: Array.isArray(userInsertData),
          dataLength: Array.isArray(userInsertData) ? userInsertData.length : 'N/A',
          rawData: JSON.stringify(userInsertData).substring(0, 200),
        })
        userInsertError = null
        console.log('[Signup] ✅ User record inserted successfully via REST API:', {
          userId,
          companyId: company.id,
          email,
          role: role,
          insertedData: userInsertData,
        })
      } else {
        const errorText = await userInsertResponse.text()
        console.error('[Signup] User insert REST API error response:', {
          status: userInsertResponse.status,
          statusText: userInsertResponse.statusText,
          errorText: errorText.substring(0, 500),
          errorTextLength: errorText.length,
        })
        let errorData
        try {
          errorData = JSON.parse(errorText)
          console.error('[Signup] Parsed error data:', errorData)
        } catch (parseError) {
          console.error('[Signup] Failed to parse error JSON:', parseError)
          errorData = { message: errorText || 'Unknown error' }
        }
        userInsertError = {
          message: errorData.message || errorData.error_description || errorData.error || `HTTP ${userInsertResponse.status}`,
          status: userInsertResponse.status,
          code: errorData.code,
          details: errorData.details,
          hint: errorData.hint,
        }
        console.error('[Signup] ❌ User insert error via REST API:', {
          step: 'insert_user',
          status: userInsertResponse.status,
          statusText: userInsertResponse.statusText,
          error: userInsertError,
          errorData: errorData,
          responseText: errorText,
          responseTextLength: errorText.length,
          requestUrl: `${supabaseUrl}/rest/v1/users`,
          requestMethod: 'POST',
          requestHeaders: restApiHeaders,
          requestData: {
            id: userId,
            company_id: company.id,
            full_name: fullName,
            email,
            role: role,
          },
        })
      }
    } catch (userInsertFetchError) {
      console.error('[Signup] ❌ Exception during user insert via REST API:', {
        step: 'insert_user',
        error: userInsertFetchError,
        errorType: userInsertFetchError instanceof Error ? userInsertFetchError.constructor.name : typeof userInsertFetchError,
        message: userInsertFetchError instanceof Error ? userInsertFetchError.message : 'Unknown error',
        stack: userInsertFetchError instanceof Error ? userInsertFetchError.stack : undefined,
      })
      userInsertError = {
        message: userInsertFetchError instanceof Error ? userInsertFetchError.message : 'Unknown error',
        status: 500,
      }
    }

    if (userInsertError) {
      // Handle invalid API key errors in user insert
      const errorMessage = userInsertError.message?.toLowerCase() || ''
      if (
        errorMessage.includes('invalid api key') ||
        errorMessage.includes('invalid key') ||
        errorMessage.includes('api key') ||
        userInsertError.code === 'PGRST301' ||
        userInsertError.code === '42501' ||
        userInsertError.status === 401 ||
        userInsertError.status === 403
      ) {
        console.error('[Signup] ❌ API key validation failed during user insert:', {
          step: 'insert_user',
          errorCode: userInsertError.code,
          errorMessage: userInsertError.message,
          errorType: 'api_key_validation_failed',
          hasServiceRoleKey: !!serviceRoleKey,
          serviceRoleKeyLength: serviceRoleKey?.length || 0,
        })
        // cleanup (using admin API and REST API)
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
          
          // Delete company via REST API
          const companyDeleteResponse = await fetch(`${supabaseUrl}/rest/v1/companies?id=eq.${company.id}`, {
            method: 'DELETE',
            headers: restApiHeaders,
          })
          if (companyDeleteResponse.ok) {
            console.log('[Signup] ✅ Company cleanup successful')
          } else {
            console.error('[Signup] ❌ Company cleanup failed:', {
              status: companyDeleteResponse.status,
              statusText: companyDeleteResponse.statusText,
            })
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

      // cleanup (using admin API and REST API)
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
        
        // Delete company via REST API
        const companyDeleteResponse = await fetch(`${supabaseUrl}/rest/v1/companies?id=eq.${company.id}`, {
          method: 'DELETE',
          headers: restApiHeaders,
        })
        if (companyDeleteResponse.ok) {
          console.log('[Signup] ✅ Company cleanup successful')
        } else {
          console.error('[Signup] ❌ Company cleanup failed:', {
            status: companyDeleteResponse.status,
            statusText: companyDeleteResponse.statusText,
          })
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

