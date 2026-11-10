import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "@/lib/i18n/server";

// The page is a client component and cannot name itself; this layout only
// gives it a title in the reader's language.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t.auth.forgot.title };
}

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
