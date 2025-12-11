import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Kullanıcı silme endpoint'i
 * Admin kullanıcılar kendi firmalarındaki kullanıcıları silebilir
 * 
 * POST /api/users/delete
 * Body: { userId }
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
        { error: 'Sadece admin kullanıcılar kullanıcı silebilir' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { userId } = body

    // Validation
    if (!userId) {
      return NextResponse.json(
        { error: 'Kullanıcı ID gereklidir' },
        { status: 400 }
      )
    }

    // Cannot delete yourself
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'Kendi hesabınızı silemezsiniz' },
        { status: 400 }
      )
    }

    // Check if target user exists and belongs to same company
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, company_id')
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
        { error: 'Bu kullanıcıyı silemezsiniz' },
        { status: 403 }
      )
    }

    // Delete auth user first
    const deleteAuthResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        },
      }
    )

    if (!deleteAuthResponse.ok) {
      const errorData = await deleteAuthResponse.text()
      console.error('Auth delete error:', errorData)
      // Continue anyway, try to delete from database
    }

    // Delete user from database
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi',
    })
  } catch (error: any) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: error.message || 'Kullanıcı silinirken hata oluştu' },
      { status: 500 }
    )
  }
}







