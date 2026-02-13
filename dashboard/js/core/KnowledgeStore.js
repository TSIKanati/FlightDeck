/**
 * KnowledgeStore.js - Per-project knowledge base
 * Stores lessons learned from completed tasks, grading feedback, and best practices.
 * Auto-updates when tasks complete with reports and grades.
 * Serves as institutional memory for future agent task assignments.
 */

const STORAGE_KEY = 'tsi-dashboard-knowledge';

export class KnowledgeStore {
    constructor() {
        this._entries = [];
        this._listeners = [];
        this._nextId = 1;
    }

    async init() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                this._entries = JSON.parse(stored);
            } catch (e) {
                this._entries = [];
            }
        }

        if (!this._entries.length) {
            try {
                const res = await fetch('/js/data/knowledge.json');
                if (res.ok) {
                    const data = await res.json();
                    this._entries = data.entries || [];
                }
            } catch (e) { /* no seed file yet */ }
        }

        this._nextId = this._entries.reduce((max, e) => {
            const num = parseInt((e.id || '').replace('kb-', ''));
            return num > max ? num + 1 : max;
        }, 1);

        console.log(`[KnowledgeStore] Loaded ${this._entries.length} knowledge entries`);
    }

    // ---- CRUD ----

    getAll() { return this._entries; }

    getByProject(projectId) {
        return this._entries.filter(e => e.project === projectId)
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    }

    getByCategory(category) {
        return this._entries.filter(e => e.category === category);
    }

    getByAgent(agentId) {
        return this._entries.filter(e => e.contributedBy === agentId);
    }

    search(query) {
        const q = query.toLowerCase();
        return this._entries.filter(e =>
            (e.title || '').toLowerCase().includes(q) ||
            (e.content || '').toLowerCase().includes(q) ||
            (e.tags || []).some(t => t.toLowerCase().includes(q))
        );
    }

    /**
     * Add a knowledge entry from a completed task
     * Called automatically when a task is completed with a report
     */
    addFromCompletionReport(task, report, grade) {
        const entry = {
            id: `kb-${String(this._nextId++).padStart(4, '0')}`,
            project: task.project,
            floor: task.floor,
            category: task.category || 'general',
            title: `${task.title} - Lessons Learned`,
            content: report.lessonsLearned || report.summary || '',
            recommendations: report.recommendations || '',
            blockers: report.blockers || '',
            sourceTaskId: task.id || task.taskId,
            sourceTaskTitle: task.title,
            contributedBy: task.assignedTo,
            grade: grade || null,
            tags: task.tags || [],
            createdAt: new Date().toISOString(),
            type: 'task-completion'
        };

        // Only add if there's meaningful content
        if (entry.content || entry.recommendations) {
            this._entries.push(entry);
            this._save();
            this._notify('create', entry);
        }
        return entry;
    }

    /**
     * Add a manual knowledge entry (best practice, SOP, etc.)
     */
    create(data) {
        const entry = {
            id: `kb-${String(this._nextId++).padStart(4, '0')}`,
            project: data.project || null,
            floor: data.floor || null,
            category: data.category || 'general',
            title: data.title || 'Untitled Entry',
            content: data.content || '',
            recommendations: data.recommendations || '',
            blockers: '',
            sourceTaskId: data.taskId || null,
            sourceTaskTitle: data.taskTitle || null,
            contributedBy: data.contributedBy || 'owner',
            grade: null,
            tags: data.tags || [],
            createdAt: new Date().toISOString(),
            type: data.type || 'manual'
        };
        this._entries.push(entry);
        this._save();
        this._notify('create', entry);
        return entry;
    }

    delete(id) {
        const idx = this._entries.findIndex(e => e.id === id);
        if (idx === -1) return false;
        this._entries.splice(idx, 1);
        this._save();
        this._notify('delete', { id });
        return true;
    }

    // ---- Stats ----

    projectStats(projectId) {
        const entries = this.getByProject(projectId);
        const categories = {};
        for (const e of entries) {
            categories[e.category] = (categories[e.category] || 0) + 1;
        }
        return {
            total: entries.length,
            categories,
            latestEntry: entries[0] || null,
            contributors: [...new Set(entries.map(e => e.contributedBy).filter(Boolean))]
        };
    }

    // ---- Persistence ----

    _save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._entries));
    }

    exportJSON() {
        const data = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            entries: this._entries
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tsi-knowledge-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    onChange(listener) { this._listeners.push(listener); }
    _notify(action, entry) { for (const fn of this._listeners) fn(action, entry); }
}
