-- CreateTable
CREATE TABLE "MonthlyTarget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "revenueGoal" DOUBLE PRECISION,
    "adSpendBudget" DOUBLE PRECISION,
    "targetRoas" DOUBLE PRECISION,
    "targetCpa" DOUBLE PRECISION,
    "targetOrders" INTEGER,
    "targetNewCac" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyTarget_userId_idx" ON "MonthlyTarget"("userId");

-- CreateIndex
CREATE INDEX "MonthlyTarget_month_idx" ON "MonthlyTarget"("month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyTarget_userId_month_key" ON "MonthlyTarget"("userId", "month");

-- AddForeignKey
ALTER TABLE "MonthlyTarget" ADD CONSTRAINT "MonthlyTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
