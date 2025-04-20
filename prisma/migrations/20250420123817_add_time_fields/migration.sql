/*
  Warnings:

  - You are about to drop the column `endReason` on the `Game` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Game" DROP COLUMN "endReason",
ADD COLUMN     "currentTurn" TEXT,
ADD COLUMN     "timeIncrement" INTEGER;
