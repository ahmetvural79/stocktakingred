import { createClient } from '@/lib/supabase/server'
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

    if (currentUserData.role !== 'admin') {
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

    const validRoles = ['admin', 'user']
    const userRole = role && validRoles.includes(role) ? role : 'user'

    // Create auth user (requires service role key in environment)
    // Note: This uses admin API which requires SUPABASE_SERVICE_ROLE_KEY
    const createUserResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        },
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
          },
        }),
      }
    )

    if (!createUserResponse.ok) {
      const errorData = await createUserResponse.json()
      throw new Error(errorData.message || 'Kullanıcı oluşturulamadı')
    }

    const { user: newAuthUser } = await createUserResponse.json()

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
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${newAuthUser.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
          },
        }
      )
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

