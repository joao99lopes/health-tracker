import { AccountSection } from "@/components/profile/account-section";
import { DataSection } from "@/components/profile/data-section";
import { ProfileForm } from "@/components/profile/profile-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { getTranslations } from "@/lib/i18n/server";
import { getProfile } from "@/lib/profile/queries";
import { displayVersion } from "@/lib/version";
import { env } from "@/env";

export default async function ProfilePage() {
  // Authoritative check, and the only id the query below is scoped by.
  const user = await requireUser();
  const [profile, { t, language }] = await Promise.all([
    getProfile(user.id),
    getTranslations(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader title={t.profile.title} description={t.profile.description} />

      <ProfileForm profile={profile} fallbackLanguage={language} />

      <DataSection profileHeightCm={profile?.heightCm ?? null} />

      <AccountSection email={user.email} />

      {/* Which build is running - useful after a deploy or a rollback. */}
      <p className="text-muted-foreground text-center text-xs">
        {t.common.version(displayVersion(env.APP_VERSION) ?? t.common.versionUnknown)}
      </p>
    </div>
  );
}
