/*
  Warnings:

  - You are about to drop the column `deleteAt` on the `Deployment` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Deployment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "imageName" TEXT,
    "containerId" TEXT,
    "port" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "deletedAt" DATETIME,
    CONSTRAINT "Deployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Deployment" ("containerId", "createdAt", "finishedAt", "id", "imageName", "port", "projectId", "status") SELECT "containerId", "createdAt", "finishedAt", "id", "imageName", "port", "projectId", "status" FROM "Deployment";
DROP TABLE "Deployment";
ALTER TABLE "new_Deployment" RENAME TO "Deployment";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
