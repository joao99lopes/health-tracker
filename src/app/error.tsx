"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/status-screen";

/** The fallback for anything outside the signed-in shell. */
export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-12">
      <div className="w-full">
        <ErrorScreen retry={retry} />
      </div>
    </div>
  );
}
