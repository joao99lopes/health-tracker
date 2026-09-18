"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/status-screen";

/**
 * The fallback for a failed signed-in page.
 *
 * It sits inside the app shell, so the navigation stays usable and the reader
 * is never stranded on a bare error page.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Self-hosted and single-user: the server log is the error reporting.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <ErrorScreen retry={retry} />
    </div>
  );
}
