'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      router.push('/dashboard')
      router.refresh()
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-black dark:text-white">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-3xl font-bold text-center">
            <span className="text-red-600 dark:text-red-400">the</span>
            <span className="text-black dark:text-white">Stocktaking</span>
            <span className="text-red-600 dark:text-red-400"> Red</span>
          </h1>
          <p className="mt-2 text-center text-black dark:text-white">Depo Sayım Sistemi</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-black dark:text-white">
                E-posta
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-black dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-black dark:text-white">
                Şifre
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-black dark:text-white focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm text-black dark:text-white">
            Hesabınız yok mu?{' '}
            <Link href="/signup" className="font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300">
              Firma Kaydı Oluşturun
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

