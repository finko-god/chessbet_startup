'use client'
import { useEffect, useState } from 'react'

export default function ChessCoinBalance() {
  const [balance, setBalance] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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

    fetchBalance()
  }, [])

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <div className="flex  items-center space-x-2">
      <span className="font-bold "></span>
      <span className="text-lg">
        {balance !== null ? balance : 'Loading...'}
      </span>
    </div>
  )
} 