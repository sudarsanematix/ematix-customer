import { io, Socket } from 'socket.io-client';

// Use the local IP address of your machine running the Node server.
// For mobile devices/emulators to connect to your computer, we use your actual network IP:
const SOCKET_URL = 'http://192.168.1.34:4000';

type PendingHandler = { event: string; callback: (data: any) => void };
type PendingEmit = { event: string; data?: any };

class SocketService {
  public socket: Socket | null = null;

  private authToken: string | null = null;
  private lastJoin: { rideId: string; role: string; userId?: string } | null = null;
  private pendingHandlers: PendingHandler[] = [];
  private pendingEmits: PendingEmit[] = [];

  /**
   * The server rejects any socket handshake that does not carry a valid JWT,
   * so the token has to be set before connecting. `AuthContext` calls this on
   * restore, login and logout.
   */
  setToken(token: string | null) {
    if (this.authToken === token) return;
    this.authToken = token;

    if (this.socket) {
      // Force a re-handshake so the server sees the new identity.
      this.socket.disconnect();
      this.socket = null;
      if (token) this.connect();
    } else if (
      token &&
      (this.pendingHandlers.length > 0 || this.pendingEmits.length > 0)
    ) {
      // A screen asked for the socket before the token was restored (child
      // effects run before AuthProvider's). Without this, the queued listeners
      // and emits would sit forever and e.g. the home radar stays empty.
      this.connect();
    }
  }

  connect() {
    if (this.socket) return;

    if (!this.authToken) {
      // Fail closed rather than opening an unauthenticated connection. Any
      // listeners/emits registered in the meantime are buffered and replayed
      // once the token arrives and the socket opens.
      console.warn('[Customer App] Socket not opened yet: no auth token available.');
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token: this.authToken },
    });

    this.socket.on('connect', () => {
      console.log('[Customer App] Connected to socket server:', this.socket?.id);
      this.flushPending();
      // Socket.io rooms do not survive reconnects: re-join the last ride room.
      if (this.lastJoin) {
        this.socket?.emit('join_ride', this.lastJoin);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Customer App] Socket connection error:', error?.message);
    });

    this.socket.on('disconnect', () => {
      console.log('[Customer App] Disconnected from socket server');
    });
  }

  private flushPending() {
    if (!this.socket) return;

    const handlers = this.pendingHandlers;
    this.pendingHandlers = [];
    handlers.forEach(({ event, callback }) => this.socket?.on(event, callback));

    const emits = this.pendingEmits;
    this.pendingEmits = [];
    emits.forEach(({ event, data }) => this.socket?.emit(event, data));
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.lastJoin = null;
    this.pendingHandlers = [];
    this.pendingEmits = [];
  }

  joinRide(rideId: string, role: string, userId?: string) {
    if (!rideId) return;
    this.lastJoin = { rideId, role, userId };
    this.emit('join_ride', this.lastJoin);
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.socket) this.connect();
    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      this.pendingHandlers.push({ event, callback });
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (callback) {
      this.socket?.off(event, callback);
      this.pendingHandlers = this.pendingHandlers.filter(
        (handler) => !(handler.event === event && handler.callback === callback)
      );
    } else {
      this.socket?.off(event);
      this.pendingHandlers = this.pendingHandlers.filter((handler) => handler.event !== event);
    }
  }

  emit(event: string, data?: any) {
    if (!this.socket) this.connect();
    if (this.socket) {
      this.socket.emit(event, data);
    } else {
      this.pendingEmits.push({ event, data });
    }
  }
}

export const socketService = new SocketService();
