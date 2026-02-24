/*
  Warnings:

  - Added the required column `userId` to the `ChatMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `MealPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `ProgressLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `UserProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `WorkoutPlan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "daysOfWeek" TEXT NOT NULL DEFAULT '[]',
    "userProfileId" INTEGER NOT NULL,
    CONSTRAINT "Activity_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FoodLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mealType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "caloriesEst" INTEGER,
    "proteinG" REAL,
    "carbsG" REAL,
    "fatG" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FoodLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ChatMessage" ("content", "createdAt", "id", "role") SELECT "content", "createdAt", "id", "role" FROM "ChatMessage";
DROP TABLE "ChatMessage";
ALTER TABLE "new_ChatMessage" RENAME TO "ChatMessage";
CREATE TABLE "new_MealPlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MealPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MealPlan" ("content", "createdAt", "id") SELECT "content", "createdAt", "id" FROM "MealPlan";
DROP TABLE "MealPlan";
ALTER TABLE "new_MealPlan" RENAME TO "MealPlan";
CREATE TABLE "new_ProgressLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg" REAL,
    "notes" TEXT,
    "workoutDone" BOOLEAN NOT NULL DEFAULT false,
    "caloriesConsumed" INTEGER,
    "proteinG" REAL,
    "carbsG" REAL,
    "fatG" REAL,
    "liftingNotes" TEXT,
    CONSTRAINT "ProgressLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProgressLog" ("date", "id", "notes", "weightKg", "workoutDone") SELECT "date", "id", "notes", "weightKg", "workoutDone" FROM "ProgressLog";
DROP TABLE "ProgressLog";
ALTER TABLE "new_ProgressLog" RENAME TO "ProgressLog";
CREATE TABLE "new_UserProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "heightCm" REAL NOT NULL,
    "weightKg" REAL NOT NULL,
    "fitnessLevel" TEXT NOT NULL,
    "primaryGoal" TEXT NOT NULL,
    "weeklyWorkoutDays" INTEGER NOT NULL,
    "availableEquipment" TEXT NOT NULL,
    "equipmentItems" TEXT NOT NULL DEFAULT '[]',
    "dietaryPreferences" TEXT NOT NULL,
    "healthNotes" TEXT,
    "weightTargetKg" REAL,
    "weeklyWeightLossKg" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserProfile" ("age", "availableEquipment", "createdAt", "dietaryPreferences", "fitnessLevel", "gender", "healthNotes", "heightCm", "id", "primaryGoal", "updatedAt", "weeklyWorkoutDays", "weightKg") SELECT "age", "availableEquipment", "createdAt", "dietaryPreferences", "fitnessLevel", "gender", "healthNotes", "heightCm", "id", "primaryGoal", "updatedAt", "weeklyWorkoutDays", "weightKg" FROM "UserProfile";
DROP TABLE "UserProfile";
ALTER TABLE "new_UserProfile" RENAME TO "UserProfile";
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");
CREATE TABLE "new_WorkoutPlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WorkoutPlan" ("content", "createdAt", "id") SELECT "content", "createdAt", "id" FROM "WorkoutPlan";
DROP TABLE "WorkoutPlan";
ALTER TABLE "new_WorkoutPlan" RENAME TO "WorkoutPlan";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
