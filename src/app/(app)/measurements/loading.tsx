import { LoadingRegion } from "@/components/loading-region";
import { ListSkeleton } from "@/components/page-skeleton";

export default function MeasurementsLoading() {
  return (
    <LoadingRegion>
      <ListSkeleton />
    </LoadingRegion>
  );
}
