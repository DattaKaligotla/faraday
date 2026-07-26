/**
 * Wrap an async iterable of JSON-serializable events as a text/event-stream
 * Response. Sends a comment-line keepalive every 15s so proxies don't close
 * the connection while the sandbox is mid-job.
 *
 * If the client disconnects, we abort iteration but the upstream sandbox
 * continues — Firestore is the durable record.
 */
export function sseResponse<T>(iter: AsyncIterable<T>, opts: { keepaliveMs?: number } = {}): Response {
  const encoder = new TextEncoder();
  const keepaliveMs = opts.keepaliveMs ?? 15_000;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(keepalive);
        }
      }, keepaliveMs);

      try {
        for await (const ev of iter) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: { type: "failed", error: msg } })}\n\n`));
        } catch {}
      } finally {
        clearInterval(keepalive);
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
