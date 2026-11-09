import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { env } from "@/env";
import { FirebaseProvider } from "@/lib/firebase/client";
import { I18nProvider } from "@/lib/i18n/context";
import { resolveLanguage } from "@/lib/i18n/server";
import { THEME_BOOT_SCRIPT } from "@/lib/theme/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Health Tracker",
  description: "Personal body measurement tracking.",
};

export const viewport: Viewport = {
  // The bottom navigation and the action button sit against the home
  // indicator on a phone; the safe-area insets only exist with this.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#1d2024" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Resolved once here and handed down; client components read it from the
  // provider rather than re-deriving it.
  const language = await resolveLanguage();

  return (
    <html
      lang={language}
      // The boot script below sets `class="dark"` before React hydrates, so
      // the class on this element legitimately differs from the server's.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground min-h-full">
        {/* First thing in the document: the theme is applied before the page
            is painted, so a dark-theme reader never sees a white flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <I18nProvider language={language}>
          {/* Read per request, not baked into the build: one image serves
              any Firebase project. Public values only. */}
          <FirebaseProvider config={env.FIREBASE_WEB_CONFIG}>
            {children}
          </FirebaseProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
