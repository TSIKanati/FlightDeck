/**
 * FloorPanel.js - Floor Detail Overlay Panel for The Highrise
 * TSI Enterprise 3D Command Center
 *
 * Slides in from the right side when a floor is clicked.
 * Shows floor info, project details, division breakdown, metrics,
 * and action buttons.
 *
 * All DOM elements created programmatically. CSS classes use 'hr-' prefix.
 */

import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';
import { taskLogger as defaultTaskLogger } from '../core/TaskLogger.js';

// ---------------------------------------------------------------------------
// Division reference data
// ---------------------------------------------------------------------------

const DIVISIONS = [
    { id: 'marketing',  name: 'Marketing',    emoji: '\uD83D\uDCE2', color: '#E67E22' },
    { id: 'rnd',        name: 'R&D',          emoji: '\uD83D\uDD2C', color: '#3498DB' },
    { id: 'testing',    name: 'Testing',       emoji: '\uD83E\uDDEA', color: '#E74C3C' },
    { id: 'production', name: 'Production',    emoji: '\uD83C\uDFED', color: '#2ECC71' },
    { id: 'security',   name: 'Security',      emoji: '\uD83D\uDD12', color: '#C0392B' },
    { id: 'legal',      name: 'Legal',         emoji: '\u2696\uFE0F', color: '#8B4513' },
    { id: 'accounting', name: 'Accounting',    emoji: '\uD83D\uDCB0', color: '#27AE60' },
    { id: 'meeting',    name: 'Meeting Room',  emoji: '\uD83D\uDDE3\uFE0F', color: '#9B59B6' },
];

// ---------------------------------------------------------------------------
// Status badge colors
// ---------------------------------------------------------------------------

const STATUS_COLORS = {
    production:  { bg: 'rgba(46,204,113,0.15)',  text: '#2ECC71', border: 'rgba(46,204,113,0.4)' },
    development: { bg: 'rgba(52,152,219,0.15)',  text: '#3498DB', border: 'rgba(52,152,219,0.4)' },
    concept:     { bg: 'rgba(155,89,182,0.15)',  text: '#9B59B6', border: 'rgba(155,89,182,0.4)' },
    reserved:    { bg: 'rgba(127,140,141,0.15)', text: '#95A5A6', border: 'rgba(127,140,141,0.4)' },
};

const AGENT_STATE_COLORS = {
    working:    '#2ECC71',
    idle:       '#5DADE2',
    moving:     '#E67E22',
    meeting:    '#F1C40F',
    networking: '#8E44AD',
};

// ---------------------------------------------------------------------------
// Style injection
// ---------------------------------------------------------------------------

