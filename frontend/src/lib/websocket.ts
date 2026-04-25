export type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected";
type Handler = (data: any) => void;
type StateHandler = (state: ConnectionState) => void;

export class CollabWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, Handler[]> = new Map();
  private stateHandlers: StateHandler[] = [];
  private _state: ConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  constructor(docId: string, token: string) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace('http', 'ws')
      : 'ws://localhost:8000';
    this.url = `${baseUrl}/ws/${docId}?token=${token}`;
  }

  get state(): ConnectionState {
    return this._state;
  }

  private setState(state: ConnectionState) {
    this._state = state;
    this.stateHandlers.forEach(fn => fn(state));
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    this.intentionalClose = false;
    this.setState("connecting");

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.setState("disconnected");
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setState("connected");
      this.emit('connect', null);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('message', data);
      } catch (e) {
        console.error("Failed to parse websocket message", e);
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.emit('disconnect', null);

      if (!this.intentionalClose) {
        this.setState("reconnecting");
        this.scheduleReconnect();
      } else {
        this.setState("disconnected");
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after this
    };
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState("disconnected");
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState("disconnected");
  }

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)?.push(handler);
  }

  onStateChange(handler: StateHandler) {
    this.stateHandlers.push(handler);
  }

  private emit(event: string, data: any) {
    this.handlers.get(event)?.forEach(fn => fn(data));
  }
}
