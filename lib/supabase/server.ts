import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Get user from Authorization header token (for mobile app)
 * Uses Supabase REST API to verify token
 */
export async function getUserFromToken(accessToken: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    if (!supabaseUrl || !anonKey) {
      console.error('[getUserFromToken] Missing environment variables')
      return { user: null, error: new Error('Missing environment variables') }
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[getUserFromToken] Token validation failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })
      return { user: null, error: new Error(`Token validation failed: ${response.status} ${response.statusText}`) }
    }

    const user = await response.json()
    console.log('[getUserFromToken] Token validated successfully, user ID:', user.id)
    return { user, error: null }
  } catch (error) {
    console.error('[getUserFromToken] Error validating token:', error)
    return { user: null, error: error instanceof Error ? error : new Error('Unknown error') }
  }
}


