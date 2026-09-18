import Link from "next/link";
import { RulerIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTranslations } from "@/lib/i18n/server";

/**
 * The prompt shown while there is no profile.
 *
 * A measurement is stamped with the profile's height, so there is nothing to
 * record until that height exists. The same card appears on the dashboard,
 * the list and the add page; it lives here so those three cannot drift.
 */
export async function ProfileRequiredCard() {
  const { t } = await getTranslations();

  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState
          icon={RulerIcon}
          title={t.measurements.noHeightTitle}
          description={t.measurements.noHeight}
          action={
            <Button asChild>
              <Link href="/profile">{t.measurements.goToProfile}</Link>
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
