import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";

function mockStreamEndpoint(): Plugin {
  return {
    name: "mock-stream-endpoint",
    configureServer(server) {
      server.middlewares.use("/mock-stream", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        res.setHeader("Content-Type", "application/x-ndjson");
        const lines = [
          `{ "type": "text_delta", "delta": "Sure! Let me update the product page." }\n`,
          `{ "type": "done" }\n`,
        ];
        lines.forEach((l) => res.write(l));
        res.end();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), mockStreamEndpoint()],
  server: { port: 5175 },
});
