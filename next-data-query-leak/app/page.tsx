import { compare, TARGETS } from "../compare.mjs";

export const dynamic = "force-dynamic";

export default async function Page() {
  const rows = await compare();
  return (
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>
        <code>context.query</code> of Pages Router data requests: <code>next start</code> vs OpenNext
      </h1>
      <p>
        The same app runs twice: {TARGETS.map((t) => `${t.name} on ${t.origin}`).join(", ")}. Each request below is
        sent to both.
      </p>
      <table cellPadding={8} style={{ borderCollapse: "collapse" }} data-testid="results">
        <thead>
          <tr>
            <th align="left">Request</th>
            {TARGETS.map((t) => <th align="left" key={t.name}>{t.name}</th>)}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.path} style={{ borderTop: "1px solid #ccc", background: row.differs ? "#ffe3e3" : undefined }}>
              <td><code>GET {row.path}</code></td>
              {row.answers.map((answer, i) => <td key={i}><code>{answer}</code></td>)}
              <td>{row.differs ? "≠ differs" : "same"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <code>pages/ssr.tsx</code> returns the <code>context.query</code> seen by <code>getServerSideProps</code>.
        Expected: identical answers. Actual: for data requests (<code>/_next/data/…</code>), OpenNext leaks its
        internal <code>__nextDataReq</code> flag into the query.
      </p>
    </main>
  );
}
