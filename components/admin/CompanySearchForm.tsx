'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'

interface CompanySearchFormProps {
  initialSearch?: string
}

export default function CompanySearchForm({ initialSearch = '' }: CompanySearchFormProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const router = useRouter()

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const query = searchQuery.trim()
    
    if (query) {
      router.push(`/dashboard/admin/companies?search=${encodeURIComponent(query)}`)
    } else {
      router.push('/dashboard/admin/companies')
    }
  }

  const handleClear = () => {
    setSearchQuery('')
    router.push('/dashboard/admin/companies')
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-5 w-5" />
        <input
          type="text"
          placeholder="Firma adı ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-red-500 dark:focus:border-red-400"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </form>
  )
}




