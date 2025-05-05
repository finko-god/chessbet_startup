/*
  Warnings:

  - You are about to drop the column `currentTurn` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `timeIncrement` on the `Game` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Game" DROP COLUMN "currentTurn",
DROP COLUMN "timeIncrement";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false;
