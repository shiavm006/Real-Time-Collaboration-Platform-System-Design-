type Handler = (data: any) => void;

export class CollabWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, Handler[]> = new Map();

  constructor(docId: string, token: string) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL 
      ? process.env.NEXT_PUBLIC_API_URL.replace('http', 'ws') 
      : 'ws://localhost:8000';
    this.url = `${baseUrl}/ws/${docId}?token=${token}`;
  }

  connect() {
    if (this.ws) return;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Connected to CollabDoc WebSocket');
      this.emit('connect', null);
    };

    this.ws.onmessage = (event) => {
       try {
           const data = JSON.parse(event.data);
           this.emit('message', data);
       } catch(e) {
           console.error("Failed to parse websocket message", e);
       }
    };

    this.ws.onclose = () => {
       console.log('Disconnected from CollabDoc WebSocket');
       this.emit('disconnect', null);
       this.ws = null;
    };
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)?.push(handler);
  }

  private emit(event: string, data: any) {
    this.handlers.get(event)?.forEach(fn => fn(data));
  }
}
