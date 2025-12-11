import { createClient } from '@/lib/supabase/server'
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

    // Check environment variables - using anon key like login function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() // Still needed for admin operations

    console.log('[Signup] Environment check:', {
      hasAnonKey: !!anonKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceRoleKey: !!serviceRoleKey,
      anonKeyLength: anonKey?.length || 0,
      anonKeyPrefix: anonKey ? anonKey.substring(0, 20) : 'missing',
      supabaseUrlValue: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing',
    })

    if (!supabaseUrl || !anonKey) {
      console.error('[Signup] Missing environment variables:', {
        hasAnonKey: !!anonKey,
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

    // Create Supabase client with anon key (like login function)
    let supabaseClient
    try {
      supabaseClient = await createClient()
      console.log('[Signup] Supabase client created successfully with anon key')
    } catch (clientError) {
      console.error('[Signup] Failed to create supabase client:', {
        error: clientError,
        message: clientError instanceof Error ? clientError.message : 'Unknown error',
        stack: clientError instanceof Error ? clientError.stack : undefined,
      })
      return NextResponse.json(
        { 
          error: 'Sunucu yapılandırma hatası. Lütfen yöneticiyle iletişime geçin.',
          details: clientError instanceof Error ? clientError.message : 'Supabase client oluşturulamadı'
        },
        { status: 500 }
      )
    }

    // 1. Create auth user using anon key (like login function)
    console.log('[Signup] Attempting to create auth user with anon key:', { email, hasPassword: !!password })
    
    let createdUser, createUserError
    
    // Use Supabase signUp method with anon key (like login uses signInWithPassword)
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
          },
          emailRedirectTo: `${supabaseUrl}/dashboard`,
        },
      })
      
      createdUser = data
      createUserError = error
      
      // If signUp fails and we have service role key, try admin API as fallback
      if (createUserError && serviceRoleKey) {
        console.log('[Signup] Anon key signUp failed, trying admin API fallback...')
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
            createdUser = userData.user ? userData : { user: userData }
            createUserError = null
            console.log('[Signup] Admin API fallback succeeded')
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
            console.error('[Signup] Admin API fallback also failed:', {
              status: restResponse.status,
              error: createUserError,
              responseText: errorText.substring(0, 200),
            })
          }
        } catch (restError) {
          console.error('[Signup] Admin API fallback exception:', restError)
          // Keep original error from signUp method
        }
      }
    } catch (authError) {
      console.error('[Signup] Exception during signUp:', {
        error: authError,
        message: authError instanceof Error ? authError.message : 'Unknown error',
        stack: authError instanceof Error ? authError.stack : undefined,
      })
      
      // Try admin API as fallback when exception occurs (if service role key available)
      if (serviceRoleKey) {
        try {
          console.log('[Signup] Exception occurred, trying admin API fallback...')
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
            createdUser = userData.user ? userData : { user: userData }
            createUserError = null
            console.log('[Signup] Admin API fallback succeeded after exception')
          } else {
            const errorText = await restResponse.text()
            let errorData
            try {
              errorData = JSON.parse(errorText)
            } catch {
              errorData = { message: errorText || 'Unknown error' }
            }
            const authErrorMessage = authError instanceof Error ? authError.message : 'Unknown error'
            const authErrorName = authError instanceof Error ? authError.name : 'Error'
            createUserError = {
              message: errorData.message || errorData.error_description || authErrorMessage,
              status: restResponse.status,
              name: authErrorName,
            }
            console.error('[Signup] Admin API fallback failed:', {
              status: restResponse.status,
              error: createUserError,
              responseText: errorText.substring(0, 200),
            })
          }
        } catch (restError) {
          console.error('[Signup] Admin API fallback exception:', restError)
          const authErrorMessage = authError instanceof Error ? authError.message : 'Unknown error'
          const authErrorName = authError instanceof Error ? authError.name : 'Error'
          createUserError = {
            message: authErrorMessage,
            status: 500,
            name: authErrorName,
          }
        }
      } else {
        createUserError = authError instanceof Error ? {
          message: authError.message,
          status: 500,
          name: authError.name,
        } : { message: 'Unknown error', status: 500, name: 'Error' }
      }
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

    // Get user ID from signUp response (format: { user: { id: ... } } or { id: ... })
    const userId = createdUser?.user?.id || createdUser?.id

    if (!userId) {
      console.error('[Signup] No user ID in response:', { createdUser })
      return NextResponse.json(
        { error: 'Kullanıcı oluşturulamadı.' },
        { status: 500 }
      )
    }

    // 2. Create company using supabase client (with anon key)
    const { data: company, error: companyError } = await supabaseClient
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
        // cleanup auth user (using admin API if service role key available)
        if (serviceRoleKey) {
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
        }
        return NextResponse.json(
          { error: 'Sunucu kimlik doğrulama hatası. Lütfen yöneticiyle iletişime geçin.' },
          { status: 500 }
        )
      }

      // cleanup auth user (using admin API if service role key available)
      if (serviceRoleKey) {
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
      }

      return NextResponse.json(
        { error: `Firma oluşturulamadı: ${companyError?.message ?? 'bilinmeyen hata'}` },
        { status: 500 }
      )
    }

    // 3. Insert user record using supabase client (with anon key)
    const { error: userInsertError } = await supabaseClient.from('users').insert({
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
        // cleanup (using admin API if service role key available)
        if (serviceRoleKey) {
          try {
            await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
              },
            })
            await supabaseClient.from('companies').delete().eq('id', company.id)
          } catch (cleanupError) {
            console.error('[Signup] Failed to cleanup:', cleanupError)
          }
        }
        return NextResponse.json(
          { error: 'Sunucu kimlik doğrulama hatası. Lütfen yöneticiyle iletişime geçin.' },
          { status: 500 }
        )
      }

      // cleanup (using admin API if service role key available)
      if (serviceRoleKey) {
        try {
          await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
            },
          })
          await supabaseClient.from('companies').delete().eq('id', company.id)
        } catch (cleanupError) {
          console.error('[Signup] Failed to cleanup:', cleanupError)
        }
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

