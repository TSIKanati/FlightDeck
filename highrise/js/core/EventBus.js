/**
 * EventBus - Global event system for The Highrise
 * Pub/sub pattern for decoupled communication between modules
 */
export class EventBus {
    constructor() {
        this._listeners = {};
        this._onceListeners = {};
    }

    on(event, callback) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(callback);
        return () => this.off(event, callback);
    }

    once(event, callback) {
        if (!this._onceListeners[event]) this._onceListeners[event] = [];
        this._onceListeners[event].push(callback);
    }

    off(event, callback) {
        if (this._listeners[event]) {
            this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this._listeners[event]) {
            this._listeners[event].forEach(cb => cb(data));
        }
        if (this._onceListeners[event]) {
            this._onceListeners[event].forEach(cb => cb(data));
            this._onceListeners[event] = [];
        }
    }
}

export const eventBus = new EventBus();
