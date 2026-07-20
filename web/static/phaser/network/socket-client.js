export class SocketClient {
    constructor() {
      this.socket = window.io ? window.io() : null;
      this.offlineHandlers = {};
    }

    on(eventName, handler) {
      if (this.socket) {
        const eventSource = eventName === 'reconnect_failed' && this.socket.io
          ? this.socket.io
          : this.socket;
        eventSource.on(eventName, handler);
      }
      this.offlineHandlers[eventName] = handler;
    }

    isConnected() {
      return !!(this.socket && this.socket.connected);
    }

    emit(eventName, payload) {
      if (this.socket) this.socket.emit(eventName, payload || {});
    }
  }
