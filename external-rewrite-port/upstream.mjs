// The target of the external rewrites: answers every request with the URL it received.
import http from "node:http";

http
  .createServer((req, res) => res.writeHead(200, { "content-type": "text/plain" }).end(`upstream got ${req.url}`))
  .listen(3002, () => console.log("Upstream server running on port 3002"));
