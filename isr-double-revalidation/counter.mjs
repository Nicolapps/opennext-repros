// Counts the renders of the ISR page, outside of the servers being compared.
//   GET /render?key=… → increments the counter of `key`       GET /count?key=… → returns it
import http from "node:http";

const counts = new Map();

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const key = url.searchParams.get("key");
    if (url.pathname === "/render") counts.set(key, (counts.get(key) ?? 0) + 1);
    res.end(String(counts.get(key) ?? 0));
  })
  .listen(3002, () => console.log("Counter server running on port 3002"));
