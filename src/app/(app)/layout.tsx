import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth/session";

/**
 * Everything under this layout requires a session.
 *
 * This is the authoritative server-side check - middleware only inspects the
 * cookie's presence.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return <AppShell userEmail={user.email}>{children}</AppShell>;
}
