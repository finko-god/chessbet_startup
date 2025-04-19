/*
  Warnings:

  - You are about to drop the column `ableForPayouts` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "timeControl" TEXT NOT NULL DEFAULT '5+0';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "ableForPayouts";
