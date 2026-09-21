import { compare, TARGETS } from "../compare.mjs";

export const dynamic = "force-dynamic";

export default async function Page() {
  const rows = await compare();
  return (
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>
        Renders per stale ISR hit: <code>next start</code> vs OpenNext
      </h1>
      <p>
        The same app runs twice: {TARGETS.map((t) => `${t.name} on ${t.origin}`).join(", ")}. Each request below is
        sent to both, then the renders of the next 3 seconds are counted.
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
              <td><code>{row.path}</code></td>
              {row.answers.map((answer, i) => <td key={i}><code>{answer}</code></td>)}
              <td>{row.differs ? "≠ differs" : "same"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <code>pages/pages-isr/[id].tsx</code> (Pages Router) and <code>app/isr/[id]/page.tsx</code> (App Router) are
        ISR pages with <code>revalidate: 2</code>, that report each of their renders to a counter. Expected: identical
        answers, a stale page is regenerated once. Actual: OpenNext regenerates the stale Pages Router page twice.
        (This page takes about 6 seconds to load: it runs the scenario on new pages each time.)
      </p>
    </main>
  );
}
