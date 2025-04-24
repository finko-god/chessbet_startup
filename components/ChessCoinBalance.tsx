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

  // Fetch balance on mount and when pathname changes
  useEffect(() => {
    fetchBalance()
  }, [pathname])

  // Poll for balance updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchBalance, 5000)
    return () => clearInterval(interval)
  }, [])

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <div className="flex items-center space-x-2">
      <Crown className="h-4 w-4 text-primary" />
      <span className="text-md">
        {balance !== null ? balance : 'Loading...'}
      </span>
    </div>
  )
} 