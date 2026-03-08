-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN "coachPersona" TEXT NOT NULL DEFAULT 'balanced';
ALTER TABLE "UserProfile" ADD COLUMN "workoutDurationMin" INTEGER NOT NULL DEFAULT 60;
