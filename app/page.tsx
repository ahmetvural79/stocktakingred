import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-10 text-center border border-gray-100 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          <span className="text-red-600 dark:text-red-400">the</span>
          <span className="text-black dark:text-white">Stocktaking</span>
          <span className="text-red-600 dark:text-red-400"> Red</span>
        </h1>
        <p className="mt-3 text-base text-gray-600 dark:text-gray-300">
          Depo sayım ve yönetim sistemine hoş geldiniz.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-lg border border-red-600 dark:border-red-500 px-4 py-3 text-base font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
          >
            Firma Kaydı Oluştur
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-transparent px-4 py-3 text-base font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition"
          >
            Giriş Yap
          </Link>
        </div>
      </div>
    </main>
  )
}
