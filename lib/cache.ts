// lib/cache.ts
// import { prisma } from '@/lib/prisma'

const cache = new Map<string, { value: unknown, expires: number }>()

export async function getFromCache<T>(key: string): Promise<T | null> {
  const entry = cache.get(key)
  if (entry && entry.expires > Date.now()) {
    return entry.value as T
  }
  return null
}

export async function setCache<T>(key: string, value: T, ttl: number): Promise<void> {
  cache.set(key, {
    value,
    expires: Date.now() + ttl * 1000
  })
}