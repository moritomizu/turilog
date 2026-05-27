import { TsuriLogLogo } from "@/components/TsuriLogLogo";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-foam px-8">
      <div className="flex flex-col items-center gap-4">
        <TsuriLogLogo className="h-12 w-44 animate-pulse text-ink" />
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-teal-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-water" />
        </div>
      </div>
    </main>
  );
}
