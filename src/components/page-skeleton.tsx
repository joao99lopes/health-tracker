import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The shapes pages stand in with while their data is being read.
 *
 * Each one echoes the layout that will replace it, so the page does not jump
 * when the content lands. They are decorative: the live region announcing
 * that the page is loading is on the wrapper in each `loading.tsx`.
 */

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-sm" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <PageHeaderSkeleton />

      <Card>
        <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-6 w-44" />
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-11 w-24" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} size="sm">
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent>
          <Skeleton className="h-60 w-full sm:h-72 lg:h-80" />
        </CardContent>
      </Card>
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="flex flex-col gap-4">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function FormSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeaderSkeleton />
      <Card>
        <CardContent className="flex flex-col gap-5">
          {Array.from({ length: rows }, (_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
