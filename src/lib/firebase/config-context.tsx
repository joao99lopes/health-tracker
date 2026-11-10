"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { FirebaseWebConfig } from "@/env";

/**
 * The Firebase web config, handed from the root layout to whatever needs it.
 *
 * Kept apart from `./client.tsx` on purpose: the root layout wraps every
 * page in this provider, and importing it from the module that also imports
 * the Firebase Auth SDK put that SDK (about 100 KB) into the dashboard and
 * the measurement pages, which never sign anyone in. Now only the pages that
 * call `useBrowserAuth` load it.
 */

const FirebaseConfigContext = createContext<FirebaseWebConfig | null>(null);

export function FirebaseProvider({
  config,
  children,
}: {
  config: FirebaseWebConfig;
  children: ReactNode;
}) {
  return (
    <FirebaseConfigContext.Provider value={config}>
      {children}
    </FirebaseConfigContext.Provider>
  );
}

/** The config, or null outside a `FirebaseProvider`. */
export function useFirebaseConfig(): FirebaseWebConfig | null {
  return useContext(FirebaseConfigContext);
}
