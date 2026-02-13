/**
 * AssetStore.js - Project asset inventory management
 * Tracks websites, codebases, files, repos across all projects
 */

const STORAGE_KEY = 'tsi-dashboard-assets';

export class AssetStore {
    constructor() {
        this._projects = {};
        this._listeners = [];
    }

    async init() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try { this._projects = JSON.parse(stored); } catch (e) { this._projects = {}; }
        }

        if (!Object.keys(this._projects).length) {
            try {
                const res = await fetch('/js/data/assets.json');
                if (res.ok) {
                    const data = await res.json();
                    this._projects = data.projects || {};
                }
            } catch (e) { /* no seed yet */ }
        }

        console.log(`[AssetStore] Loaded ${Object.keys(this._projects).length} project inventories`);
    }

    getAll() { return this._projects; }

    getProject(projectId) {
        return this._projects[projectId] || null;
    }

    updateProject(projectId, data) {
        if (!this._projects[projectId]) {
            this._projects[projectId] = {};
        }
        Object.assign(this._projects[projectId], data);
        this._save();
        this._notify('update', projectId);
        return this._projects[projectId];
    }

    addFinding(projectId, finding) {
        const proj = this._projects[projectId];
        if (!proj) return;
        if (!proj.findings) proj.findings = [];
        proj.findings.push({
            ...finding,
            date: new Date().toISOString().slice(0, 10),
            id: `find-${Date.now()}`
        });
        this._save();
        this._notify('finding', projectId);
    }

    setAuditStatus(projectId, status) {
        if (!this._projects[projectId]) return;
        this._projects[projectId].status = status;
        this._projects[projectId].lastAudit = new Date().toISOString().slice(0, 10);
        this._save();
        this._notify('audit', projectId);
    }

    /** Total asset counts across all projects */
    totalCounts() {
        const totals = { htmlPages: 0, jsModules: 0, cssFiles: 0, images: 0, totalSizeMB: 0, projects: 0 };
        for (const [, proj] of Object.entries(this._projects)) {
            totals.projects++;
            if (proj.assets) {
                for (const [k, v] of Object.entries(proj.assets)) {
                    if (typeof v === 'number' && totals[k] !== undefined) totals[k] += v;
                }
            }
        }
        return totals;
    }

    _save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._projects));
    }

    exportJSON() {
        const data = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            projects: this._projects
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tsi-assets-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    onChange(listener) { this._listeners.push(listener); }
    _notify(action, id) { for (const fn of this._listeners) fn(action, id); }
}
