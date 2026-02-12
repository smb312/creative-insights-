-- Update existing NULL values to "all"
UPDATE "AdMetric" SET "ageRange" = 'all' WHERE "ageRange" IS NULL;
UPDATE "AdMetric" SET "gender" = 'all' WHERE "gender" IS NULL;
UPDATE "AdMetric" SET "placement" = 'all' WHERE "placement" IS NULL;
UPDATE "AdMetric" SET "platform" = 'all' WHERE "platform" IS NULL;

-- AlterTable: make breakdown fields non-nullable with default "all"
ALTER TABLE "AdMetric" ALTER COLUMN "ageRange" SET DEFAULT 'all';
ALTER TABLE "AdMetric" ALTER COLUMN "ageRange" SET NOT NULL;

ALTER TABLE "AdMetric" ALTER COLUMN "gender" SET DEFAULT 'all';
ALTER TABLE "AdMetric" ALTER COLUMN "gender" SET NOT NULL;

ALTER TABLE "AdMetric" ALTER COLUMN "placement" SET DEFAULT 'all';
ALTER TABLE "AdMetric" ALTER COLUMN "placement" SET NOT NULL;

ALTER TABLE "AdMetric" ALTER COLUMN "platform" SET DEFAULT 'all';
ALTER TABLE "AdMetric" ALTER COLUMN "platform" SET NOT NULL;
