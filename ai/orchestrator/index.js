// Minimal orchestrator service for infrastructure readiness only.

import http from "http";

const PORT = 8002;

const server = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      status: "ok",
      service: "orchestrator",
      timestamp: new Date().toISOString()
    })
  );
});

server.listen(PORT, () => {
  console.log(`Orchestrator running on port ${PORT}`);
});
