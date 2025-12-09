import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * Kullanıcı ekleme endpoint'i
 * Admin kullanıcılar kendi firmalarına yeni kullanıcı ekleyebilir
 * 
 * POST /api/users/add
 * Body: { email, password, fullName, role }
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Check if current user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 })
    }

    // Check if current user is admin
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('role, company_id')
      .eq('id', user.id)
      .single()

    if (userError || !currentUserData) {
      return NextResponse.json(
        { error: 'Kullanıcı bilgisi alınamadı' },
        { status: 403 }
      )
    }

    if (currentUserData.role !== 'admin' && currentUserData.role !== 'main_admin') {
      return NextResponse.json(
        { error: 'Sadece admin kullanıcılar yeni kullanıcı ekleyebilir' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { email, password, fullName, role } = body

    // Validation
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, şifre ve ad soyad gereklidir' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Şifre en az 6 karakter olmalıdır' },
        { status: 400 }
      )
    }

    const validRoles = ['admin', 'manager', 'user']
    const userRole = role && validRoles.includes(role) ? role : 'user'

    // Create auth user using Admin Client
    let adminClient
    try {
      adminClient = createAdminClient()
    } catch (adminError: any) {
      console.error('[Add User] Admin client creation error:', adminError)
      return NextResponse.json(
        { error: 'Sunucu yapılandırma hatası: ' + adminError.message },
        { status: 500 }
      )
    }

    // Create auth user
    const { data: authData, error: createAuthError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
      },
    })

    if (createAuthError) {
      console.error('[Add User] Auth creation error:', createAuthError)
      
      // Check if user already exists
      if (createAuthError.code === 'email_exists' || createAuthError.status === 422) {
        // Check if user exists in our users table
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, email, full_name')
          .eq('email', email.toLowerCase().trim())
          .maybeSingle()
        
        if (existingUser) {
          return NextResponse.json(
            { error: 'Bu email adresi ile zaten bir kullanıcı kayıtlı' },
            { status: 409 }
          )
        } else {
          // User exists in auth but not in users table - try to get auth user and add to users table
          try {
            const { data: authUsers } = await adminClient.auth.admin.listUsers()
            const existingAuthUser = authUsers.users.find(u => u.email === email.toLowerCase().trim())
            
            if (existingAuthUser) {
              // Add to users table
              const { error: insertError } = await supabase.from('users').insert({
                id: existingAuthUser.id,
                company_id: currentUserData.company_id,
                full_name: fullName.trim(),
                email: email.toLowerCase().trim(),
                role: userRole,
              })
              
              if (insertError) {
                return NextResponse.json(
                  { error: 'Kullanıcı auth sisteminde mevcut ancak veritabanına eklenemedi' },
                  { status: 500 }
                )
              }
              
              return NextResponse.json({
                success: true,
                message: 'Kullanıcı başarıyla eklendi (mevcut auth kullanıcısı)',
                user: {
                  id: existingAuthUser.id,
                  email: email,
                  fullName: fullName,
                  role: userRole,
                },
              })
            }
          } catch (lookupError) {
            console.error('[Add User] Error looking up existing user:', lookupError)
          }
        }
      }
      
      return NextResponse.json(
        { error: createAuthError.message || 'Kullanıcı oluşturulamadı' },
        { status: 400 }
      )
    }

    if (!authData || !authData.user || !authData.user.id) {
      console.error('[Add User] Invalid auth response:', authData)
      return NextResponse.json(
        { error: 'Kullanıcı oluşturuldu ancak geçersiz yanıt alındı' },
        { status: 500 }
      )
    }

    const newAuthUser = authData.user

    // Create user record in database
    const { error: insertError } = await supabase.from('users').insert({
      id: newAuthUser.id,
      company_id: currentUserData.company_id,
      full_name: fullName.trim(),
      email: email.toLowerCase().trim(),
      role: userRole,
    })

    if (insertError) {
      // Rollback: delete auth user if database insert fails
      try {
        await adminClient.auth.admin.deleteUser(newAuthUser.id)
      } catch (deleteError) {
        console.error('[Add User] Failed to rollback auth user:', deleteError)
      }
      throw insertError
    }

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı başarıyla eklendi',
      user: {
        id: newAuthUser.id,
        email: email,
        fullName: fullName,
        role: userRole,
      },
    })
  } catch (error: any) {
    console.error('Add user error:', error)
    return NextResponse.json(
      { error: error.message || 'Kullanıcı eklenirken hata oluştu' },
      { status: 500 }
    )
  }
}

