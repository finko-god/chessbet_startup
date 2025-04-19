import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import Header from "@/components/Header";
import { Analytics } from "@vercel/analytics/react"


const inter = Inter({ subsets: ["latin"] });


export const metadata: Metadata = {
  title: "ChessBet ",
  description: "ChessBet is the #1 platform to bet on real-time chess games, compete with others, and earn ChessCoins. Powered by fair play and fast payouts.",
  keywords: [
    "chess betting", "chess games", "bet on chess", "ChessCoins", "chess gambling", 
    "online chess wagers", "chess predictions", "chess esports", "play chess for money"
  ],
  icons: {
    icon: '/icon4.png',
    shortcut: '/icon4.png',
    apple: '/icon4.png',
  },
  openGraph: {
    title: "ChessBet ",
    description: "Place bets on your favorite chess matches, challenge friends, and earn ChessCoins on ChessBet — the ultimate chess betting experience.",
    url: "https://chessbet.co",
    siteName: "ChessBet",
    images: [
      {
        url: "/icon4.png",
        width: 512,
        height: 512,
        alt: "ChessBet Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChessBet",
    description: "Join ChessBet to bet on live chess games and win ChessCoins. Fast payouts. Fun competition. Chess, but with stakes.",
    images: ["/icon4.png"],
    creator: "@finkonoryy",
  },
  metadataBase: new URL("https://chessbet.co"),
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <footer className="bg-background border-t border-border">
              <div className="container mx-auto py-4">
                <p className="text-sm text-muted-foreground">
                  &copy; {new Date().getFullYear()} ChessBet. All rights reserved.
                </p>
              </div>
            </footer>
          </div>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
