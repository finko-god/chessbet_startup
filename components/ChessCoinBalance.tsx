'use client'
import { useEffect, useState } from 'react'
import { Crown } from 'lucide-react'
import { usePathname } from 'next/navigation'

export default function ChessCoinBalance() {
  const [balance, setBalance] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pathname = usePathname()

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/user/balance', {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch balance')
      }
      const data = await response.json()
      setBalance(data.balance)
    } catch (err) {
      setError('Failed to load balance')
      console.error('Error fetching balance:', err)
    }
  }

  useEffect(() => {
    fetchBalance()
  }, [pathname]) // Refetch when pathname changes (user navigates)

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <div className="flex items-center space-x-2">
      <Crown className="h-5 w-5 text-primary" />
      <span className="text-lg">
        {balance !== null ? balance : 'Loading...'}
      </span>
    </div>
  )
} 