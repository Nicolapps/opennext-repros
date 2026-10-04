import type { GetStaticPaths, GetStaticProps } from "next";
import { countRender } from "../../lib/count-render";

// The repro: a Pages Router ISR page, that is regenerated in the background when it is requested after 2 seconds.
// No page is generated at build time: each `id` is rendered (and cached) on its first request.
export const getStaticPaths: GetStaticPaths = async () => ({ paths: [], fallback: "blocking" });

export const getStaticProps: GetStaticProps = async ({ params }) => {
  await countRender(`/pages-isr/${params?.id}`);
  return { props: { time: new Date().toISOString() }, revalidate: 2 };
};

export default function Page({ time }: { time: string }) {
  return <p>Rendered at {time}</p>;
}
