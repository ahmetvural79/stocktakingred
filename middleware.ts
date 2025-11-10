import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js (service worker)
     * - manifest files and other static assets
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|sw.js|workbox-.*|manifest.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|map)$).*)',
  ],
}

