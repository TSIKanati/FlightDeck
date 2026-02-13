/**
 * TaskStore.js - Task CRUD with localStorage persistence + JSON export/import
 * Manages tasks, subtasks, notes, checkout locking, completion reports,
 * and completion tracking for all 227 agents
 */

const STORAGE_KEY = 'tsi-dashboard-tasks';
const LOG_KEY = 'tsi-dashboard-task-log';

export class TaskStore {
    constructor() {
        this._tasks = [];
        this._log = [];
        this._listeners = [];
        this._nextId = 1;
    }

    async init() {
        // Try localStorage first
        const stored = localStorage.getItem(STORAGE_KEY);
        const storedLog = localStorage.getItem(LOG_KEY);

        if (stored) {
            try {
                this._tasks = JSON.parse(stored);
            } catch (e) {
                console.warn('[TaskStore] Bad localStorage data, loading seed');
                this._tasks = [];
            }
        }

        if (!this._tasks.length) {
            // Load seed from JSON
            try {
                const res = await fetch('/js/data/tasks.json');
                if (res.ok) {
                    const data = await res.json();
                    this._tasks = data.tasks || [];
                }
            } catch (e) {
                console.warn('[TaskStore] Could not load tasks.json:', e.message);
            }
        }

        if (storedLog) {
            try { this._log = JSON.parse(storedLog); } catch (e) { this._log = []; }
        }

        // Set next ID
        this._nextId = this._tasks.reduce((max, t) => {
            const num = parseInt((t.id || '').replace('task-', ''));
            return num > max ? num + 1 : max;
        }, 1);

        console.log(`[TaskStore] Loaded ${this._tasks.length} tasks, ${this._log.length} log entries`);
    }

    // ---- CRUD ----

    getAll() { return this._tasks; }
    getLog() { return this._log; }

    getById(id) {
        return this._tasks.find(t => t.id === id);
    }

    getByAgent(agentId) {
        return this._tasks.filter(t => t.assignedTo === agentId);
    }

    getByFloor(floorIndex) {
        return this._tasks.filter(t => t.floor === Number(floorIndex));
    }

    getByStatus(status) {
        return this._tasks.filter(t => t.status === status);
    }

    getByProject(projectId) {
        return this._tasks.filter(t => t.project === projectId);
    }

    create(taskData) {
        const task = {
            id: `task-${String(this._nextId++).padStart(3, '0')}`,
            title: taskData.title || 'Untitled Task',
            description: taskData.description || '',
            assignedTo: taskData.assignedTo || null,
            assignedBy: taskData.assignedBy || 'owner',
            floor: taskData.floor !== undefined ? Number(taskData.floor) : null,
            project: taskData.project || null,
            priority: taskData.priority || 'P2',
            status: 'backlog',
            category: taskData.category || 'general',
            createdAt: new Date().toISOString(),
            dueDate: taskData.dueDate || null,
            completedAt: null,
            tags: taskData.tags || [],
            subtasks: taskData.subtasks || [],
            notes: [],
            grade: null,
            // Checkout / locking
            checkedOutBy: null,
            checkedOutAt: null,
            locked: false,
            // Completion report
            completionReport: null
        };
        this._tasks.push(task);
        this._save();
        this._notify('create', task);
        return task;
    }

    update(id, changes) {
        const task = this.getById(id);
        if (!task) return null;
        Object.assign(task, changes);
        this._save();
        this._notify('update', task);
        return task;
    }

    updateStatus(id, newStatus) {
        const task = this.getById(id);
        if (!task) return null;
        const oldStatus = task.status;
        task.status = newStatus;

        if (newStatus === 'done' && oldStatus !== 'done') {
            task.completedAt = new Date().toISOString();
            // Release lock on completion
            task.locked = false;
            task.checkedOutBy = null;
            task.checkedOutAt = null;
            // Add to log with completion report
            this._log.unshift({
                taskId: task.id,
                title: task.title,
                assignedTo: task.assignedTo,
                floor: task.floor,
                project: task.project,
                completedAt: task.completedAt,
                grade: task.grade,
                completionReport: task.completionReport || null
            });
            localStorage.setItem(LOG_KEY, JSON.stringify(this._log));
        }

        // Auto-checkout when moving to in-progress
        if (newStatus === 'in-progress' && task.assignedTo && !task.locked) {
            task.checkedOutBy = task.assignedTo;
            task.checkedOutAt = new Date().toISOString();
            task.locked = true;
        }

        this._save();
        this._notify('statusChange', task);
        return task;
    }

    // ---- Checkout / Locking ----

