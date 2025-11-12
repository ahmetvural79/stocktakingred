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
  Building2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useState, useEffect } from 'react'

interface DashboardLayoutProps {
  children: ReactNode
  userName?: string
  companyName?: string
  userRole?: string
}

export default function DashboardLayout({ children, userName, companyName, userRole }: DashboardLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed')
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true')
    }
  }, [])

  // Save sidebar state to localStorage
  const toggleSidebarCollapse = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', newState.toString())
  }

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
        className={`fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo and Toggle */}
          <div className={`relative flex items-center h-16 border-b border-gray-200 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
            {!sidebarCollapsed ? (
              <>
                <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity flex-1">
                  <h1 className="text-xl font-bold whitespace-nowrap">
                    <span className="text-red-600">the</span>
                    <span className="text-black">Stocktaking</span>
                    <span className="text-red-600">Red</span>
                  </h1>
                </Link>
                <div className="flex items-center space-x-2">
                  {/* Desktop collapse toggle */}
                  <button
                    onClick={toggleSidebarCollapse}
                    className="hidden lg:flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Sidebar'ı Küçült"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  {/* Mobile close button */}
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="/dashboard" className="flex items-center justify-center hover:opacity-80 transition-opacity w-full">
                  <span className="text-red-600 font-bold text-lg">tSR</span>
                </Link>
                {/* Desktop collapse toggle - shown when collapsed, positioned absolutely */}
                <button
                  onClick={toggleSidebarCollapse}
                  className="hidden lg:flex absolute top-2 right-2 items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Sidebar'ı Genişlet"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                {/* Mobile close button */}
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </>
            )}
          </div>

          {/* Company Info */}
          {companyName && !sidebarCollapsed && (
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-xs text-gray-500">Firma</p>
              <p className="text-sm font-medium text-gray-900 truncate">{companyName}</p>
            </div>
          )}

          {/* Navigation */}
          <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${sidebarCollapsed ? 'px-2' : 'px-2'}`}>
            {navigation.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center rounded-lg transition-colors relative ${
                    sidebarCollapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'
                  } ${
                    active
                      ? 'bg-red-50 text-red-600'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon className={`${sidebarCollapsed ? 'h-5 w-5' : 'h-5 w-5 mr-3'} ${active ? 'text-red-600' : 'text-gray-400'}`} />
                  {!sidebarCollapsed && (
                    <span className="text-sm font-medium">{item.name}</span>
                  )}
                  {/* Tooltip for collapsed state */}
                  {sidebarCollapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                      {item.name}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* User Info */}
          <div className={`border-t border-gray-200 ${sidebarCollapsed ? 'p-2' : 'p-4'}`}>
            {!sidebarCollapsed ? (
              <>
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
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-center">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center group relative">
                    <span className="text-red-600 font-medium text-sm">
                      {userName?.charAt(0).toUpperCase() || 'U'}
                    </span>
                    <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                      {userName || 'Kullanıcı'}
                    </span>
                  </div>
                </div>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="flex items-center justify-center w-full px-2 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group relative"
                    title="Çıkış Yap"
                  >
                    <LogOut className="h-5 w-5 text-gray-400" />
                    <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                      Çıkış Yap
                    </span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Top Header - Desktop & Mobile */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* Left: Mobile menu button / Desktop sidebar toggle / Logo */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <Menu className="h-6 w-6" />
              </button>
              {/* Desktop sidebar toggle */}
              <button
                onClick={toggleSidebarCollapse}
                className="hidden lg:flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title={sidebarCollapsed ? 'Sidebar\'ı Genişlet' : 'Sidebar\'ı Küçült'}
              >
                <Menu className="h-6 w-6" />
              </button>
              {/* Desktop Logo - clickable to dashboard */}
              <Link href="/dashboard" className="hidden lg:flex items-center hover:opacity-80 transition-opacity">
                <h1 className="text-xl font-bold">
                  <span className="text-red-600">the</span>
                  <span className="text-black">Stocktaking</span>
                  <span className="text-red-600">Red</span>
                </h1>
              </Link>
            </div>

            {/* Right: User info & Actions */}
            <div className="flex items-center space-x-4">
              {/* Dashboard Link */}
              <Link
                href="/dashboard"
                className="hidden md:flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
              {/* User Avatar */}
              {userName && (
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-red-600 font-medium text-sm">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {userName}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main>{children}</main>
      </div>
    </div>
  )
}

