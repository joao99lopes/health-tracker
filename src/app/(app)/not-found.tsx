import { NotFoundScreen } from "@/components/status-screen";

/** Reached when a measurement id does not belong to the signed-in user. */
export default function AppNotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <NotFoundScreen />
    </div>
  );
}
