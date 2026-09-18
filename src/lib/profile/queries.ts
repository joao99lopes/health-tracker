import "server-only";

import { Language as DbLanguage, Sex as DbSex } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { Language } from "@/lib/i18n/languages";
import type { Sex } from "@/lib/profile/fields";
import type { ParsedProfile } from "@/lib/profile/validation";

/**
 * Profile reads and writes.
 *
 * Every query here is scoped by `userId` - the database does not stop one
 * account from reading another's rows, so this layer must.
 *
 * Saving a profile deliberately touches nothing else. Measurements keep their
 * own `heightCmAtMeasurement`, which is what keeps historical BMI stable when
 * the height below changes.
 */

/** The database enum uses upper-case codes; the interface uses BCP 47 tags. */
const LANGUAGE_TO_DB: Record<Language, DbLanguage> = {
  en: DbLanguage.EN,
  pt: DbLanguage.PT,
};

const LANGUAGE_FROM_DB: Record<DbLanguage, Language> = {
  [DbLanguage.EN]: "en",
  [DbLanguage.PT]: "pt",
};

/** A profile as the application uses it: plain values, no Decimal. */
export type Profile = {
  name: string | null;
  birthDate: string;
  sex: Sex;
  heightCm: number;
  language: Language;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const row = await prisma.profile.findUnique({ where: { userId } });
  if (!row) {
    return null;
  }
  return {
    name: row.name,
    // Stored as a plain `date`; the UTC instant Prisma returns carries no time.
    birthDate: row.birthDate.toISOString().slice(0, 10),
    sex: row.sex,
    heightCm: row.heightCm.toNumber(),
    language: LANGUAGE_FROM_DB[row.language],
  };
}

/**
 * The language to render in: the user's preference when they have a profile.
 *
 * Callers resolve the fallback themselves, which is why this returns null
 * rather than a default.
 */
export async function getProfileLanguage(
  userId: string,
): Promise<Language | null> {
  const row = await prisma.profile.findUnique({
    where: { userId },
    select: { language: true },
  });
  return row ? LANGUAGE_FROM_DB[row.language] : null;
}

/** Creates the profile on first save and updates it afterwards. */
export async function saveProfile(
  userId: string,
  profile: ParsedProfile,
): Promise<void> {
  const data = {
    name: profile.name,
    // Midnight UTC: a birthday has no time zone, and any local offset here
    // would shift the stored date by a day.
    birthDate: new Date(`${profile.birthDate}T00:00:00.000Z`),
    sex: profile.sex as DbSex,
    heightCm: profile.heightCm,
    language: LANGUAGE_TO_DB[profile.language],
  };

  await prisma.profile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}
