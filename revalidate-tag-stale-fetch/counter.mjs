// The data source of the cached `fetch`, outside of the servers being compared.
//   GET /data?key=… → "v1" the first time it is fetched for `key`, then "v2", "v3", …
import http from "node:http";

const versions = new Map();

http
  .createServer((req, res) => {
    const key = new URL(req.url, "http://localhost").searchParams.get("key");
    versions.set(key, (versions.get(key) ?? 0) + 1);
    res.end(`v${versions.get(key)}`);
  })
  .listen(3002, () => console.log("Data server running on port 3002"));
