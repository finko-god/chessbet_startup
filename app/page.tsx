'use client'
import { Lobby } from '@/components/Lobby';

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Chess Betting Platform</h1>
      <Lobby />
    </main>
  );
}
