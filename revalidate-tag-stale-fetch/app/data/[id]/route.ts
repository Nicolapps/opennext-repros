export const dynamic = "force-dynamic";

// The repro, part 1: a cached `fetch` with a tag, and without `next.revalidate`.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // REPRO_TARGET is set by scripts/repro.mjs: "next-start", "opennext" or "opennext-fixed"
  const res = await fetch(`http://localhost:3002/data?key=${process.env.REPRO_TARGET}:${id}`, {
    cache: "force-cache",
    next: { tags: [`data-${id}`] },
  });
  return new Response(await res.text());
}
