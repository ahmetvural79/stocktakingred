import { NextResponse } from 'next/server'

/**
 * Environment variables diagnostic endpoint
 * Bu endpoint Netlify'da environment variable'ların doğru ayarlanıp ayarlanmadığını kontrol eder
 * 
 * ⚠️ Production'da bu endpoint'i kaldırın veya authentication ekleyin
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    const checks = {
      NEXT_PUBLIC_SUPABASE_URL: {
        exists: !!supabaseUrl,
        length: supabaseUrl?.length || 0,
        startsWithHttps: supabaseUrl?.startsWith('https://') || false,
        preview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'missing',
      },
      NEXT_PUBLIC_SUPABASE_ANON_KEY: {
        exists: !!anonKey,
        length: anonKey?.length || 0,
        startsWithEyJ: anonKey?.startsWith('eyJ') || false,
        preview: anonKey ? `${anonKey.substring(0, 20)}...` : 'missing',
      },
      SUPABASE_SERVICE_ROLE_KEY: {
        exists: !!serviceRoleKey,
        length: serviceRoleKey?.length || 0,
        startsWithEyJ: serviceRoleKey?.startsWith('eyJ') || false,
        preview: serviceRoleKey ? `${serviceRoleKey.substring(0, 20)}...` : 'missing',
      },
    }

    const allValid = 
      checks.NEXT_PUBLIC_SUPABASE_URL.exists &&
      checks.NEXT_PUBLIC_SUPABASE_ANON_KEY.exists &&
      checks.SUPABASE_SERVICE_ROLE_KEY.exists &&
      checks.NEXT_PUBLIC_SUPABASE_URL.startsWithHttps &&
      checks.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWithEyJ &&
      checks.SUPABASE_SERVICE_ROLE_KEY.startsWithEyJ

    return NextResponse.json({
      status: allValid ? 'ok' : 'error',
      message: allValid 
        ? 'Tüm environment variable\'lar doğru yapılandırılmış' 
        : 'Bazı environment variable\'lar eksik veya yanlış yapılandırılmış',
      checks,
      timestamp: new Date().toISOString(),
    }, {
      status: allValid ? 200 : 500,
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Environment check sırasında hata oluştu',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, {
      status: 500,
    })
  }
}




