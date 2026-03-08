-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN "wantsWorkouts" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "UserProfile" ADD COLUMN "wantsDiet" BOOLEAN NOT NULL DEFAULT true;
