-- Suggested kilocalories were removed from the product: the app records what a
-- scale reports and does not carry a daily calorie figure.
--
-- The column is nullable and nothing else referenced it, so dropping it leaves
-- every existing measurement valid: each one still has its date, its height and
-- at least one remaining value. The init migration is left untouched.
ALTER TABLE "Measurement" DROP COLUMN "suggestedKcal";
