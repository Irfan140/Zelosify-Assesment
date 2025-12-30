/*
  Warnings:

  - A unique constraint covering the columns `[s3Key]` on the table `hiringProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "hiringProfile_submittedAt_key";

-- AlterTable
ALTER TABLE "hiringProfile" ALTER COLUMN "recommended" SET DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "hiringProfile_s3Key_key" ON "hiringProfile"("s3Key");
