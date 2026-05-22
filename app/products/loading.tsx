import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#FAFAF9] px-6 py-12">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-6">
          <Skeleton className="h-6 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/6" />
        </div>

        <section className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 md:gap-x-9 md:gap-y-16 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="group">
              <Skeleton className="h-[240px] w-full md:h-[320px] rounded" />
              <div className="pt-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}