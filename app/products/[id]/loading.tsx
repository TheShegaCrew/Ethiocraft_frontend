import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#FAFAF9] px-6 py-12">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Skeleton className="h-[62vh] min-h-[420px] w-full rounded" />
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[0,1,2].map(i => <Skeleton key={i} className="h-24 rounded" />)}
            </div>
          </div>
          <div className="lg:col-span-5">
            <Skeleton className="h-6 w-1/3 mb-3" />
            <Skeleton className="h-10 w-3/4 mb-3" />
            <Skeleton className="h-6 w-1/4 mb-3" />
            <Skeleton className="h-3 w-full rounded mt-6" />
            <Skeleton className="h-3 w-5/6 rounded mt-2" />
          </div>
        </div>
      </div>
    </div>
  )
}