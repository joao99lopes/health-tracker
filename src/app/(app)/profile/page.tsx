import { ProfileForm } from "@/components/profile/profile-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { getTranslations } from "@/lib/i18n/server";
import { getProfile } from "@/lib/profile/queries";

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
    </div>
  );
}
