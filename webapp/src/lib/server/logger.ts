// Shared loglayer instance for the webapp server.
//
// In production we emit single-line JSON via StructuredTransport so Vercel
// runtime logs are searchable by structured field. In development we use
// SimplePrettyTerminalTransport for readable colored output.
//
// Call sites grab a contextualised child via `child("<component>", { ...ids })`
// and use the standard fluent API: `.withMetadata(...)`, `.withError(e)`, then
// `.info() / .warn() / .error()`.

import { LogLayer, StructuredTransport, type LogLayerTransport } from "loglayer";
import { SimplePrettyTerminalTransport } from "@loglayer/transport-simple-pretty-terminal";

const isProd = process.env.NODE_ENV === "production";

const transport: LogLayerTransport = isProd
  ? new StructuredTransport({
      logger: console,
      messageField: "msg",
      dateField: "time",
      levelField: "level",
      dateFn: () => new Date().toISOString(),
    })
  : new SimplePrettyTerminalTransport({
      runtime: "node",
      viewMode: "inline",
    });

export const logger = new LogLayer({ transport });

export function child(component: string, extra?: Record<string, unknown>): LogLayer {
  // `withContext` mutates the receiver in place, so calling it on the shared
  // root would bleed context across every other call site. `child()` returns
  // an isolated copy whose context can be set without affecting the parent.
  return logger.child().withContext({ component, ...(extra ?? {}) });
}
