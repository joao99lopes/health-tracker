import { NotFoundScreen } from "@/components/status-screen";

/** An address that matches no route at all. */
export default function RootNotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md items-center px-4 py-12">
      <div className="w-full">
        <NotFoundScreen />
      </div>
    </div>
  );
}
