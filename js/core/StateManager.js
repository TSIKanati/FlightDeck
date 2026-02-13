/**
 * StateManager - Centralized state management for The Highrise
 */
import { eventBus } from './EventBus.js';

export class StateManager {
    constructor() {
        this._state = {
            currentView: 'exterior',      // 'exterior' | 'interior'
            currentFloor: null,            // floor index being viewed
            currentTower: 'left',          // 'left' | 'right'
            selectedAgent: null,           // agent id
            selectedDivision: null,        // division id
            cameraPosition: { x: 0, y: 10, z: 30 },
            cameraTarget: { x: 0, y: 10, z: 0 },
            agents: {},
            floors: {},
            resources: {
                local: { cpu: 0, ram: 0, gpu: 0, storage: 0 },
                server: { cpu: 0, ram: 0, bandwidth: 0, storage: 0 }
            },
            connections: [],
            alerts: []
        };
    }

    get(key) {
        return key ? this._state[key] : { ...this._state };
    }

    set(key, value) {
        const old = this._state[key];
        this._state[key] = value;
        eventBus.emit('state:changed', { key, value, old });
        eventBus.emit(`state:${key}`, { value, old });
    }

    update(key, updater) {
        const old = this._state[key];
        this._state[key] = typeof updater === 'function' ? updater(old) : { ...old, ...updater };
        eventBus.emit('state:changed', { key, value: this._state[key], old });
        eventBus.emit(`state:${key}`, { value: this._state[key], old });
    }
}

export const stateManager = new StateManager();
