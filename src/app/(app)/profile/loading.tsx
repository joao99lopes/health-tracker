import { LoadingRegion } from "@/components/loading-region";
import { FormSkeleton } from "@/components/page-skeleton";

export default function ProfileLoading() {
  return (
    <LoadingRegion>
      <FormSkeleton />
    </LoadingRegion>
  );
}
