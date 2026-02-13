/**
 * CommsBridge.js - Twin Tower Communication System
 * Manages request queue between Server Tower (VPS @FullySailSally)
 * and Local Tower (ASUS ProArt) for cross-tower agent coordination.
 *
 * Server project manager can request local project manager to:
 * - Spin up/assign intelligent agents locally
 * - Share workload to keep server resources manageable
 * - Sync task status between towers
 *
 * Phase 1: localStorage-based message queue (same pattern as other stores)
 * Phase 2 (future): WebSocket real-time sync when Node.js is available
 */

const STORAGE_KEY = 'tsi-dashboard-comms';

const MSG_TYPES = {
    SPIN_UP_REQUEST:  'spin-up-request',    // Server asks local to spin up agents
    SPIN_UP_RESPONSE: 'spin-up-response',   // Local responds with agent status
    TASK_SYNC:        'task-sync',           // Sync task between towers
    STATUS_UPDATE:    'status-update',       // General status message
    RESOURCE_ALERT:   'resource-alert',      // Server resource warning
    AGENT_TRANSFER:   'agent-transfer',      // Transfer agent assignment between towers
};

const TOWERS = {
    SERVER: { id: 'server', name: 'Server Tower', host: 'VPS @FullySailSally', icon: '\uD83C\uDFE2' },
    LOCAL:  { id: 'local',  name: 'Local Tower',  host: 'ASUS ProArt',         icon: '\uD83D\uDDA5\uFE0F' }
};

export class CommsBridge {
    constructor() {
        this._messages = [];
        this._listeners = [];
        this._nextId = 1;
    }

    async init() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                this._messages = JSON.parse(stored);
            } catch (e) {
                this._messages = [];
            }
        }

        this._nextId = this._messages.reduce((max, m) => {
            const num = parseInt((m.id || '').replace('msg-', ''));
            return num > max ? num + 1 : max;
        }, 1);

        console.log(`[CommsBridge] Loaded ${this._messages.length} messages`);
    }

    // ---- Message Types ----
    static get TYPES() { return MSG_TYPES; }
    static get TOWERS() { return TOWERS; }

    // ---- Query ----

    getAll() { return this._messages; }

    getByProject(projectId) {
        return this._messages.filter(m => m.project === projectId)
            .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    }

    getPending() {
        return this._messages.filter(m => m.status === 'pending')
            .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    }

    getByType(type) {
        return this._messages.filter(m => m.type === type);
    }

    getConversation(projectId) {
        return this.getByProject(projectId);
    }

    // ---- Send Messages ----

    /**
     * Request local tower to spin up agents for a project task
     */
    requestSpinUp(opts) {
        return this._send({
            type: MSG_TYPES.SPIN_UP_REQUEST,
            from: opts.from || 'server',
            to: opts.to || 'local',
            project: opts.project,
            floor: opts.floor,
            subject: opts.subject || 'Spin Up Agent Request',
            body: opts.body || '',
            taskId: opts.taskId || null,
            agentType: opts.agentType || null,
            agentCount: opts.agentCount || 1,
            priority: opts.priority || 'P2',
            metadata: opts.metadata || {}
        });
    }

    /**
     * Send a general message between towers
     */
    sendMessage(opts) {
        return this._send({
            type: opts.type || MSG_TYPES.STATUS_UPDATE,
            from: opts.from || 'server',
            to: opts.to || 'local',
            project: opts.project || null,
            floor: opts.floor || null,
            subject: opts.subject || '',
            body: opts.body || '',
            taskId: opts.taskId || null,
            priority: opts.priority || 'P2',
            metadata: opts.metadata || {}
        });
    }

    /**
     * Respond to a message
     */
    respond(messageId, responseBody, status) {
        const original = this._messages.find(m => m.id === messageId);
        if (!original) return null;

        // Update original message status
        original.status = status || 'acknowledged';
        original.respondedAt = new Date().toISOString();

        // Create response message
        const response = this._send({
            type: original.type === MSG_TYPES.SPIN_UP_REQUEST
                ? MSG_TYPES.SPIN_UP_RESPONSE
                : MSG_TYPES.STATUS_UPDATE,
            from: original.to,
            to: original.from,
            project: original.project,
            floor: original.floor,
            subject: `RE: ${original.subject}`,
            body: responseBody,
            replyTo: messageId,
            taskId: original.taskId,
            priority: original.priority,
            metadata: {}
        });

        this._save();
        return response;
    }

    /**
     * Mark a message as read/acknowledged
     */
    acknowledge(messageId) {
        const msg = this._messages.find(m => m.id === messageId);
        if (!msg) return null;
        msg.status = 'acknowledged';
        msg.acknowledgedAt = new Date().toISOString();
        this._save();
        this._notify('acknowledge', msg);
        return msg;
    }

    // ---- Resource Alerts ----

    /**
     * Send a resource alert (CPU/memory/traffic)
     */
    sendResourceAlert(opts) {
        return this._send({
            type: MSG_TYPES.RESOURCE_ALERT,
            from: opts.from || 'server',
            to: opts.to || 'local',
            project: opts.project || null,
            floor: null,
            subject: opts.subject || 'Resource Alert',
            body: opts.body || '',
            priority: 'P0',
            metadata: {
                resource: opts.resource || 'cpu',
                level: opts.level || 'warning',
                value: opts.value || 0
            }
        });
    }

    // ---- Stats ----

    stats() {
        return {
            total: this._messages.length,
            pending: this._messages.filter(m => m.status === 'pending').length,
            acknowledged: this._messages.filter(m => m.status === 'acknowledged').length,
            spinUpRequests: this._messages.filter(m => m.type === MSG_TYPES.SPIN_UP_REQUEST).length,
            byProject: this._projectCounts()
        };
    }

    _projectCounts() {
        const counts = {};
        for (const m of this._messages) {
            if (m.project) counts[m.project] = (counts[m.project] || 0) + 1;
        }
        return counts;
    }

    // ---- Internal ----

    _send(data) {
        const msg = {
            id: `msg-${String(this._nextId++).padStart(4, '0')}`,
            ...data,
            status: 'pending',
            timestamp: new Date().toISOString(),
            acknowledgedAt: null,
            respondedAt: null,
            replyTo: data.replyTo || null
        };
        this._messages.push(msg);
        this._save();
        this._notify('send', msg);
        return msg;
    }

    _save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._messages));
    }

    exportJSON() {
        const data = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            messages: this._messages
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tsi-comms-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    onChange(listener) { this._listeners.push(listener); }
    _notify(action, msg) { for (const fn of this._listeners) fn(action, msg); }
}
