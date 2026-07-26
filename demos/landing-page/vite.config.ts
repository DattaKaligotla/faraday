import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Plugin } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
          `{ "type": "text_delta", "delta": "Got it! I can help adjust the page." }\n`,
          `{ "type": "done" }\n`,
        ];
        lines.forEach((l) => res.write(l));
        res.end();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const useMock = env.USE_MOCK_SERVER === "true";

  return {
    plugins: [react(), ...(useMock ? [mockStreamEndpoint()] : [])],
    resolve: {
      alias: {
        "@faraday-stack/forge": resolve(__dirname, "../../package/src/index.ts"),
      },
    },
    server: { port: 5173 },
  };
});
