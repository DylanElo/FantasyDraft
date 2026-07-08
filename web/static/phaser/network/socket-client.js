export class SocketClient {
    constructor() {
      this.socket = window.io ? window.io() : null;
      this.offlineHandlers = {};
    }

    on(eventName, handler) {
      if (this.socket) this.socket.on(eventName, handler);
      this.offlineHandlers[eventName] = handler;
    }

    emit(eventName, payload) {
      if (this.socket) this.socket.emit(eventName, payload || {});
    }
  }
