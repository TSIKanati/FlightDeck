/**
 * KnowledgeBase - Persistent Per-Project Knowledge Store
 * TSI Enterprise 3D Command Center
 *
 * localStorage-backed persistent knowledge, scoped per project.
 * Entry types: note, decision, blocker, milestone, reference, lesson
 *
 * localStorage key scheme: hr:kb:{projectId} -> JSON array of entries
 * Budget: ~150KB total across all projects
 */
import { eventBus } from './EventBus.js';

const ENTRY_TYPES = ['note', 'decision', 'blocker', 'milestone', 'reference', 'lesson'];

export class KnowledgeBase {
    constructor() {
        this.PREFIX = 'hr:kb:';
        this.cache = new Map();
    }

    init() {
        // Scan localStorage for all KB entries and load into cache
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.PREFIX)) {
                const projectId = key.slice(this.PREFIX.length);
                this._load(projectId);
            }
        }
        console.log(`[KnowledgeBase] Initialized with ${this.cache.size} project(s)`);
    }

    /**
     * Get all KB data for a project
     * @param {string} projectId
     * @returns {{ entries: object[], lastUpdated: number }}
     */
    getProjectKB(projectId) {
        if (!this.cache.has(projectId)) {
            this._load(projectId);
        }
        const entries = this.cache.get(projectId) || [];
        const lastUpdated = entries.length > 0
            ? Math.max(...entries.map(e => e.timestamp))
            : 0;
        return { entries, lastUpdated };
    }

    /**
     * Add an entry to a project's knowledge base
     * @param {string} projectId
     * @param {object} entry - { type, content, source }
     * @returns {object} The created entry
     */
    addEntry(projectId, entry) {
        if (!this.cache.has(projectId)) {
            this._load(projectId);
        }
        const entries = this.cache.get(projectId) || [];

        const newEntry = {
            id: this._generateId(),
            type: ENTRY_TYPES.includes(entry.type) ? entry.type : 'note',
            content: entry.content || '',
            source: entry.source || 'unknown',
            timestamp: Date.now(),
            updatedAt: Date.now(),
        };

        entries.push(newEntry);
        this.cache.set(projectId, entries);
        this._save(projectId);

        eventBus.emit('kb:updated', { projectId, entry: newEntry, action: 'add' });
        return newEntry;
    }

    /**
     * Update an existing entry
     * @param {string} projectId
     * @param {string} entryId
     * @param {object} updates - partial entry fields to merge
     */
    updateEntry(projectId, entryId, updates) {
        const entries = this.cache.get(projectId);
        if (!entries) return null;

        const entry = entries.find(e => e.id === entryId);
        if (!entry) return null;

        if (updates.content !== undefined) entry.content = updates.content;
        if (updates.type && ENTRY_TYPES.includes(updates.type)) entry.type = updates.type;
        entry.updatedAt = Date.now();

        this._save(projectId);
        eventBus.emit('kb:updated', { projectId, entry, action: 'update' });
        return entry;
    }

    /**
     * Delete an entry
     * @param {string} projectId
     * @param {string} entryId
     */
    deleteEntry(projectId, entryId) {
        const entries = this.cache.get(projectId);
        if (!entries) return;

        const idx = entries.findIndex(e => e.id === entryId);
        if (idx === -1) return;

        const removed = entries.splice(idx, 1)[0];
        this._save(projectId);
        eventBus.emit('kb:updated', { projectId, entry: removed, action: 'delete' });
    }

    /**
     * Text search across entries
     * @param {string} query
     * @param {string} [projectId] - optional scope
     * @returns {object[]}
     */
    searchKB(query, projectId) {
        const q = query.toLowerCase();
        const results = [];

        const searchIn = projectId
            ? [[projectId, this.cache.get(projectId) || []]]
            : Array.from(this.cache.entries());

        for (const [pid, entries] of searchIn) {
            for (const entry of entries) {
                if (entry.content.toLowerCase().includes(q) ||
                    entry.type.toLowerCase().includes(q) ||
                    entry.source.toLowerCase().includes(q)) {
                    results.push({ ...entry, projectId: pid });
                }
            }
        }

        return results.sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Get most recent entries for a project
     * @param {string} projectId
     * @param {number} limit
     * @returns {object[]}
     */
    getRecentEntries(projectId, limit = 10) {
        const entries = this.cache.get(projectId) || [];
        return entries.slice(-limit).reverse();
    }

    /**
     * Export project KB as JSON string
     * @param {string} projectId
     * @returns {string}
     */
    exportProject(projectId) {
        const entries = this.cache.get(projectId) || [];
        return JSON.stringify({ projectId, entries, exportedAt: Date.now() });
    }

    /**
     * Import entries into a project KB
     * @param {string} projectId
     * @param {string} json
     */
    importProject(projectId, json) {
        try {
            const data = JSON.parse(json);
            const entries = data.entries || [];
            if (!this.cache.has(projectId)) {
                this.cache.set(projectId, []);
            }
            const existing = this.cache.get(projectId);
            for (const entry of entries) {
                // Avoid duplicates by ID
                if (!existing.find(e => e.id === entry.id)) {
                    existing.push(entry);
                }
            }
            this._save(projectId);
            eventBus.emit('kb:updated', { projectId, action: 'import' });
        } catch (e) {
            console.error('[KnowledgeBase] Import failed:', e);
        }
    }

    // ─── Internal ────────────────────────────────────────

    _save(projectId) {
        try {
            const entries = this.cache.get(projectId) || [];
            localStorage.setItem(this.PREFIX + projectId, JSON.stringify(entries));
        } catch (e) {
            console.error('[KnowledgeBase] Save failed:', e);
        }
    }

    _load(projectId) {
        try {
            const raw = localStorage.getItem(this.PREFIX + projectId);
            if (raw) {
                this.cache.set(projectId, JSON.parse(raw));
            } else {
                this.cache.set(projectId, []);
            }
        } catch (e) {
            console.error('[KnowledgeBase] Load failed:', e);
            this.cache.set(projectId, []);
        }
    }

    _generateId() {
        return 'kb-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    }
}

export const knowledgeBase = new KnowledgeBase();
