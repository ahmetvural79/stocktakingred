'use client'

import { useState } from 'react'
import CompanyDetailModal from './CompanyDetailModal'

interface CompanyDetailButtonProps {
  companyId: string
  companyName: string
}

export default function CompanyDetailButton({ companyId, companyName }: CompanyDetailButtonProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
      >
        Detay
      </button>
      {showModal && (
        <CompanyDetailModal
          companyId={companyId}
          companyName={companyName}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

