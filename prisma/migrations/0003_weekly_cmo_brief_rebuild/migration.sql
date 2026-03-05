-- Drop old tables (order matters for foreign keys)
DROP TABLE IF EXISTS "AdMetric" CASCADE;
DROP TABLE IF EXISTS "Ad" CASCADE;
DROP TABLE IF EXISTS "AdCreative" CASCADE;
DROP TABLE IF EXISTS "AdSet" CASCADE;
DROP TABLE IF EXISTS "Campaign" CASCADE;
DROP TABLE IF EXISTS "SyncLog" CASCADE;
DROP TABLE IF EXISTS "AdAccount" CASCADE;
DROP TABLE IF EXISTS "Brand" CASCADE;

-- Drop old enums
DROP TYPE IF EXISTS "CreativeFormat";

-- Recreate AdAccount linked to User instead of Brand
CREATE TABLE "AdAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "metaAccountId" TEXT NOT NULL,
    "metaAccountName" TEXT,
    "encryptedAccessToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "tokenRefreshToken" TEXT,
    "status" "AdAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdAccount_metaAccountId_key" ON "AdAccount"("metaAccountId");
CREATE INDEX "AdAccount_userId_idx" ON "AdAccount"("userId");
ALTER TABLE "AdAccount" ADD CONSTRAINT "AdAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate SyncLog
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SyncLog_adAccountId_idx" ON "SyncLog"("adAccountId");
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_adAccountId_fkey" FOREIGN KEY ("adAccountId") REFERENCES "AdAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Brand Profile
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "industry" TEXT,
    "industryOther" TEXT,
    "monthlyRevenueRange" TEXT,
    "businessAge" TEXT,
    "targetCustomer" TEXT,
    "averageOrderValue" DOUBLE PRECISION,
    "acquisitionFocus" TEXT,
    "uniqueDifferentiator" TEXT,
    "monthlyAdSpendRange" TEXT,
    "activeAdPlatforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "usesCreatorContent" TEXT,
    "usesPartnershipAds" TEXT,
    "biggestChallenges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "challengesOther" TEXT,
    "competitor1" TEXT,
    "competitor2" TEXT,
    "competitor3" TEXT,
    "briefValuePreferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "additionalNotes" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" INTEGER NOT NULL DEFAULT 1,
    "briefsPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BrandProfile_userId_key" ON "BrandProfile"("userId");
ALTER TABLE "BrandProfile" ADD CONSTRAINT "BrandProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Meta Ads
CREATE TABLE "MetaAd" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adAccountId" TEXT NOT NULL,
    "metaCampaignId" TEXT,
    "campaignName" TEXT,
    "metaAdSetId" TEXT,
    "adSetName" TEXT,
    "metaAdId" TEXT NOT NULL,
    "adName" TEXT,
    "status" TEXT,
    "creativeType" TEXT,
    "creativeThumbnailUrl" TEXT,
    "primaryText" TEXT,
    "headline" TEXT,
    "callToAction" TEXT,
    "isPartnershipAd" BOOLEAN NOT NULL DEFAULT false,
    "creatorPageId" TEXT,
    "creatorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaAd_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaAd_userId_metaAdId_key" ON "MetaAd"("userId", "metaAdId");
CREATE INDEX "MetaAd_userId_idx" ON "MetaAd"("userId");
CREATE INDEX "MetaAd_isPartnershipAd_idx" ON "MetaAd"("isPartnershipAd");
ALTER TABLE "MetaAd" ADD CONSTRAINT "MetaAd_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Meta Ad Performance
CREATE TABLE "MetaAdPerformance" (
    "id" TEXT NOT NULL,
    "metaAdId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "cpc" DOUBLE PRECISION,
    "cpm" DOUBLE PRECISION,
    "ctr" DOUBLE PRECISION,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "conversionValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpa" DOUBLE PRECISION,
    "roas" DOUBLE PRECISION,
    "frequency" DOUBLE PRECISION,
    "videoViews" INTEGER,
    "video3sViews" INTEGER,
    "videoThruplay" INTEGER,
    "hookRate" DOUBLE PRECISION,
    "holdRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaAdPerformance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetaAdPerformance_metaAdId_date_key" ON "MetaAdPerformance"("metaAdId", "date");
CREATE INDEX "MetaAdPerformance_date_idx" ON "MetaAdPerformance"("date");
CREATE INDEX "MetaAdPerformance_metaAdId_idx" ON "MetaAdPerformance"("metaAdId");
ALTER TABLE "MetaAdPerformance" ADD CONSTRAINT "MetaAdPerformance_metaAdId_fkey" FOREIGN KEY ("metaAdId") REFERENCES "MetaAd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Weekly Briefs
CREATE TABLE "WeeklyBrief" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "briefDate" TIMESTAMP(3) NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "subjectLine" TEXT,
    "bottomLine" TEXT,
    "briefMarkdown" TEXT,
    "briefHtml" TEXT,
    "briefStructured" JSONB,
    "analysisData" JSONB,
    "shareToken" TEXT NOT NULL,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyBrief_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WeeklyBrief_shareToken_key" ON "WeeklyBrief"("shareToken");
CREATE INDEX "WeeklyBrief_userId_idx" ON "WeeklyBrief"("userId");
CREATE INDEX "WeeklyBrief_briefDate_idx" ON "WeeklyBrief"("briefDate");
CREATE INDEX "WeeklyBrief_shareToken_idx" ON "WeeklyBrief"("shareToken");
ALTER TABLE "WeeklyBrief" ADD CONSTRAINT "WeeklyBrief_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
