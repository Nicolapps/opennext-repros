import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";

// The repro, part 2: mark the tag as stale. With the "max" profile, the next request gets the stale data,
// and the data is refreshed in the background.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  revalidateTag(`data-${(await params).id}`, "max");
  return new Response("revalidated");
}
