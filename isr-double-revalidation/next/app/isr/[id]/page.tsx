import { countRender } from "../../../lib/count-render";

// The same ISR page as `pages/pages-isr/[id].tsx` with the App Router, for comparison.
export const revalidate = 2;

export function generateStaticParams() {
  return [];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await countRender(`/isr/${(await params).id}`);
  return <p>Rendered at {new Date().toISOString()}</p>;
}
