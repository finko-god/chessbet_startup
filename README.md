# ChessBet - Real-Time Chess Game with Betting

## Overview

ChessBet is a real-time chess platform that allows users to:

- Create games with bet amounts
- Join existing games as opponents
- Play chess with real-time move synchronization
- Experience full chess rules enforcement
- Automatically detect game results

## Technical Implementation

### Core Technologies

- **Next.js 15**: Full-stack React framework
- **Prisma**: Database ORM
- **Socket.io**: Real-time communication
- **chess.js**: Chess rules and game state handling
- **react-chessboard**: Chess board UI component

### Key Features

#### Real-Time Move Synchronization

- Moves are instantly sent to opponents via WebSockets
- Game state is persisted in the database
- FEN and PGN notation track the complete game state

#### Chess Rules Enforcement

- All standard chess rules enforced by chess.js
- Move validation on both client and server
- Detection of checkmate, stalemate, and draws

#### Player Assignment

- Game creator always plays as white
- Game joiner always plays as black
- Board orientation adapts to player perspective

#### Game State Management

- FEN notation for current board state
- PGN notation for complete move history

## Project Structure

### Key Components

- **/app/components/ChessBoard.tsx**: Main chess board component
- **/app/api/socket/route.ts**: Socket.io server implementation
- **/app/api/games/[id]/state/route.ts**: Game state update API
- **/app/api/games/[id]/result/route.ts**: Game result recording API
- **/app/game/[id]/page.tsx**: Game page that hosts the chess board

### Database Schema

```prisma
model Game {
  id          String   @id @default(uuid())
  player1Id   String
  player2Id   String?
  player1     User     @relation("GameCreator", fields: [player1Id], references: [id])
  player2     User?    @relation("GamePlayer", fields: [player2Id], references: [id])
  betAmount   Int      // The bet amount for the game
  status      String   // "waiting", "started", "finished"
  fen         String?  // Current board position in FEN notation
  pgn         String?  // Full game history in PGN format
  winner      String?  // ID of the winner (if game is finished)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Socket.io Implementation

The WebSocket server is responsible for:

- Broadcasting moves to opponents
- Updating game state in real-time
- Detecting and communicating game completion
- Managing game rooms by game ID

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables: Copy `.env.example` to `.env` and fill in values
4. Run database migrations: `npx prisma migrate dev`
5. Start the development server: `npm run dev`

## Future Enhancements

- Move history viewer
- Time controls
- ELO rating system
- Tournament support
- Spectator mode
