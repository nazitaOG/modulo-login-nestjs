/*
  Warnings:

  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password_changed_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `two_factor_enabled` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `two_factor_recovery_codes` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `two_factor_secret` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "password",
DROP COLUMN "password_changed_at",
DROP COLUMN "two_factor_enabled",
DROP COLUMN "two_factor_recovery_codes",
DROP COLUMN "two_factor_secret";

-- CreateTable
CREATE TABLE "user_security" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "two_factor_secret" VARCHAR(100),
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_recovery_codes" TEXT[],
    "password" VARCHAR(255),
    "password_changed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_security_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_security_user_id_key" ON "user_security"("user_id");

-- AddForeignKey
ALTER TABLE "user_security" ADD CONSTRAINT "user_security_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
