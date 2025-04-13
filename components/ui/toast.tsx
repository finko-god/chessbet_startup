'use client'

import * as React from 'react'
import { Coins } from 'lucide-react'

interface ToastProps {
  message: string
  isOpen: boolean
  onClose: () => void
}

export function Toast({ message, isOpen, onClose }: ToastProps) {
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2">
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg flex items-center space-x-3">
        <Coins className="h-6 w-6" />
        <p>{message}</p>
      </div>
    </div>
  )
} 