function _injectStyles() {
    if (document.getElementById('hr-floor-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'hr-floor-panel-styles';
    style.textContent = `
        .hr-floor-panel {
            position: fixed;
            top: 44px;
            right: 0;
            bottom: 40px;
            width: 380px;
            background: rgba(10,15,30,0.92);
            border-left: 1px solid rgba(74,144,217,0.3);
            backdrop-filter: blur(12px);
            z-index: 60;
            transform: translateX(100%);
            transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
            overflow-y: auto;
            overflow-x: hidden;
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            color: #c0d0e8;
            scrollbar-width: thin;
            scrollbar-color: rgba(74,144,217,0.3) transparent;
        }
        .hr-floor-panel::-webkit-scrollbar {
            width: 4px;
        }
        .hr-floor-panel::-webkit-scrollbar-track {
            background: transparent;
        }
        .hr-floor-panel::-webkit-scrollbar-thumb {
            background: rgba(74,144,217,0.3);
            border-radius: 2px;
        }
        .hr-floor-panel.open {
            transform: translateX(0);
        }

        /* Header */
        .hr-fp-header {
            position: relative;
            padding: 20px;
            border-bottom: 1px solid rgba(74,144,217,0.15);
        }
        .hr-fp-close {
            position: absolute;
            top: 12px;
            right: 12px;
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
            transition: background 0.15s, color 0.15s;
        }
        .hr-fp-close:hover {
            background: rgba(231,76,60,0.2);
            color: #E74C3C;
        }
        .hr-fp-emoji {
            font-size: 32px;
            margin-bottom: 8px;
        }
        .hr-fp-title {
            font-size: 18px;
            font-weight: 700;
            color: #e0e8f0;
            letter-spacing: 1px;
        }
        .hr-fp-subtitle {
            font-size: 11px;
            color: #667a90;
            margin-top: 4px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .hr-fp-type-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
        }
        .hr-fp-floor-idx {
            color: #556677;
        }

        /* Section */
        .hr-fp-section {
            padding: 16px 20px;
            border-bottom: 1px solid rgba(74,144,217,0.1);
        }
        .hr-fp-section-title {
            font-size: 10px;
            letter-spacing: 2px;
            color: #4A90D9;
            text-transform: uppercase;
            margin-bottom: 10px;
        }

        /* Project info */
        .hr-fp-project-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
            font-size: 11px;
        }
        .hr-fp-project-label {
            color: #667a90;
        }
        .hr-fp-project-value {
            color: #c0d0e8;
            font-weight: 500;
        }
        .hr-fp-status-badge {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .hr-fp-description {
            font-size: 12px;
            color: #8899aa;
            line-height: 1.5;
            margin-top: 8px;
        }
        .hr-fp-tech-stack {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 8px;
        }
        .hr-fp-tech-tag {
            padding: 2px 8px;
            background: rgba(74,144,217,0.1);
            border: 1px solid rgba(74,144,217,0.2);
            border-radius: 3px;
            font-size: 10px;
            color: #8899bb;
        }

        /* Division list */
        .hr-fp-division-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 5px 0;
            font-size: 11px;
        }
        .hr-fp-div-left {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .hr-fp-div-emoji {
            width: 20px;
            text-align: center;
        }
        .hr-fp-div-name {
            color: #a0b4d0;
        }
        .hr-fp-div-count {
            color: #556677;
            font-size: 10px;
        }
        .hr-fp-div-bar-track {
            width: 60px;
            height: 4px;
            background: rgba(255,255,255,0.05);
            border-radius: 2px;
            overflow: hidden;
            margin-left: 10px;
        }
        .hr-fp-div-bar-fill {
            height: 100%;
            border-radius: 2px;
            transition: width 0.3s;
        }

        /* Metrics */
        .hr-fp-metrics-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        .hr-fp-metric-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(74,144,217,0.1);
            border-radius: 6px;
            padding: 10px;
        }
        .hr-fp-metric-value {
            font-size: 18px;
            font-weight: 700;
            color: #e0e8f0;
        }
        .hr-fp-metric-label {
            font-size: 9px;
            color: #667a90;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-top: 2px;
        }

        /* Action buttons */
        .hr-fp-actions {
            display: flex;
            gap: 8px;
            padding: 16px 20px;
        }
        .hr-fp-btn {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid rgba(74,144,217,0.3);
            border-radius: 4px;
            background: rgba(74,144,217,0.08);
            color: #4A90D9;
            font-family: inherit;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-align: center;
            cursor: pointer;
            transition: background 0.15s, border-color 0.15s;
        }
        .hr-fp-btn:hover {
            background: rgba(74,144,217,0.18);
            border-color: rgba(74,144,217,0.5);
        }
        .hr-fp-btn.primary {
            background: rgba(74,144,217,0.2);
            color: #e0e8f0;
        }
    `;
    document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// FloorPanel class
// ---------------------------------------------------------------------------

export class FloorPanel {
    constructor({ agentManager, taskLogger, knowledgeBase, towerBridge } = {}) {
        this._panel = null;
        this._isOpen = false;
        this._currentFloor = null;
        this._currentProject = null;
        this._activeTab = 'roster';
        this._agentManager = agentManager || null;
        this._taskLogger = taskLogger || defaultTaskLogger;
        this._knowledgeBase = knowledgeBase || null;
        this._towerBridge = towerBridge || null;
        this._unsubscribers = [];

        _injectStyles();
        this._build();
        this._bindEvents();
    }

    // -----------------------------------------------------------------------
    // DOM Construction
    // -----------------------------------------------------------------------

    _build() {
        this._panel = document.createElement('div');
        this._panel.className = 'hr-floor-panel';
        this._panel.id = 'hr-floor-panel';
        document.body.appendChild(this._panel);
    }

    _render(floorData, projectData) {
        const panel = this._panel;
        panel.innerHTML = '';

        const color = floorData.color || '#4A90D9';

        // ---- Header ----
        const header = document.createElement('div');
        header.className = 'hr-fp-header';
        header.style.borderLeftColor = color;

        // Close button
        const closeBtn = document.createElement('div');
        closeBtn.className = 'hr-fp-close';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', () => this.hide());

        const emoji = document.createElement('div');
        emoji.className = 'hr-fp-emoji';
        emoji.textContent = floorData.emoji || '';

        const title = document.createElement('div');
        title.className = 'hr-fp-title';
        title.textContent = floorData.name || 'Unknown Floor';
        title.style.color = color;

        const subtitle = document.createElement('div');
        subtitle.className = 'hr-fp-subtitle';

        const typeBadge = document.createElement('span');
        typeBadge.className = 'hr-fp-type-badge';
        typeBadge.textContent = (floorData.type || 'unknown').toUpperCase();
        typeBadge.style.cssText = `background:${color}22;color:${color};border:1px solid ${color}44;`;

        const floorIdx = document.createElement('span');
        floorIdx.className = 'hr-fp-floor-idx';
        const idx = floorData.index;
        floorIdx.textContent = idx <= 0 ? `Basement B${Math.abs(idx) + 1}` : `Floor ${idx}`;

        subtitle.appendChild(typeBadge);
        subtitle.appendChild(floorIdx);

        header.appendChild(closeBtn);
        header.appendChild(emoji);
        header.appendChild(title);
        header.appendChild(subtitle);
        panel.appendChild(header);

        // ---- Project Details (if project floor) ----
        if (projectData) {
            const projSection = document.createElement('div');
            projSection.className = 'hr-fp-section';

            const projTitle = document.createElement('div');
            projTitle.className = 'hr-fp-section-title';
            projTitle.textContent = 'PROJECT DETAILS';
            projSection.appendChild(projTitle);

            // Priority row
            this._addProjectRow(projSection, 'Priority', projectData.priority || 'N/A');

            // Status row with badge
            const statusRow = document.createElement('div');
            statusRow.className = 'hr-fp-project-row';

            const statusLabel = document.createElement('span');
            statusLabel.className = 'hr-fp-project-label';
            statusLabel.textContent = 'Status';

            const statusBadge = document.createElement('span');
            statusBadge.className = 'hr-fp-status-badge';
            const statusKey = projectData.status || 'concept';
            const sc = STATUS_COLORS[statusKey] || STATUS_COLORS.concept;
            statusBadge.textContent = statusKey.toUpperCase();
            statusBadge.style.cssText = `background:${sc.bg};color:${sc.text};border:1px solid ${sc.border};`;

            statusRow.appendChild(statusLabel);
            statusRow.appendChild(statusBadge);
            projSection.appendChild(statusRow);

            // Tech stack
            if (projectData.techStack && projectData.techStack.length) {
                const techLabel = document.createElement('div');
                techLabel.className = 'hr-fp-project-label';
                techLabel.textContent = 'Tech Stack';
                techLabel.style.marginTop = '10px';
                projSection.appendChild(techLabel);

                const techWrap = document.createElement('div');
                techWrap.className = 'hr-fp-tech-stack';
                projectData.techStack.forEach(t => {
                    const tag = document.createElement('span');
                    tag.className = 'hr-fp-tech-tag';
                    tag.textContent = t;
                    techWrap.appendChild(tag);
                });
                projSection.appendChild(techWrap);
            }

            // Description
            if (projectData.description) {
                const desc = document.createElement('div');
                desc.className = 'hr-fp-description';
                desc.textContent = projectData.description;
                projSection.appendChild(desc);
            }

            panel.appendChild(projSection);
        }

        // ---- Divisions ----
        const divSection = document.createElement('div');
        divSection.className = 'hr-fp-section';

        const divTitle = document.createElement('div');
        divTitle.className = 'hr-fp-section-title';
        divTitle.textContent = 'DIVISIONS';
        divSection.appendChild(divTitle);

        // Get agent counts per division for this floor
        const agents = stateManager.get('agents') || {};
        const floorAgents = Object.values(agents).filter(a => a.floor === floorData.index);
        const divCounts = {};
        floorAgents.forEach(a => {
            if (a.division) {
                divCounts[a.division] = (divCounts[a.division] || 0) + 1;
            }
        });
        const maxCount = Math.max(1, ...Object.values(divCounts));

        DIVISIONS.forEach(div => {
            const count = divCounts[div.id] || 0;

            const item = document.createElement('div');
            item.className = 'hr-fp-division-item';

            const left = document.createElement('div');
            left.className = 'hr-fp-div-left';

            const divEmoji = document.createElement('span');
            divEmoji.className = 'hr-fp-div-emoji';
            divEmoji.textContent = div.emoji;

            const divName = document.createElement('span');
            divName.className = 'hr-fp-div-name';
            divName.textContent = div.name;

            left.appendChild(divEmoji);
            left.appendChild(divName);

            const right = document.createElement('div');
            right.style.cssText = 'display:flex;align-items:center;gap:8px;';

            const barTrack = document.createElement('div');
            barTrack.className = 'hr-fp-div-bar-track';

            const barFill = document.createElement('div');
            barFill.className = 'hr-fp-div-bar-fill';
            barFill.style.width = `${(count / maxCount) * 100}%`;
            barFill.style.background = div.color;
            barTrack.appendChild(barFill);

            const countEl = document.createElement('span');
            countEl.className = 'hr-fp-div-count';
            countEl.textContent = count;

            right.appendChild(barTrack);
            right.appendChild(countEl);

            item.appendChild(left);
            item.appendChild(right);
            divSection.appendChild(item);
        });

        panel.appendChild(divSection);

        // ---- Metrics ----
        if (projectData && projectData.metrics && Object.keys(projectData.metrics).length) {
            const metSection = document.createElement('div');
            metSection.className = 'hr-fp-section';

            const metTitle = document.createElement('div');
            metTitle.className = 'hr-fp-section-title';
            metTitle.textContent = 'METRICS';
            metSection.appendChild(metTitle);

            const grid = document.createElement('div');
            grid.className = 'hr-fp-metrics-grid';

            Object.entries(projectData.metrics).forEach(([key, value]) => {
                const card = document.createElement('div');
                card.className = 'hr-fp-metric-card';
                card.style.borderColor = color + '33';

                const valEl = document.createElement('div');
                valEl.className = 'hr-fp-metric-value';
                valEl.style.color = color;
                valEl.textContent = typeof value === 'number' ? this._formatNumber(value) : value;

                const labelEl = document.createElement('div');
                labelEl.className = 'hr-fp-metric-label';
                labelEl.textContent = this._formatMetricLabel(key);

                card.appendChild(valEl);
                card.appendChild(labelEl);
                grid.appendChild(card);
            });

            metSection.appendChild(grid);
            panel.appendChild(metSection);
        }

        // ---- Action Buttons ----
        const actions = document.createElement('div');
        actions.className = 'hr-fp-actions';

        const btnInterior = this._createButton('View Interior', 'primary');
        btnInterior.addEventListener('click', () => {
            eventBus.emit('floorPanel:viewInterior', { floorIndex: floorData.index });
        });

        const btnAssign = this._createButton('Assign Task');
        btnAssign.addEventListener('click', () => {
            eventBus.emit('floorPanel:assignAgent', { floor: floorData.index, project: floorData.projectId });
        });

        const btnLink = this._createButton('FlightDeck');
        btnLink.addEventListener('click', () => {
            eventBus.emit('floorPanel:flightdeckLink', { floorId: floorData.id, projectId: floorData.projectId });
        });

        actions.appendChild(btnInterior);
        actions.appendChild(btnAssign);
        actions.appendChild(btnLink);
        panel.appendChild(actions);

        // ---- Knowledge Base Mini-Section ----
        if (this._knowledgeBase && floorData.projectId) {
            this._renderKBSection(panel, floorData);
        }

        // ---- Tab Bar (Roster / Tasks / History) ----
        this._renderTabBar(panel, floorData);
    }

    _addProjectRow(container, label, value) {
        const row = document.createElement('div');
        row.className = 'hr-fp-project-row';

        const labelEl = document.createElement('span');
        labelEl.className = 'hr-fp-project-label';
        labelEl.textContent = label;

        const valueEl = document.createElement('span');
        valueEl.className = 'hr-fp-project-value';
        valueEl.textContent = value;

        row.appendChild(labelEl);
        row.appendChild(valueEl);
        container.appendChild(row);
    }

    _createButton(text, variant) {
        const btn = document.createElement('button');
        btn.className = 'hr-fp-btn' + (variant ? ` ${variant}` : '');
        btn.textContent = text;
        return btn;
    }

    // -----------------------------------------------------------------------
    // Tab Bar + Tab Content
    // -----------------------------------------------------------------------

    _renderTabBar(panel, floorData) {
        const tabBar = document.createElement('div');
        tabBar.className = 'hr-fp-tab-bar';

        const tabs = [
            { id: 'roster', label: 'Roster' },
            { id: 'tasks', label: 'Tasks' },
            { id: 'history', label: 'History' },
        ];

        tabs.forEach(t => {
            const tab = document.createElement('div');
            tab.className = 'hr-fp-tab' + (this._activeTab === t.id ? ' active' : '');
            tab.textContent = t.label;
            tab.addEventListener('click', () => this._switchTab(t.id));
            tabBar.appendChild(tab);
        });

        panel.appendChild(tabBar);

        // Tab content container
        const content = document.createElement('div');
        content.className = 'hr-fp-tab-content';
        content.id = 'hr-fp-tab-content';

        const floorIndex = floorData.index;
        if (this._activeTab === 'roster') {
            this._renderAgentRoster(content, floorIndex);
        } else if (this._activeTab === 'tasks') {
            this._renderActiveTasks(content, floorIndex);
        } else if (this._activeTab === 'history') {
            this._renderCompletedTasks(content, floorIndex);
        }

        panel.appendChild(content);
    }

    _switchTab(tabName) {
        this._activeTab = tabName;
        if (this._isOpen && this._currentFloor) {
            this._render(this._currentFloor, this._currentProject);
        }
    }

    _renderAgentRoster(container, floorIndex) {
        const roster = document.createElement('div');
        roster.className = 'hr-fp-roster';

        let agents = [];

        if (this._agentManager) {
            // Get LEFT tower agents
            const leftAgents = this._agentManager.getAgentsByFloorAndTower(floorIndex, 'left');
            // Get RIGHT tower agents
            const rightAgents = this._agentManager.getAgentsByFloorAndTower(floorIndex, 'right');
            agents = [...leftAgents, ...rightAgents];
        }

        if (agents.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'hr-fp-empty';
            empty.textContent = 'No agents assigned to this floor';
            roster.appendChild(empty);
            container.appendChild(roster);
            return;
        }

        agents.forEach(sprite => {
            const def = sprite.def;
            const state = sprite.state || 'idle';
            const tower = def.tower || 'left';
            const divInfo = DIVISIONS.find(d => d.id === def.division);

            const row = document.createElement('div');
            row.className = 'hr-fp-roster-row';
            row.addEventListener('click', () => {
                eventBus.emit('agent:selected', def);
            });

            // Avatar dot
            const avatar = document.createElement('div');
            avatar.className = 'hr-fp-roster-avatar';
            avatar.style.background = divInfo ? divInfo.color : '#4A90D9';

            // Name
            const name = document.createElement('div');
            name.className = 'hr-fp-roster-name';
            name.textContent = def.name || def.id;

            // Division tag
            const divTag = document.createElement('span');
            divTag.className = 'hr-fp-roster-div';
            divTag.textContent = divInfo ? divInfo.name : (def.division || '');

            // Status dot
            const statusDot = document.createElement('div');
            statusDot.className = 'hr-fp-roster-status';
            statusDot.style.background = AGENT_STATE_COLORS[state] || '#5DADE2';
            statusDot.title = state;

            // Tower badge
            const towerBadge = document.createElement('div');
            towerBadge.className = 'hr-fp-roster-tower';
            towerBadge.textContent = tower === 'right' ? 'R' : 'L';

            row.appendChild(avatar);
            row.appendChild(name);
            row.appendChild(divTag);
            row.appendChild(statusDot);
            row.appendChild(towerBadge);
            roster.appendChild(row);
        });

        container.appendChild(roster);
    }

    _renderActiveTasks(container, floorIndex) {
        const tl = this._taskLogger;
        // Get tasks for this floor from both towers
        const tasks = tl.getTasksByFloor(floorIndex);

        if (tasks.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'hr-fp-empty';
            empty.textContent = 'No active tasks on this floor';
            container.appendChild(empty);
            return;
        }

        tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'hr-fp-task-card';

            // Header: ID + Priority
            const header = document.createElement('div');
            header.className = 'hr-fp-task-header';

            const idEl = document.createElement('span');
            idEl.className = 'hr-fp-task-id';
            idEl.textContent = task.id;

            const priority = document.createElement('span');
            priority.className = 'hr-fp-task-priority ' + task.priority;
            priority.textContent = task.priority;

            header.appendChild(idEl);
            header.appendChild(priority);
            card.appendChild(header);

            // Title
            const title = document.createElement('div');
            title.className = 'hr-fp-task-title';
            title.textContent = task.title;
            card.appendChild(title);

            // Assigned agents
            if (task.assignedAgents.length > 0) {
                const agentsEl = document.createElement('div');
                agentsEl.className = 'hr-fp-task-agents';
                agentsEl.textContent = task.assignedAgents.join(', ');
                card.appendChild(agentsEl);
            }

            // Progress bar
            const progressTrack = document.createElement('div');
            progressTrack.className = 'hr-fp-task-progress';

            const progressFill = document.createElement('div');
            progressFill.className = 'hr-fp-task-progress-fill' + (task.progress >= 100 ? ' complete' : '');
            progressFill.style.width = task.progress + '%';

            progressTrack.appendChild(progressFill);
            card.appendChild(progressTrack);

            container.appendChild(card);
        });
    }

    _renderCompletedTasks(container, floorIndex) {
        const tl = this._taskLogger;
        const all = tl.getCompletedTasks(50);
        const tasks = all.filter(t => t.targetFloor === floorIndex).slice(-10).reverse();

        if (tasks.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'hr-fp-empty';
            empty.textContent = 'No completed tasks for this floor';
            container.appendChild(empty);
            return;
        }

        tasks.forEach(task => {
            const row = document.createElement('div');
            row.className = 'hr-fp-completed-row';

            const idEl = document.createElement('span');
            idEl.className = 'hr-fp-completed-id';
            idEl.textContent = task.id;

            const titleEl = document.createElement('span');
            titleEl.className = 'hr-fp-completed-title';
            titleEl.textContent = task.title;

            const durEl = document.createElement('span');
            durEl.className = 'hr-fp-completed-duration';
            durEl.textContent = this._formatDuration(task.duration);

            const resultEl = document.createElement('span');
            resultEl.className = 'hr-fp-completed-result ' + (task.status === 'failed' ? 'failed' : 'success');
            resultEl.textContent = task.status === 'failed' ? 'FAIL' : 'OK';

            row.appendChild(idEl);
            row.appendChild(titleEl);
            row.appendChild(durEl);
            row.appendChild(resultEl);
            container.appendChild(row);
        });
    }

    _formatDuration(ms) {
        if (!ms) return '-';
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}min`;
    }

    _formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return String(num);
    }

    _formatMetricLabel(key) {
        // camelCase -> TITLE CASE
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
    }

    // -----------------------------------------------------------------------
    // Knowledge Base Mini-Section
    // -----------------------------------------------------------------------

    _renderKBSection(panel, floorData) {
        const kb = this._knowledgeBase;
        const projectId = floorData.projectId;
        const recentEntries = kb.getRecentEntries(projectId, 3);

        const section = document.createElement('div');
        section.className = 'hr-fp-section';

        const titleRow = document.createElement('div');
        titleRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;';

        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'hr-fp-section-title';
        sectionTitle.style.marginBottom = '0';
        sectionTitle.textContent = 'KNOWLEDGE BASE';

        const viewAllBtn = document.createElement('span');
        viewAllBtn.style.cssText = 'font-size:9px;color:#4A90D9;cursor:pointer;text-transform:uppercase;letter-spacing:1px;';
        viewAllBtn.textContent = 'VIEW ALL';
        viewAllBtn.addEventListener('click', () => {
            eventBus.emit('kb:viewAll', { projectId });
        });

        titleRow.appendChild(sectionTitle);
        titleRow.appendChild(viewAllBtn);
        section.appendChild(titleRow);

        // Recent entries
        if (recentEntries.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'font-size:11px;color:#445566;font-style:italic;margin-bottom:10px;';
            empty.textContent = 'No knowledge entries yet';
            section.appendChild(empty);
        } else {
            recentEntries.forEach(entry => {
                const row = document.createElement('div');
                row.style.cssText = 'padding:4px 0;border-bottom:1px solid rgba(74,144,217,0.06);font-size:11px;';

                const typeTag = document.createElement('span');
                typeTag.style.cssText = 'font-size:9px;padding:1px 5px;border-radius:3px;background:rgba(74,144,217,0.1);color:#8899bb;margin-right:6px;text-transform:uppercase;letter-spacing:0.5px;';
                typeTag.textContent = entry.type;

                const content = document.createElement('span');
                content.style.color = '#a0b4d0';
                content.textContent = entry.content.length > 60 ? entry.content.slice(0, 60) + '...' : entry.content;

                row.appendChild(typeTag);
                row.appendChild(content);
                section.appendChild(row);
            });
        }

        // Add Note inline
        const addRow = document.createElement('div');
        addRow.style.cssText = 'display:flex;gap:6px;margin-top:8px;';

        const noteInput = document.createElement('input');
        noteInput.className = 'hr-fp-kb-input';
        noteInput.style.cssText = 'flex:1;padding:5px 8px;background:rgba(255,255,255,0.04);border:1px solid rgba(74,144,217,0.2);border-radius:3px;color:#e0e8f0;font-family:inherit;font-size:11px;outline:none;';
        noteInput.placeholder = 'Add a note...';

        const addBtn = document.createElement('button');
        addBtn.className = 'hr-fp-btn';
        addBtn.style.cssText = 'flex:none;padding:5px 10px;font-size:9px;';
        addBtn.textContent = 'ADD';
        addBtn.addEventListener('click', () => {
            const text = noteInput.value.trim();
            if (text) {
                kb.addEntry(projectId, { type: 'note', content: text, source: 'floorPanel' });
                noteInput.value = '';
                // Re-render to show new entry
                if (this._isOpen && this._currentFloor) {
                    this._render(this._currentFloor, this._currentProject);
                }
            }
        });
        noteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addBtn.click();
        });

        addRow.appendChild(noteInput);
        addRow.appendChild(addBtn);
        section.appendChild(addRow);

        panel.appendChild(section);
    }

    // -----------------------------------------------------------------------
    // Event Binding
    // -----------------------------------------------------------------------

    _bindEvents() {
        // ESC to close
        const keyHandler = (e) => {
            if (e.key === 'Escape' && this._isOpen) {
                this.hide();
            }
        };
        document.addEventListener('keydown', keyHandler);
        this._unsubscribers.push(() => document.removeEventListener('keydown', keyHandler));

        // Live-refresh tab content when tasks update
        const unsub2 = eventBus.on('tasklog:update', () => {
            if (this._isOpen && this._currentFloor && this._activeTab !== 'roster') {
                this._render(this._currentFloor, this._currentProject);
            }
        });
        this._unsubscribers.push(unsub2);

        // Live agent roster refresh - re-render roster when agent states change
        const unsub3 = eventBus.on('agent:stateChanged', () => {
            if (this._isOpen && this._currentFloor && this._activeTab === 'roster') {
                this._render(this._currentFloor, this._currentProject);
            }
        });
        this._unsubscribers.push(unsub3);

        // Update agent status dots without full re-render
        const unsub4 = eventBus.on('registry:statusChanged', ({ id, status }) => {
            if (this._isOpen && this._activeTab === 'roster') {
                // Lightweight: just update dots if roster is visible
                const dots = this._panel.querySelectorAll('.hr-fp-roster-status');
                dots.forEach(dot => {
                    if (dot.title === id) {
                        const stateColor = AGENT_STATE_COLORS[status] || '#5DADE2';
                        dot.style.background = stateColor;
                        dot.title = status;
                    }
                });
            }
        });
        this._unsubscribers.push(unsub4);

        // KB updates refresh
        const unsub5 = eventBus.on('kb:updated', () => {
            if (this._isOpen && this._currentFloor) {
                this._render(this._currentFloor, this._currentProject);
            }
        });
        this._unsubscribers.push(unsub5);

        // Listen for floor click from HUD sidebar

        const unsub1 = eventBus.on('hud:floorClick', ({ floorIndex, floor }) => {
            // Fetch project data if available
            let projectData = null;
            if (floor && floor.projectId) {
                const projects = stateManager.get('projects');
                if (projects) {
                    projectData = Array.isArray(projects)
                        ? projects.find(p => p.id === floor.projectId)
                        : projects[floor.projectId];
                }
            }
            this.show(floor, projectData);
        });
        this._unsubscribers.push(unsub1);
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Show the floor panel with data.
     * @param {object} floorData  - Floor definition (index, name, emoji, type, color, projectId)
     * @param {object|null} projectData - Project details (priority, status, techStack, description, metrics)
     */
    show(floorData, projectData) {
        if (!floorData) return;

        this._currentFloor = floorData;
        this._currentProject = projectData || null;

        // Close agent panel if open
        eventBus.emit('floorPanel:opening', { floorIndex: floorData.index });

        this._render(floorData, projectData);
        this._isOpen = true;

        // Trigger animation on next frame
        requestAnimationFrame(() => {
            this._panel.classList.add('open');
        });
    }

    /**
     * Hide the floor panel with slide-out animation.
     */
    hide() {
        this._isOpen = false;
        this._panel.classList.remove('open');
        eventBus.emit('floorPanel:closed');
    }

    /**
     * Update the panel content without re-opening.
     * @param {{ floorData?: object, projectData?: object }} data
     */
    update(data) {
        if (!this._isOpen) return;
        const floorData = data.floorData || this._currentFloor;
        const projectData = data.projectData || this._currentProject;
        if (floorData) {
            this._currentFloor = floorData;
            this._currentProject = projectData;
            this._render(floorData, projectData);
        }
    }

    /**
     * @returns {boolean}
     */
    get isOpen() {
        return this._isOpen;
    }

    /**
     * Clean up.
     */
    dispose() {
        this._unsubscribers.forEach(fn => { if (typeof fn === 'function') fn(); });
        this._unsubscribers = [];
        if (this._panel && this._panel.parentNode) {
            this._panel.parentNode.removeChild(this._panel);
        }
    }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _instance = null;

export function createFloorPanel(options) {
    if (!_instance) _instance = new FloorPanel(options);
    return _instance;
}

export default { FloorPanel, createFloorPanel };
