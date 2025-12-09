import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Kullanıcı güncelleme endpoint'i
 * Admin kullanıcılar kendi firmalarındaki kullanıcıları güncelleyebilir
 * 
 * POST /api/users/update
 * Body: { userId, email, fullName, role }
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
        { error: 'Sadece admin kullanıcılar kullanıcı güncelleyebilir' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { userId, email, fullName, role } = body

    // Validation
    if (!userId) {
      return NextResponse.json(
        { error: 'Kullanıcı ID gereklidir' },
        { status: 400 }
      )
    }

    // Check if target user exists and belongs to same company
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, company_id, email')
      .eq('id', userId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: 'Kullanıcı bulunamadı' },
        { status: 404 }
      )
    }

    // Check company match (unless main_admin)
    if (currentUserData.role !== 'main_admin' && targetUser.company_id !== currentUserData.company_id) {
      return NextResponse.json(
        { error: 'Bu kullanıcıyı güncelleyemezsiniz' },
        { status: 403 }
      )
    }

    // Build update object
    const updateData: any = {}
    if (fullName !== undefined) updateData.full_name = fullName.trim()
    if (email !== undefined) updateData.email = email.toLowerCase().trim()
    if (role !== undefined) {
      const validRoles = ['admin', 'manager', 'user']
      if (validRoles.includes(role)) {
        updateData.role = role
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Güncellenecek alan belirtilmedi' },
        { status: 400 }
      )
    }

    // Update user in database
    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)

    if (updateError) {
      throw updateError
    }

    // Update auth user email if changed
    if (email && email !== targetUser.email) {
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
          },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            user_metadata: fullName ? { full_name: fullName.trim() } : undefined,
          }),
        }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı başarıyla güncellendi',
    })
  } catch (error: any) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: error.message || 'Kullanıcı güncellenirken hata oluştu' },
      { status: 500 }
    )
  }
}


