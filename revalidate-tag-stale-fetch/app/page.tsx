import { compare, status, TARGETS } from "../compare.mjs";

export const dynamic = "force-dynamic";

export default async function Page() {
  const rows = await compare();
  return (
    <main style={{ fontFamily: "system-ui", padding: 24 }}>
      <h1>
        Cached <code>fetch</code> after <code>revalidateTag(tag, "max")</code>: <code>next start</code> vs OpenNext
      </h1>
      <p>
        The same app runs three times: {TARGETS.map((t) => `${t.name} on ${t.origin}`).join(", ")}. Each request below is
        sent to the three servers, in this order.
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
              {row.answers.map((answer, i) => (
                <td key={i} style={{ background: i === 2 && row.differs && row.fixed ? "#dcf5dc" : undefined }}>
                  <code>{answer}</code>
                </td>
              ))}
              <td>{status(row)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        <code>/data/[id]</code> returns the result of a cached <code>fetch</code> (tagged, without{" "}
        <code>next.revalidate</code>) to a data source that answers <code>v1</code>, then <code>v2</code>…{" "}
        <code>/revalidate/[id]</code> calls <code>revalidateTag(tag, "max")</code>. Expected: identical answers, the
        stale <code>v1</code> is served once more, then <code>v2</code>. Actual: OpenNext serves <code>v1</code> forever.
        (This page takes about 3 seconds to load: it runs the scenario on a new <code>id</code> each time.)
      </p>
      <p>
        The third column runs the same build with a proposed fix of OpenNext (see the README): it is expected to match{" "}
        <code>next start</code>.
      </p>
    </main>
  );
}
