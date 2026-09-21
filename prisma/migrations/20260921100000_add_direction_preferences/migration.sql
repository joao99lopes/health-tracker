-- Direction preferences: which way the user would like each metric to move.
--
-- This is a presentation preference, not a goal or a target. It changes how an
-- already-recorded change is coloured and nothing else, so no measurement is
-- touched here and nothing derived from it is stored.
--
-- Every column is NOT NULL with a default, so existing profiles get the
-- neutral "no preference" value without a data migration. Only the current
-- preference is kept; there is deliberately no history table.
CREATE TYPE "MetricDirection" AS ENUM ('DECREASE', 'INDIFFERENT', 'INCREASE');

ALTER TABLE "Profile"
  ADD COLUMN "weightKgDirection"         "MetricDirection" NOT NULL DEFAULT 'INDIFFERENT',
  ADD COLUMN "bodyFatPercentDirection"   "MetricDirection" NOT NULL DEFAULT 'INDIFFERENT',
  ADD COLUMN "hydrationPercentDirection" "MetricDirection" NOT NULL DEFAULT 'INDIFFERENT',
  ADD COLUMN "musclePercentDirection"    "MetricDirection" NOT NULL DEFAULT 'INDIFFERENT',
  ADD COLUMN "boneMassKgDirection"       "MetricDirection" NOT NULL DEFAULT 'INDIFFERENT',
  ADD COLUMN "visceralFatDirection"      "MetricDirection" NOT NULL DEFAULT 'INDIFFERENT',
  ADD COLUMN "bmiDirection"              "MetricDirection" NOT NULL DEFAULT 'INDIFFERENT';
