import { Spinner } from "@/components/spinner";

// Next's file-based loading UI — automatically wraps every route segment
// under the root in a Suspense boundary, so this shows on both the
// initial page load and client-side navigations while a route's
// server-side data fetching (Firestore reads, icon resolution, etc.) is
// still in flight, rather than a blank screen.
export default function Loading() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-12">
      <Spinner />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </main>
  );
}
