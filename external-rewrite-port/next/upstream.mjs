// The target of the external rewrites: answers every request with the URL it received.
import http from "node:http";

const port = process.env.UPSTREAM_PORT ?? 3002;

http
  .createServer((req, res) => res.writeHead(200, { "content-type": "text/plain" }).end(`upstream got ${req.url}`))
  .listen(port, () => console.log(`Upstream server running on port ${port}`));
