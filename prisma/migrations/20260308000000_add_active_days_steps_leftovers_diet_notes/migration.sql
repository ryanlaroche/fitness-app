-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN "weeklyActiveDays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserProfile" ADD COLUMN "dailyStepTarget" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserProfile" ADD COLUMN "prefersLeftovers" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "UserProfile" ADD COLUMN "dietNotes" TEXT;
