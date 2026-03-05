import { sseManager } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      sseManager.addClient(clientId, controller);

      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`event: connected\ndata: {"clientId":"${clientId}"}\n\n`)
      );

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: heartbeat\ndata: {"timestamp":"${new Date().toISOString()}"}\n\n`
            )
          );
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);
    },
    cancel() {
      sseManager.removeClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
