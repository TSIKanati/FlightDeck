/**
 * TaskAssignModal - Task Creation Modal from FloorPanel
 * TSI Enterprise 3D Command Center
 *
 * Triggered by "Assign Agent" button in FloorPanel.
 * Shows agent picker with LEFT/RIGHT tower toggles,
 * TowerBridge dedup check before creation.
 */
import { eventBus } from '../core/EventBus.js';
import { taskLogger } from '../core/TaskLogger.js';

function _injectStyles() {
    if (document.getElementById('hr-task-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'hr-task-modal-styles';
    style.textContent = `
        .hr-task-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 500;
            display: none;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(4px);
        }
        .hr-task-modal-overlay.open {
            display: flex;
        }
        .hr-task-modal {
            background: rgba(10,15,30,0.96);
            border: 1px solid rgba(74,144,217,0.3);
            border-radius: 12px;
            width: 420px;
            max-height: 80vh;
            overflow-y: auto;
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            color: #c0d0e8;
            box-shadow: 0 12px 60px rgba(0,0,0,0.5);
        }
        .hr-tm-header {
            padding: 20px;
            border-bottom: 1px solid rgba(74,144,217,0.15);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .hr-tm-title {
            font-size: 14px;
            font-weight: 700;
            color: #e0e8f0;
            letter-spacing: 1px;
        }
        .hr-tm-close {
            width: 28px;
            height: 28px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 4px;
            color: #8899aa;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .hr-tm-close:hover { background: rgba(231,76,60,0.2); color: #E74C3C; }

        .hr-tm-body { padding: 16px 20px; }

        .hr-tm-field { margin-bottom: 14px; }
        .hr-tm-label {
            font-size: 10px;
            letter-spacing: 1.5px;
            color: #4A90D9;
            text-transform: uppercase;
            margin-bottom: 6px;
        }
        .hr-tm-input {
            width: 100%;
            padding: 8px 12px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(74,144,217,0.2);
            border-radius: 4px;
            color: #e0e8f0;
            font-family: inherit;
            font-size: 12px;
            outline: none;
        }
        .hr-tm-input:focus {
            border-color: rgba(74,144,217,0.5);
            box-shadow: 0 0 0 2px rgba(74,144,217,0.1);
        }
        .hr-tm-select {
            width: 100%;
            padding: 8px 12px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(74,144,217,0.2);
            border-radius: 4px;
            color: #e0e8f0;
            font-family: inherit;
            font-size: 12px;
            outline: none;
            appearance: none;
        }

        .hr-tm-tower-toggle {
            display: flex;
            gap: 8px;
        }
        .hr-tm-tower-btn {
            flex: 1;
            padding: 8px;
            border: 1px solid rgba(74,144,217,0.2);
            border-radius: 4px;
            background: rgba(255,255,255,0.03);
            color: #667a90;
            font-family: inherit;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            text-align: center;
            transition: all 0.15s;
        }
        .hr-tm-tower-btn.selected {
            background: rgba(74,144,217,0.15);
            border-color: rgba(74,144,217,0.5);
            color: #e0e8f0;
        }

        .hr-tm-agents {
            max-height: 160px;
            overflow-y: auto;
            border: 1px solid rgba(74,144,217,0.15);
            border-radius: 4px;
            scrollbar-width: thin;
            scrollbar-color: rgba(74,144,217,0.3) transparent;
        }
        .hr-tm-agent-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            cursor: pointer;
            font-size: 11px;
            transition: background 0.1s;
        }
        .hr-tm-agent-row:hover { background: rgba(60,140,255,0.08); }
        .hr-tm-agent-row.selected { background: rgba(60,140,255,0.15); }
        .hr-tm-agent-check {
            width: 14px; height: 14px;
            border: 1px solid rgba(74,144,217,0.3);
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            flex-shrink: 0;
        }
        .hr-tm-agent-check.checked {
            background: rgba(74,144,217,0.3);
            border-color: rgba(74,144,217,0.6);
            color: #e0e8f0;
        }
        .hr-tm-agent-name { color: #c0d0e8; flex: 1; }
        .hr-tm-agent-status {
            width: 6px; height: 6px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        .hr-tm-agent-tower {
            font-size: 9px;
            font-weight: 700;
            color: #556677;
        }

        .hr-tm-warning {
            padding: 8px 12px;
            background: rgba(231,76,60,0.1);
            border: 1px solid rgba(231,76,60,0.3);
            border-radius: 4px;
            color: #E74C3C;
            font-size: 11px;
            margin-bottom: 14px;
            display: none;
        }
        .hr-tm-warning.visible { display: block; }

        .hr-tm-footer {
            padding: 16px 20px;
            border-top: 1px solid rgba(74,144,217,0.15);
            display: flex;
            justify-content: flex-end;
            gap: 8px;
        }
        .hr-tm-btn {
            padding: 8px 20px;
            border: 1px solid rgba(74,144,217,0.3);
            border-radius: 4px;
            font-family: inherit;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
        }
        .hr-tm-btn-cancel {
            background: rgba(255,255,255,0.04);
            color: #8899aa;
        }
        .hr-tm-btn-cancel:hover { background: rgba(255,255,255,0.08); }
        .hr-tm-btn-submit {
            background: rgba(74,144,217,0.2);
            color: #e0e8f0;
            border-color: rgba(74,144,217,0.4);
        }
        .hr-tm-btn-submit:hover { background: rgba(74,144,217,0.3); }
    `;
    document.head.appendChild(style);
}

const AGENT_STATE_COLORS = {
    working: '#2ECC71', idle: '#5DADE2', moving: '#E67E22',
    meeting: '#F1C40F', networking: '#8E44AD',
};

export class TaskAssignModal {
    constructor(agentManager, taskLoggerRef, towerBridgeRef) {
        this._agentManager = agentManager;
        this._taskLogger = taskLoggerRef || taskLogger;
        this._towerBridge = towerBridgeRef || null;
        this._overlay = null;
        this._floorIndex = null;
        this._projectId = null;
        this._selectedTower = 'left';
        this._selectedAgents = new Set();

        _injectStyles();
        this._build();
    }

    _build() {
        this._overlay = document.createElement('div');
        this._overlay.className = 'hr-task-modal-overlay';
        this._overlay.addEventListener('click', (e) => {
            if (e.target === this._overlay) this.hide();
        });
        document.body.appendChild(this._overlay);
    }

    show(floorIndex, projectId) {
        this._floorIndex = floorIndex;
        this._projectId = projectId;
        this._selectedAgents.clear();
        this._selectedTower = 'left';
        this._render();
        this._overlay.classList.add('open');
    }

    hide() {
        this._overlay.classList.remove('open');
    }

    _render() {
        this._overlay.innerHTML = '';

        const modal = document.createElement('div');
        modal.className = 'hr-task-modal';

        // Header
        const header = document.createElement('div');
        header.className = 'hr-tm-header';
        const title = document.createElement('div');
        title.className = 'hr-tm-title';
        title.textContent = `ASSIGN TASK - Floor ${this._floorIndex}`;
        const closeBtn = document.createElement('div');
        closeBtn.className = 'hr-tm-close';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', () => this.hide());
        header.appendChild(title);
        header.appendChild(closeBtn);
        modal.appendChild(header);

        // Body
        const body = document.createElement('div');
        body.className = 'hr-tm-body';

        // Warning (hidden by default)
        const warning = document.createElement('div');
        warning.className = 'hr-tm-warning';
        warning.id = 'hr-tm-warning';
        body.appendChild(warning);

        // Title field
        body.appendChild(this._field('TASK TITLE', () => {
            const input = document.createElement('input');
            input.className = 'hr-tm-input';
            input.id = 'hr-tm-task-title';
            input.placeholder = 'Enter task title...';
            input.addEventListener('input', () => this._checkDuplicate());
            return input;
        }));

        // Priority
        body.appendChild(this._field('PRIORITY', () => {
            const select = document.createElement('select');
            select.className = 'hr-tm-select';
            select.id = 'hr-tm-priority';
            ['normal', 'low', 'high', 'critical'].forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p.toUpperCase();
                select.appendChild(opt);
            });
            return select;
        }));

        // Tower toggle
        body.appendChild(this._field('TOWER', () => {
            const wrap = document.createElement('div');
            wrap.className = 'hr-tm-tower-toggle';
            ['left', 'right', 'both'].forEach(t => {
                const btn = document.createElement('div');
                btn.className = 'hr-tm-tower-btn' + (this._selectedTower === t ? ' selected' : '');
                btn.textContent = t === 'left' ? 'LEFT' : t === 'right' ? 'RIGHT' : 'BOTH';
                btn.addEventListener('click', () => {
                    this._selectedTower = t;
                    this._render();
                });
                wrap.appendChild(btn);
            });
            return wrap;
        }));

        // Agent picker
        body.appendChild(this._field('ASSIGN AGENTS', () => {
            const agentList = document.createElement('div');
            agentList.className = 'hr-tm-agents';
            const agents = this._getAvailableAgents(this._floorIndex);

            if (agents.length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = 'padding:12px;text-align:center;font-size:11px;color:#556677;';
                empty.textContent = 'No agents available on this floor';
                agentList.appendChild(empty);
            } else {
                agents.forEach(sprite => {
                    const def = sprite.def;
                    const state = sprite.state || 'idle';
                    const tower = def.tower || 'left';
                    const isSelected = this._selectedAgents.has(def.id);

                    const row = document.createElement('div');
                    row.className = 'hr-tm-agent-row' + (isSelected ? ' selected' : '');
                    row.addEventListener('click', () => {
                        if (this._selectedAgents.has(def.id)) {
                            this._selectedAgents.delete(def.id);
                        } else {
                            this._selectedAgents.add(def.id);
                        }
                        this._render();
                    });

                    const check = document.createElement('div');
                    check.className = 'hr-tm-agent-check' + (isSelected ? ' checked' : '');
                    check.textContent = isSelected ? '\u2713' : '';

                    const name = document.createElement('div');
                    name.className = 'hr-tm-agent-name';
                    name.textContent = def.name || def.id;

                    const statusDot = document.createElement('div');
                    statusDot.className = 'hr-tm-agent-status';
                    statusDot.style.background = AGENT_STATE_COLORS[state] || '#5DADE2';
                    statusDot.title = state;

                    const towerLabel = document.createElement('div');
                    towerLabel.className = 'hr-tm-agent-tower';
                    towerLabel.textContent = tower === 'right' ? 'R' : 'L';

                    row.appendChild(check);
                    row.appendChild(name);
                    row.appendChild(statusDot);
                    row.appendChild(towerLabel);
                    agentList.appendChild(row);
                });
            }
            return agentList;
        }));

        modal.appendChild(body);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'hr-tm-footer';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'hr-tm-btn hr-tm-btn-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => this.hide());

        const submitBtn = document.createElement('button');
        submitBtn.className = 'hr-tm-btn hr-tm-btn-submit';
        submitBtn.textContent = 'Create Task';
        submitBtn.addEventListener('click', () => this._onSubmit());

        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);
        modal.appendChild(footer);

        this._overlay.appendChild(modal);
    }

    _field(labelText, buildContent) {
        const field = document.createElement('div');
        field.className = 'hr-tm-field';
        const label = document.createElement('div');
        label.className = 'hr-tm-label';
        label.textContent = labelText;
        field.appendChild(label);
        field.appendChild(buildContent());
        return field;
    }

    _getAvailableAgents(floorIndex) {
        if (!this._agentManager) return [];
        const left = this._agentManager.getAgentsByFloorAndTower(floorIndex, 'left') || [];
        const right = this._agentManager.getAgentsByFloorAndTower(floorIndex, 'right') || [];
        let agents = [...left, ...right];

        // Filter by selected tower
        if (this._selectedTower === 'left') {
            agents = agents.filter(a => (a.def?.tower || 'left') === 'left');
        } else if (this._selectedTower === 'right') {
            agents = agents.filter(a => (a.def?.tower || 'left') === 'right');
        }
        return agents;
    }

    _checkDuplicate() {
        if (!this._towerBridge) return;
        const titleInput = document.getElementById('hr-tm-task-title');
        const warning = document.getElementById('hr-tm-warning');
        if (!titleInput || !warning) return;

        const title = titleInput.value.trim();
        if (title.length < 3) {
            warning.classList.remove('visible');
            return;
        }

        const isDupe = this._towerBridge.isDuplicate({
            title,
            targetProject: this._projectId,
            targetFloor: this._floorIndex,
        });

        if (isDupe) {
            warning.textContent = 'DUPLICATE: A similar task already exists on another tower.';
            warning.classList.add('visible');
        } else {
            warning.classList.remove('visible');
        }
    }

    _onSubmit() {
        const titleInput = document.getElementById('hr-tm-task-title');
        const prioritySelect = document.getElementById('hr-tm-priority');
        if (!titleInput) return;

        const title = titleInput.value.trim();
        if (!title) return;

        const priority = prioritySelect ? prioritySelect.value : 'normal';

        // Create the task
        const task = this._taskLogger.createTask({
            title,
            description: '',
            source: 'floorPanel',
            sourceAgent: 'user',
            priority,
            targetFloor: this._floorIndex,
            targetProject: this._projectId,
            tower: this._selectedTower,
        });

        // Assign selected agents
        if (this._selectedAgents.size > 0) {
            eventBus.emit('task:delegated', {
                taskId: task.id,
                fromAgent: 'user',
                toAgent: Array.from(this._selectedAgents).join(', '),
                floor: this._floorIndex,
                division: null,
            });
        }

        // Emit for C2 routing
        eventBus.emit('c2:newTask', {
            taskId: task.id,
            title: task.title,
            tower: this._selectedTower,
            floor: this._floorIndex,
            agents: Array.from(this._selectedAgents),
        });

        this.hide();
    }
}

/**
 * Factory function for creating the modal
 */
export function createTaskAssignModal({ agentManager, taskLogger: tl, towerBridge: tb } = {}) {
    return new TaskAssignModal(agentManager, tl, tb);
}
