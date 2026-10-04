// Counts the renders of the ISR pages, outside of the Next.js server.
//   GET /render?key=… → increments the counter of `key`       GET /count?key=… → returns it
import http from "node:http";

const port = process.env.COUNTER_PORT ?? 3002;
const counts = new Map();

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const key = url.searchParams.get("key");
    if (url.pathname === "/render") counts.set(key, (counts.get(key) ?? 0) + 1);
    res.end(String(counts.get(key) ?? 0));
  })
  .listen(port, () => console.log(`Counter server running on port ${port}`));
