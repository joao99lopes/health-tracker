import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  MEASUREMENT_VALUE_FIELDS,
  type MeasurementValueField,
} from "@/lib/measurements/fields";
import type { ParsedMeasurement } from "@/lib/measurements/validation";

/**
 * Measurement reads and writes.
 *
 * Every query here is scoped by `userId` - the database does not stop one
 * account from reading another's rows, so this layer must. Reads use
 * `findFirst({ where: { id, userId } })` and writes use `updateMany` /
 * `deleteMany` with the same pair, so an id belonging to someone else simply
 * matches nothing. Nothing in this module accepts an id without a user id
 * beside it.
 *
 * `heightCmAtMeasurement` is written on create and never touched again: that
 * is what keeps historical BMI stable when the profile's height changes.
 */

/** A measurement as the application uses it: plain numbers, no Decimal. */
export type Measurement = {
  id: string;
  measuredAt: Date;
  heightCmAtMeasurement: number;
  note: string | null;
} & Record<MeasurementValueField, number | null>;

type MeasurementRow = Prisma.MeasurementGetPayload<object>;

function toNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

function toMeasurement(row: MeasurementRow): Measurement {
  return {
    id: row.id,
    measuredAt: row.measuredAt,
    heightCmAtMeasurement: row.heightCmAtMeasurement.toNumber(),
    weightKg: toNumber(row.weightKg),
    bodyFatPercent: toNumber(row.bodyFatPercent),
    hydrationPercent: toNumber(row.hydrationPercent),
    musclePercent: toNumber(row.musclePercent),
    boneMassKg: toNumber(row.boneMassKg),
    visceralFat: row.visceralFat,
    abdominalCircumferenceCm: toNumber(row.abdominalCircumferenceCm),
    note: row.note,
  };
}

/**
 * The primary key is `@db.Uuid`, so Postgres rejects anything else with an
 * error rather than an empty result. An id from a URL is checked here so a
 * mistyped one reads as "not found".
 */
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID.test(value);
}

/** Only the columns the write path sets; height is deliberately not among them. */
function valueData(
  values: Record<MeasurementValueField, number | null>,
): Record<MeasurementValueField, number | null> {
  const data = {} as Record<MeasurementValueField, number | null>;
  for (const field of MEASUREMENT_VALUE_FIELDS) {
    data[field] = values[field];
  }
  return data;
}

/** Every measurement of one user, most recent first. */
export async function listMeasurements(
  userId: string,
): Promise<Measurement[]> {
  const rows = await prisma.measurement.findMany({
    where: { userId },
    orderBy: { measuredAt: "desc" },
  });
  return rows.map(toMeasurement);
}

/** One measurement, or null when it does not exist or is not this user's. */
export async function getMeasurement(
  userId: string,
  id: string,
): Promise<Measurement | null> {
  if (!isUuid(id)) {
    return null;
  }
  const row = await prisma.measurement.findFirst({ where: { id, userId } });
  return row ? toMeasurement(row) : null;
}

/**
 * Creates a measurement, stamping it with the height given.
 *
 * The caller reads that height from the profile: it is the user's height
 * *now*, and this row keeps its own copy for good.
 */
export async function createMeasurement(
  userId: string,
  measurement: ParsedMeasurement,
  heightCmAtMeasurement: number,
): Promise<string> {
  const row = await prisma.measurement.create({
    data: {
      userId,
      measuredAt: measurement.measuredAt,
      heightCmAtMeasurement,
      note: measurement.note,
      ...valueData(measurement.values),
    },
    select: { id: true },
  });
  return row.id;
}

/**
 * Updates the date and the values of one measurement.
 *
 * `heightCmAtMeasurement` is not in the update: editing an old measurement
 * must not rewrite the height it was taken at, or its BMI would change for a
 * reason that has nothing to do with the edit.
 *
 * Returns false when the id is not this user's, which is the same answer as
 * "does not exist".
 */
export async function updateMeasurement(
  userId: string,
  id: string,
  measurement: ParsedMeasurement,
): Promise<boolean> {
  if (!isUuid(id)) {
    return false;
  }
  const result = await prisma.measurement.updateMany({
    where: { id, userId },
    data: {
      measuredAt: measurement.measuredAt,
      note: measurement.note,
      ...valueData(measurement.values),
    },
  });
  return result.count > 0;
}

/** Deletes one measurement. False when it is not this user's. */
export async function deleteMeasurement(
  userId: string,
  id: string,
): Promise<boolean> {
  if (!isUuid(id)) {
    return false;
  }
  const result = await prisma.measurement.deleteMany({ where: { id, userId } });
  return result.count > 0;
}
