import type { GetServerSideProps } from "next";

type Props = { query: Record<string, string | string[] | undefined> };

// The whole repro: a Pages Router page that returns the query seen by `getServerSideProps`.
export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  return { props: { query: context.query } };
};

export default function Page({ query }: Props) {
  return <pre>{JSON.stringify(query)}</pre>;
}
