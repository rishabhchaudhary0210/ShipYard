-- CreateTable
CREATE TABLE "PortAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "port" INTEGER NOT NULL,
    "inUse" BOOLEAN NOT NULL DEFAULT false,
    "containerId" TEXT,
    "projectId" TEXT,
    CONSTRAINT "PortAllocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PortAllocation_port_key" ON "PortAllocation"("port");

-- CreateIndex
CREATE UNIQUE INDEX "PortAllocation_projectId_key" ON "PortAllocation"("projectId");
