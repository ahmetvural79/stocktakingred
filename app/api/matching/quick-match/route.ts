import { createClient, getUserFromToken } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface QuickMatchRequestBody {
  count_item_id: string
  erp_item_id: string
  quantity?: number // Opsiyonel: count_item quantity'sini güncellemek için
  stock_qty?: number // Opsiyonel: ERP item'ın stok miktarını override etmek için
}

export async function POST(request: NextRequest) {
  try {
    // Authentication: Check if request has Authorization header (mobile app) or use cookies (web app)
    const authHeader = request.headers.get('Authorization')
    let user: any = null

    if (authHeader) {
      // Mobile app: Use Authorization header
      const accessToken = authHeader.replace('Bearer ', '')
      const { user: tokenUser, error: tokenError } = await getUserFromToken(accessToken)

      if (tokenError || !tokenUser) {
        console.error('[quick-match] Token validation error:', tokenError)
        return NextResponse.json(
          { error: 'Unauthorized', details: 'Invalid token' },
          { status: 401 }
        )
      }

      user = tokenUser
    } else {
      // Web app: Use server-side client with cookies
      const supabase = await createClient()
      const { data: { user: sessionUser }, error: sessionError } = await supabase.auth.getUser()

      if (sessionError || !sessionUser) {
        return NextResponse.json(
          { error: 'Unauthorized', details: 'No valid session' },
          { status: 401 }
        )
      }

      user = sessionUser
    }

    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Invalid user' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = (await request.json()) as QuickMatchRequestBody
    const { count_item_id, erp_item_id, quantity, stock_qty } = body

    // Validate required fields
    if (!count_item_id || !erp_item_id) {
      return NextResponse.json(
        { error: 'count_item_id ve erp_item_id gereklidir' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = await createClient()

    // Verify count_item exists and belongs to user's company
    const { data: countItem, error: countItemError } = await supabase
      .from('count_items')
      .select('id, quantity, count_sessions!inner(warehouse_id, warehouses!inner(company_id))')
      .eq('id', count_item_id)
      .single()

    if (countItemError || !countItem) {
      console.error('[quick-match] Count item error:', countItemError)
      return NextResponse.json(
        { error: 'Sayım ürünü bulunamadı' },
        { status: 404 }
      )
    }

    // Verify ERP item exists
    const { data: erpItem, error: erpItemError } = await supabase
      .from('erp_items')
      .select('id, stock_qty')
      .eq('id', erp_item_id)
      .single()

    if (erpItemError || !erpItem) {
      console.error('[quick-match] ERP item error:', erpItemError)
      return NextResponse.json(
        { error: 'ERP ürünü bulunamadı' },
        { status: 404 }
      )
    }

    // Use provided quantity or existing count_item quantity
    const finalQuantity = quantity ?? countItem.quantity
    // Use provided stock_qty or ERP item's stock_qty
    const finalStockQty = stock_qty ?? erpItem.stock_qty

    // Calculate difference
    const difference = finalQuantity - finalStockQty

    // Update count_item quantity if provided
    if (quantity !== undefined && quantity !== countItem.quantity) {
      const { error: updateError } = await supabase
        .from('count_items')
        .update({
          quantity: quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', count_item_id)

      if (updateError) {
        console.error('[quick-match] Error updating count item:', updateError)
        // Continue anyway, but log the error
      }
    }

    // Check if match_result already exists
    const { data: existingMatch, error: checkError } = await supabase
      .from('match_results')
      .select('id, status')
      .eq('count_item_id', count_item_id)
      .maybeSingle()

    if (checkError) {
      console.error('[quick-match] Error checking existing match:', checkError)
    }

    let matchResult
    const matchedAt = new Date().toISOString()

    if (existingMatch) {
      // Update existing match_result - direkt 'matched' status ile
      console.log('[quick-match] Updating existing match_result:', {
        matchId: existingMatch.id,
        currentStatus: existingMatch.status,
        newStatus: 'matched',
      })

      const { data: updatedMatch, error: updateMatchError } = await supabase
        .from('match_results')
        .update({
          erp_item_id: erp_item_id,
          matched_score: 1.0,
          difference: difference,
          status: 'matched', // Direkt 'matched' olarak ayarla
          matched_at: matchedAt,
        })
        .eq('id', existingMatch.id)
        .select()
        .single()

      if (updateMatchError) {
        console.error('[quick-match] Error updating match result:', {
          error: updateMatchError,
          code: updateMatchError.code,
          message: updateMatchError.message,
          details: updateMatchError.details,
        })
        return NextResponse.json(
          { 
            error: 'Eşleştirme güncellenirken hata oluştu', 
            details: updateMatchError.message,
            code: updateMatchError.code,
          },
          { status: 500 }
        )
      }

      if (!updatedMatch) {
        console.error('[quick-match] Updated match result is null')
        return NextResponse.json(
          { error: 'Eşleştirme güncellendi ancak sonuç alınamadı' },
          { status: 500 }
        )
      }

      matchResult = updatedMatch
      console.log('[quick-match] Match result updated successfully:', {
        matchId: matchResult.id,
        status: matchResult.status,
      })
    } else {
      // Create new match_result - direkt 'matched' status ile
      console.log('[quick-match] Creating new match_result with status=matched')

      const { data: newMatch, error: createMatchError } = await supabase
        .from('match_results')
        .insert({
          count_item_id: count_item_id,
          erp_item_id: erp_item_id,
          matched_score: 1.0,
          difference: difference,
          status: 'matched', // Direkt 'matched' olarak oluştur
          matched_at: matchedAt,
        })
        .select()
        .single()

      if (createMatchError) {
        console.error('[quick-match] Error creating match result:', {
          error: createMatchError,
          code: createMatchError.code,
          message: createMatchError.message,
          details: createMatchError.details,
        })
        return NextResponse.json(
          { 
            error: 'Eşleştirme oluşturulurken hata oluştu', 
            details: createMatchError.message,
            code: createMatchError.code,
          },
          { status: 500 }
        )
      }

      if (!newMatch) {
        console.error('[quick-match] Created match result is null')
        return NextResponse.json(
          { error: 'Eşleştirme oluşturuldu ancak sonuç alınamadı' },
          { status: 500 }
        )
      }

      matchResult = newMatch
      console.log('[quick-match] Match result created successfully:', {
        matchId: matchResult.id,
        status: matchResult.status,
      })
    }

    // Verify the status is actually 'matched'
    if (matchResult.status !== 'matched') {
      console.error('[quick-match] WARNING: Match result status is not "matched":', matchResult.status)
      // Try to fix it
      const { error: fixError } = await supabase
        .from('match_results')
        .update({ status: 'matched', matched_at: matchedAt })
        .eq('id', matchResult.id)
      
      if (fixError) {
        console.error('[quick-match] Failed to fix status:', fixError)
      } else {
        matchResult.status = 'matched'
        matchResult.matched_at = matchedAt
      }
    }

    // Final verification
    console.log('[quick-match] Final match result:', {
      id: matchResult.id,
      status: matchResult.status,
      count_item_id: matchResult.count_item_id,
      erp_item_id: matchResult.erp_item_id,
      matched_at: matchResult.matched_at,
    })

    return NextResponse.json({
      success: true,
      message: 'Hızlı eşleştirme başarıyla tamamlandı',
      match_result: {
        id: matchResult.id,
        count_item_id: matchResult.count_item_id,
        erp_item_id: matchResult.erp_item_id,
        status: matchResult.status,
        matched_at: matchResult.matched_at,
        matched_score: matchResult.matched_score,
        difference: matchResult.difference,
      },
    })
  } catch (error) {
    console.error('[quick-match] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Beklenmeyen bir hata oluştu',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

