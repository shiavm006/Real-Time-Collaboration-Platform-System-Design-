export type ConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";
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
      ? process.env.NEXT_PUBLIC_API_URL.replace("http", "ws")
      : "ws://localhost:8000";
    this.url = `${baseUrl}/ws/${docId}?token=${token}`;
  }

  get state(): ConnectionState {
    return this._state;
  }

  private setState(state: ConnectionState) {
    this._state = state;
    this.stateHandlers.forEach((fn) => fn(state));
  }

  connect() {
    // Don't allocate a second socket if one is already open OR mid-handshake.
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    // If we're between attempts, cancel the pending reconnect so we don't
    // open two sockets back-to-back.
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

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
      this.emit("connect", null);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit("message", data);
      } catch (e) {
        console.error("Failed to parse websocket message", e);
      }
    };

    this.ws.onclose = (event) => {
      this.ws = null;
      this.emit("disconnect", null);

      // 1008 = policy violation (auth failure / no permission / doc missing).
      // Retrying won't help — fail fast so the UI can show an error instead
      // of spending ~3 minutes burning through 10 reconnect attempts.
      if (this.intentionalClose || event.code === 1008) {
        this.setState("disconnected");
        return;
      }

      this.setState("reconnecting");
      this.scheduleReconnect();
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
    this.handlers.get(event)?.forEach((fn) => fn(data));
  }
}
