import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// Requests `path` on this same server without following redirects, and reports what came back.
async function probe(path: string) {
  const host = (await headers()).get("host");
  const res = await fetch(`http://${host}${path}`, { redirect: "manual", cache: "no-store" });
  return { path, status: res.status, location: res.headers.get("location") };
}

export default async function Page() {
  const results = await Promise.all([probe("/api/hello"), probe("/api/hello/")]);
  return (
    <main>
      <h1>trailingSlash: true and API routes</h1>
      <p>
        With <code>trailingSlash: true</code>, Next.js redirects <code>/api/hello</code> to <code>/api/hello/</code>.
      </p>
      <table cellPadding={8} style={{ borderCollapse: "collapse" }} data-testid="results">
        <thead>
          <tr><th align="left">Request</th><th align="left">Status</th><th align="left">Location</th></tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.path} style={{ borderTop: "1px solid #ccc" }}>
              <td><code>GET {r.path}</code></td><td>{r.status}</td><td>{r.location ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Expected (next start): <code>308 → /api/hello/</code>, then <code>200</code>.</p>
    </main>
  );
}
