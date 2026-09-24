-- Abdominal (waist) circumference, and direction preferences for it and for
-- the waist-to-height ratio derived from it.
--
-- The new measurement column is nullable with no default: existing
-- measurements simply did not record it, and a zero would be a reading that
-- was never taken. No existing row is otherwise touched.
--
-- The waist-to-height ratio is not stored. Like BMI it is derived from each
-- measurement's own "heightCmAtMeasurement".
ALTER TABLE "Measurement" ADD COLUMN "abdominalCircumferenceCm" DECIMAL(4,1);

ALTER TABLE "Profile"
  ADD COLUMN "abdominalCircumferenceCmDirection" "MetricDirection" NOT NULL DEFAULT 'INDIFFERENT',
  ADD COLUMN "waistToHeightRatioDirection"       "MetricDirection" NOT NULL DEFAULT 'INDIFFERENT';
