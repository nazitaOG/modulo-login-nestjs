/*
  Warnings:

  - You are about to alter the column `password` on the `user_security` table. The data in that column could be lost. The data in that column will be cast from `VarChar(128)` to `VarChar(64)`.

*/
-- AlterTable
ALTER TABLE "user_security" ALTER COLUMN "password" SET DATA TYPE VARCHAR(64);
