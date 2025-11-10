import { NextResponse } from 'next/server'

/**
 * Hızlı test kullanıcısı oluşturma
 * 
 * Bu endpoint Supabase Admin API kullanır
 * Production'da kaldırılmalı veya güvenli hale getirilmelidir
 */
export async function POST() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123456',
        email_confirm: true,
        user_metadata: {
          full_name: 'Test User',
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      // Kullanıcı zaten varsa devam et
      if (response.status === 422) {
        return NextResponse.json({
          success: true,
          message: 'Test kullanıcısı zaten mevcut',
          credentials: {
            email: 'test@example.com',
            password: 'test123456',
          },
        })
      }
      throw new Error(`Supabase API error: ${error}`)
    }

    const userData = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Test kullanıcısı oluşturuldu',
      credentials: {
        email: 'test@example.com',
        password: 'test123456',
      },
      userId: userData.id,
    })
  } catch (error: any) {
    console.error('Create test user error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Kullanıcı oluşturma hatası',
        note: 'Manuel olarak Supabase Dashboard\'dan kullanıcı oluşturabilirsiniz',
      },
      { status: 500 }
    )
  }
}

