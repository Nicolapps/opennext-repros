import { compare, TARGETS } from "../compare.mjs";

export const dynamic = "force-dynamic";

export default async function Page() {
  const rows = await compare();
  return (
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>
        <code>has</code> / <code>missing</code> query conditions: <code>next start</code> vs OpenNext
      </h1>
      <p>
        The same app runs twice: {TARGETS.map((t) => `${t.name} on ${t.origin}`).join(", ")}. Each request below is
        sent to both, without following redirects.
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
        <code>/has</code> redirects to <code>/matched</code> if the <code>preview</code> query key is present,{" "}
        <code>/missing</code> if it is absent (see <code>next.config.ts</code>). Expected: identical answers. Actual:
        on OpenNext the <code>has</code> condition also matches when the key is absent, and the rule with the{" "}
        <code>missing</code> condition never applies.
      </p>
    </main>
  );
}
