'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, 
  Package, 
  FileText, 
  Shuffle, 
  Barcode, 
  Warehouse, 
  Users,
  LogOut,
  Menu,
  X,
  Building2
} from 'lucide-react'
import { useState } from 'react'

interface DashboardLayoutProps {
  children: ReactNode
  userName?: string
  companyName?: string
  userRole?: string
}

export default function DashboardLayout({ children, userName, companyName, userRole }: DashboardLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isMainAdmin = userRole === 'main_admin'

  const baseNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Sayım Listeleri', href: '/dashboard/count-sessions', icon: FileText },
    { name: 'ERP Import', href: '/dashboard/erp-import', icon: Package },
    { name: 'Eşleştirme', href: '/dashboard/matching', icon: Shuffle },
    { name: 'Barkodlama', href: '/dashboard/barcoding', icon: Barcode },
    { name: 'Depolar', href: '/dashboard/warehouses', icon: Warehouse },
    { name: 'Kullanıcılar', href: '/dashboard/users', icon: Users },
  ]

  const navigation = isMainAdmin
    ? [
        ...baseNavigation,
        { name: 'Firma Yönetimi', href: '/dashboard/admin/companies', icon: Building2 },
      ]
    : baseNavigation

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <Link href="/dashboard" className="flex items-center">
              <h1 className="text-xl font-bold">
                <span className="text-red-600">the</span>
                <span className="text-black">Stocktaking</span>
                <span className="text-red-600">Red</span>
              </h1>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Company Info */}
          {companyName && (
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-xs text-gray-500">Firma</p>
              <p className="text-sm font-medium text-gray-900 truncate">{companyName}</p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    active
                      ? 'bg-red-50 text-red-600'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={`h-5 w-5 mr-3 ${active ? 'text-red-600' : 'text-gray-400'}`} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User Info */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center mb-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 font-medium text-sm">
                    {userName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{userName || 'Kullanıcı'}</p>
                {userRole && (
                  <p className="text-xs text-gray-500 uppercase mt-0.5">
                    {userRole.replace('_', ' ')}
                  </p>
                )}
              </div>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <LogOut className="h-5 w-5 mr-3 text-gray-400" />
                Çıkış Yap
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 lg:hidden bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-bold">
              <span className="text-red-600">the</span>
              <span className="text-black">Stocktaking</span>
              <span className="text-red-600">Red</span>
            </h1>
            <div className="w-6" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Page content */}
        <main>{children}</main>
      </div>
    </div>
  )
}

