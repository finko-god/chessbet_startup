-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "chessCoin" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT,
    "whitePlayerId" TEXT,
    "blackPlayerId" TEXT,
    "betAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "fen" TEXT,
    "pgn" TEXT,
    "winner" TEXT,
    "player1TimeLeft" INTEGER,
    "player2TimeLeft" INTEGER,
    "lastMoveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
