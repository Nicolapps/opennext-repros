export const dynamic = "force-dynamic";

// The repro, part 1: a cached `fetch` with a tag, and without `next.revalidate`.
// The data source is `counter.mjs`, which `npm start` runs next to the server.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`http://localhost:${process.env.COUNTER_PORT ?? 3002}/data?key=${id}`, {
    cache: "force-cache",
    next: { tags: [`data-${id}`] },
  });
  return new Response(await res.text());
}