    /** Check out a task so no other agent works on it */
    checkout(taskId, agentId) {
        const task = this.getById(taskId);
        if (!task) return null;
        if (task.locked && task.checkedOutBy !== agentId) {
            return { error: `Task is locked by ${task.checkedOutBy}` };
        }
        task.checkedOutBy = agentId;
        task.checkedOutAt = new Date().toISOString();
        task.locked = true;
        if (task.status === 'backlog') task.status = 'in-progress';
        this._save();
        this._notify('checkout', task);
        return task;
    }

    /** Release a checked-out task */
    release(taskId) {
        const task = this.getById(taskId);
        if (!task) return null;
        task.checkedOutBy = null;
        task.checkedOutAt = null;
        task.locked = false;
        this._save();
        this._notify('release', task);
        return task;
    }

    /** Check if task is locked by someone other than agentId */
    isLockedBy(taskId, agentId) {
        const task = this.getById(taskId);
        if (!task || !task.locked) return false;
        return task.checkedOutBy !== agentId;
    }

    // ---- Completion Reports ----

    /** Submit a completion report when marking task done */
    submitCompletionReport(taskId, report) {
        const task = this.getById(taskId);
        if (!task) return null;
        task.completionReport = {
            summary: report.summary || '',
            lessonsLearned: report.lessonsLearned || '',
            blockers: report.blockers || '',
            recommendations: report.recommendations || '',
            submittedAt: new Date().toISOString(),
            submittedBy: report.submittedBy || task.assignedTo || 'unknown'
        };
        this._save();
        this._notify('completionReport', task);
        return task;
    }

    /** Get all tasks with completion reports for a project */
    getCompletedWithReports(projectId) {
        return this._log.filter(l => l.project === projectId && l.completionReport);
    }

    addNote(id, noteText) {
        const task = this.getById(id);
        if (!task) return null;
        task.notes.push({
            text: noteText,
            date: new Date().toISOString(),
            by: 'owner'
        });
        this._save();
        this._notify('note', task);
        return task;
    }

    toggleSubtask(taskId, subtaskIndex) {
        const task = this.getById(taskId);
        if (!task || !task.subtasks[subtaskIndex]) return null;
        task.subtasks[subtaskIndex].done = !task.subtasks[subtaskIndex].done;
        this._save();
        this._notify('subtask', task);
        return task;
    }

    delete(id) {
        const idx = this._tasks.findIndex(t => t.id === id);
        if (idx === -1) return false;
        const task = this._tasks.splice(idx, 1)[0];
        this._save();
        this._notify('delete', task);
        return true;
    }

    // ---- Stats ----

    stats() {
        const s = { total: this._tasks.length, backlog: 0, 'in-progress': 0, review: 0, done: 0 };
        for (const t of this._tasks) {
            if (s[t.status] !== undefined) s[t.status]++;
        }
        s.completedAll = this._log.length;
        return s;
    }

    agentStats(agentId) {
        const tasks = this.getByAgent(agentId);
        const completed = this._log.filter(l => l.assignedTo === agentId);
        return {
            active: tasks.filter(t => t.status !== 'done').length,
            total: tasks.length,
            completed: completed.length,
            tasks,
            completedLog: completed
        };
    }

    floorStats(floorIndex) {
        const tasks = this.getByFloor(floorIndex);
        return {
            total: tasks.length,
            backlog: tasks.filter(t => t.status === 'backlog').length,
            inProgress: tasks.filter(t => t.status === 'in-progress').length,
            review: tasks.filter(t => t.status === 'review').length,
            done: tasks.filter(t => t.status === 'done').length
        };
    }

    projectStats(projectId) {
        const tasks = this.getByProject(projectId);
        const completed = this._log.filter(l => l.project === projectId);
        return {
            total: tasks.length,
            backlog: tasks.filter(t => t.status === 'backlog').length,
            inProgress: tasks.filter(t => t.status === 'in-progress').length,
            review: tasks.filter(t => t.status === 'review').length,
            done: tasks.filter(t => t.status === 'done').length,
            locked: tasks.filter(t => t.locked).length,
            completed: completed.length,
            withReports: completed.filter(l => l.completionReport).length
        };
    }

    // ---- Persistence ----

    _save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._tasks));
    }

    exportJSON() {
        const data = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            tasks: this._tasks,
            log: this._log
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tsi-tasks-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    async importJSON(file) {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.tasks) {
            this._tasks = data.tasks;
            this._save();
        }
        if (data.log) {
            this._log = data.log;
            localStorage.setItem(LOG_KEY, JSON.stringify(this._log));
        }
        this._notify('import', null);
    }

    // ---- Events ----

    onChange(listener) {
        this._listeners.push(listener);
    }

    _notify(action, task) {
        for (const fn of this._listeners) fn(action, task);
    }
}
