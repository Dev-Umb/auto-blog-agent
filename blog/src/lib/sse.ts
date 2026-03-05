type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
};

class SSEManager {
  private clients: SSEClient[] = [];

  addClient(id: string, controller: ReadableStreamDefaultController) {
    this.clients.push({ id, controller });
  }

  removeClient(id: string) {
    this.clients = this.clients.filter((c) => c.id !== id);
  }

  broadcast(event: string, data: Record<string, unknown>) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(message);

    this.clients = this.clients.filter((client) => {
      try {
        client.controller.enqueue(encoded);
        return true;
      } catch {
        return false;
      }
    });
  }

  get clientCount() {
    return this.clients.length;
  }
}

export const sseManager = new SSEManager();
