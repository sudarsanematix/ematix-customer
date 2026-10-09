import { io, Socket } from 'socket.io-client';

// Use the local IP address of your machine running the Node server.
// For mobile devices/emulators to connect to your computer, we use your actual network IP:
const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.34:4000';

type PendingHandler = { event: string; callback: (data: any) => void };
type PendingEmit = { event: string; data?: any };

class SocketService {
  public socket: Socket | null = null;

  private authToken: string | null = null;
  private lastJoin: { rideId: string; role: string; userId?: string } | null = null;
  private activeHandlers: PendingHandler[] = [];
  private pendingEmits: PendingEmit[] = [];

  setToken(token: string | null) {
    if (this.authToken === token) return;
    
    const previousToken = this.authToken;
    this.authToken = token;

    if (!token || (previousToken !== null && previousToken !== token)) {
      // Explicit identity transition: discard stale commands, handlers, and ride state
      this.pendingEmits = [];
      this.activeHandlers = [];
      this.lastJoin = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (token && (this.activeHandlers.length > 0 || this.pendingEmits.length > 0)) {
      this.connect();
    }
  }

  connect() {
    if (this.socket) return;

    if (!this.authToken) {
      console.warn('[Customer App] Socket not opened yet: no auth token available.');
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token: this.authToken },
    });

    // Restore all active application listeners onto the new socket instance
    this.activeHandlers.forEach(({ event, callback }) => {
      this.socket?.on(event, callback);
    });

    this.socket.on('connect', () => {
      console.log(`[Customer App] Connected to socket server: ${this.socket?.id}`);
      this.flushEmits();
      // Only emit lastJoin if we are reconnecting after network drop or auth change
      if (this.lastJoin) {
        this.socket?.emit('join_ride', this.lastJoin);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Customer App] Socket connection error:', error?.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[Customer App] Disconnected from socket server. Reason: ${reason}`);
    });

    this.socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`[Customer App] Reconnection attempt ${attempt}`);
    });
  }

  private flushEmits() {
    if (!this.socket) return;
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
    this.activeHandlers = [];
    this.pendingEmits = [];
  }

  joinRide(rideId: string, role: string, userId?: string) {
    if (!rideId) return;
    this.lastJoin = { rideId, role, userId };
    console.log(`[Customer App] Joining room for ride: ${rideId}`);
    
    // Only emit explicitly if connected; otherwise connect() callback handles lastJoin
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_ride', this.lastJoin);
    } else {
      this.connect();
    }
  }

  on(event: string, callback: (data: any) => void) {
    console.log(`[Customer App] Adding listener for event: ${event}`);
    this.activeHandlers.push({ event, callback });
    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      this.connect();
    }
  }

  off(event: string, callback?: (data: any) => void) {
    console.log(`[Customer App] Removing listener(s) for event: ${event}`);
    if (callback) {
      this.socket?.off(event, callback);
      this.activeHandlers = this.activeHandlers.filter(
        (handler) => !(handler.event === event && handler.callback === callback)
      );
    } else {
      this.socket?.off(event);
      this.activeHandlers = this.activeHandlers.filter((handler) => handler.event !== event);
    }
  }

  emit(event: string, data?: any) {
    if (!this.socket) this.connect();
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      this.pendingEmits.push({ event, data });
    }
  }
}

export const socketService = new SocketService();
