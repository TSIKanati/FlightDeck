/**
 * Router.js - Hash-based view routing for TSI Dashboard
 * Routes: #enterprise, #floor=ID, #agent=ID, #audit, #assets=ID,
 *         #comms, #knowledge, #knowledge=projectId
 */

export class Router {
    constructor() {
        this._currentRoute = null;
        this._onNavigate = null;
        window.addEventListener('hashchange', () => this._resolve());
    }

    /** Register a callback for navigation events */
    onNavigate(cb) {
        this._onNavigate = cb;
    }

    /** Navigate to a hash route */
    navigate(hash) {
        window.location.hash = hash;
    }

    /** Parse the current hash into { view, params } */
    parse() {
        const raw = window.location.hash.replace(/^#/, '');
        if (!raw || raw === 'enterprise') {
            return { view: 'enterprise', params: {} };
        }
        if (raw === 'audit') {
            return { view: 'audit', params: {} };
        }
        if (raw === 'comms') {
            return { view: 'comms', params: {} };
        }
        if (raw === 'knowledge') {
            return { view: 'knowledge', params: {} };
        }

        const parts = raw.split('&');
        const params = {};
        let view = 'enterprise';

        for (const part of parts) {
            const [key, val] = part.split('=');
            if (key === 'floor') {
                view = 'floor';
                params.floorId = val;
            } else if (key === 'agent') {
                view = 'agent';
                params.agentId = val;
            } else if (key === 'assets') {
                view = 'assets';
                params.projectId = val;
            } else if (key === 'comms') {
                view = 'comms';
                params.projectId = val || null;
            } else if (key === 'knowledge') {
                view = 'knowledge';
                params.projectId = val || null;
            } else {
                params[key] = val || true;
            }
        }

        return { view, params };
    }

    /** Resolve the current hash and trigger navigation */
    _resolve() {
        const route = this.parse();
        const routeKey = JSON.stringify(route);
        if (routeKey === this._currentRoute) return;
        this._currentRoute = routeKey;
        if (this._onNavigate) this._onNavigate(route);
    }

    /** Trigger initial route resolution */
    start() {
        this._currentRoute = null; // Force refresh
        this._resolve();
    }
}
