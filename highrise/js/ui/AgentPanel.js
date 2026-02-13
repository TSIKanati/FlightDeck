/**
 * AgentPanel.js - Agent Detail Overlay Panel for The Highrise
 * TSI Enterprise 3D Command Center
 *
 * Slides in from the right when an agent is selected.
 * Shows agent identity, status, location, capabilities,
 * activity log, connections, and action buttons.
 *
 * All DOM elements created programmatically. CSS classes use 'hr-' prefix.
 */

import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';
import { agentMetrics as defaultAgentMetrics } from '../core/AgentMetrics.js';
import { knowledgeBase as defaultKnowledgeBase } from '../core/KnowledgeBase.js';

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
    active:     { color: '#2ECC71', label: 'ACTIVE',    glow: 'rgba(46,204,113,0.5)' },
    idle:       { color: '#F39C12', label: 'IDLE',      glow: 'rgba(243,156,18,0.5)' },
    'on-demand':{ color: '#3498DB', label: 'ON-DEMAND', glow: 'rgba(52,152,219,0.5)' },
    offline:    { color: '#95A5A6', label: 'OFFLINE',   glow: 'none' },
    busy:       { color: '#E74C3C', label: 'BUSY',      glow: 'rgba(231,76,60,0.5)' },
    error:      { color: '#C0392B', label: 'ERROR',     glow: 'rgba(192,57,43,0.5)' },
};

// ---------------------------------------------------------------------------
// Floor name lookup
// ---------------------------------------------------------------------------

const FLOOR_NAMES = {
    '-2': 'POWER STATION', '-1': 'TEST BUNKER',
    '1': 'LOBBY', '2': 'WATER COOLER', '3': 'ONBOARDING EXPO',
    '4': 'TranslatorsTitan', '5': 'MachinistZen', '6': 'RealWorldPrizes',
    '7': 'QuantumLedger', '8': 'ParlorGames', '9': 'OnTheWayHome',
    '10': 'AutoZen', '11': 'IdealLearning', '12': 'GuestOfHonor',
    '13': 'CharityPats', '14': 'CLIEAIR', '15': 'TSIAPP',
    '16': 'ENTERPRISE FINANCE', '17': 'ENTERPRISE R&D', '18': 'ENTERPRISE LEGAL',
    '19': 'ENTERPRISE SECURITY', '20': 'OBSERVATION DECK',
};

const DIVISION_NAMES = {
    marketing: 'Marketing', rnd: 'R&D', testing: 'Testing',
    production: 'Production', security: 'Security', legal: 'Legal',
    accounting: 'Accounting', meeting: 'Meeting Room',
};

// ---------------------------------------------------------------------------
// Style injection
// ---------------------------------------------------------------------------

function _injectStyles() {
    if (document.getElementById('hr-agent-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'hr-agent-panel-styles';
    style.textContent = `
        .hr-agent-panel {
            position: fixed;
            top: 44px;
            right: 0;
            bottom: 40px;
            width: 380px;
            background: rgba(10,15,30,0.92);
            border-left: 1px solid rgba(74,144,217,0.3);
            backdrop-filter: blur(12px);
            z-index: 65;
            transform: translateX(100%);
            transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
            overflow-y: auto;
            overflow-x: hidden;
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            color: #c0d0e8;
            scrollbar-width: thin;
            scrollbar-color: rgba(74,144,217,0.3) transparent;
        }
        .hr-agent-panel::-webkit-scrollbar { width: 4px; }
        .hr-agent-panel::-webkit-scrollbar-track { background: transparent; }
        .hr-agent-panel::-webkit-scrollbar-thumb { background: rgba(74,144,217,0.3); border-radius: 2px; }
        .hr-agent-panel.open {
            transform: translateX(0);
        }

        /* Agent header */
        .hr-ap-header {
            padding: 24px 20px 16px;
            border-bottom: 1px solid rgba(74,144,217,0.15);
            display: flex;
            align-items: flex-start;
            gap: 16px;
        }
        .hr-ap-close {
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
            z-index: 2;
        }
        .hr-ap-close:hover {
            background: rgba(231,76,60,0.2);
            color: #E74C3C;
        }

        /* Avatar */
        .hr-ap-avatar {
            width: 56px;
            height: 56px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 700;
            color: #fff;
            flex-shrink: 0;
            position: relative;
        }
        .hr-ap-avatar-ring {
            position: absolute;
            inset: -3px;
            border-radius: 50%;
            border: 2px solid transparent;
            animation: hr-avatar-pulse 2s ease-in-out infinite;
        }
        @keyframes hr-avatar-pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
        }

        .hr-ap-identity {
            flex: 1;
            min-width: 0;
        }
        .hr-ap-name {
            font-size: 18px;
            font-weight: 700;
            color: #e0e8f0;
            margin-bottom: 2px;
        }
        .hr-ap-role {
            font-size: 11px;
            color: #8899aa;
            margin-bottom: 6px;
        }
        .hr-ap-model {
            font-size: 10px;
            color: #556677;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        /* Status badge */
        .hr-ap-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 3px 10px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.5px;
        }
        .hr-ap-status-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
        }

        /* Section */
        .hr-ap-section {
            padding: 14px 20px;
            border-bottom: 1px solid rgba(74,144,217,0.1);
        }
        .hr-ap-section-title {
            font-size: 10px;
            letter-spacing: 2px;
            color: #4A90D9;
            text-transform: uppercase;
            margin-bottom: 10px;
        }

        /* Location */
        .hr-ap-location {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 12px;
        }
        .hr-ap-location-icon {
            font-size: 16px;
        }
        .hr-ap-location-detail {
            color: #a0b4d0;
        }
        .hr-ap-location-sub {
            color: #556677;
            font-size: 10px;
        }

        /* Capabilities */
        .hr-ap-caps {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .hr-ap-cap-tag {
            padding: 3px 10px;
            background: rgba(74,144,217,0.08);
            border: 1px solid rgba(74,144,217,0.2);
            border-radius: 12px;
            font-size: 10px;
            color: #8899bb;
        }

        /* Activity log */
        .hr-ap-log-item {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 6px 0;
            border-bottom: 1px solid rgba(255,255,255,0.03);
            font-size: 11px;
        }
        .hr-ap-log-item:last-child {
            border-bottom: none;
        }
        .hr-ap-log-time {
            color: #445566;
            font-size: 9px;
            white-space: nowrap;
            padding-top: 2px;
            min-width: 55px;
        }
        .hr-ap-log-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            margin-top: 5px;
            flex-shrink: 0;
        }
        .hr-ap-log-msg {
            color: #a0b4d0;
            flex: 1;
        }

        /* Connections */
        .hr-ap-conn-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 5px 0;
            font-size: 11px;
        }
        .hr-ap-conn-dot {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            color: #fff;
            flex-shrink: 0;
        }
        .hr-ap-conn-name {
            color: #a0b4d0;
        }
        .hr-ap-conn-type {
            margin-left: auto;
            font-size: 9px;
            color: #556677;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Action buttons */
        .hr-ap-actions {
            display: flex;
            gap: 8px;
            padding: 16px 20px;
        }
        .hr-ap-btn {
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
        .hr-ap-btn:hover {
            background: rgba(74,144,217,0.18);
            border-color: rgba(74,144,217,0.5);
        }
        .hr-ap-btn.primary {
            background: rgba(74,144,217,0.2);
            color: #e0e8f0;
        }
    `;
    document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// AgentPanel class
// ---------------------------------------------------------------------------

export class AgentPanel {
    constructor({ agentMetrics, knowledgeBase } = {}) {
        this._panel = null;
        this._isOpen = false;
        this._currentAgent = null;
        this._activityLog = new Map(); // agentId -> [{time, message, color}]
        this._unsubscribers = [];
        this._agentMetrics = agentMetrics || defaultAgentMetrics;
        this._knowledgeBase = knowledgeBase || defaultKnowledgeBase;

        _injectStyles();
        this._build();
        this._bindEvents();
    }

    // -----------------------------------------------------------------------
    // DOM Construction
    // -----------------------------------------------------------------------

    _build() {
        this._panel = document.createElement('div');
        this._panel.className = 'hr-agent-panel';
        this._panel.id = 'hr-agent-panel';
        document.body.appendChild(this._panel);
    }

    _render(agent) {
        const panel = this._panel;
        panel.innerHTML = '';

        const avatarColor = agent.avatar || '#4A90D9';
        const statusKey = agent.runtimeStatus || agent.status || 'idle';
        const sc = STATUS_CONFIG[statusKey] || STATUS_CONFIG.idle;

        // ---- Header with avatar ----
        const header = document.createElement('div');
        header.className = 'hr-ap-header';
        header.style.position = 'relative';

        const closeBtn = document.createElement('div');
        closeBtn.className = 'hr-ap-close';
        closeBtn.textContent = '\u2715';
        closeBtn.addEventListener('click', () => this.hide());
        header.appendChild(closeBtn);

        // Avatar circle
        const avatar = document.createElement('div');
        avatar.className = 'hr-ap-avatar';
        avatar.style.background = avatarColor;
        avatar.textContent = (agent.name || '?')[0].toUpperCase();

        // Animated ring
        const ring = document.createElement('div');
        ring.className = 'hr-ap-avatar-ring';
        ring.style.borderColor = sc.color;
        if (statusKey === 'offline') ring.style.animation = 'none';
        avatar.appendChild(ring);

        // Identity block
        const identity = document.createElement('div');
        identity.className = 'hr-ap-identity';

        const nameEl = document.createElement('div');
        nameEl.className = 'hr-ap-name';
        nameEl.textContent = agent.name || 'Unknown Agent';

        const roleEl = document.createElement('div');
        roleEl.className = 'hr-ap-role';
        roleEl.textContent = agent.role || '';

        const modelEl = document.createElement('div');
        modelEl.className = 'hr-ap-model';
        modelEl.textContent = agent.model || '';

        // Status badge
        const statusBadge = document.createElement('div');
        statusBadge.className = 'hr-ap-status';
        statusBadge.style.cssText = `background:${sc.color}18;border:1px solid ${sc.color}44;color:${sc.color};margin-top:8px;`;

        const statusDot = document.createElement('div');
        statusDot.className = 'hr-ap-status-dot';
        statusDot.style.cssText = `background:${sc.color};box-shadow:0 0 6px ${sc.glow};`;

        const statusLabel = document.createElement('span');
        statusLabel.textContent = sc.label;

        statusBadge.appendChild(statusDot);
        statusBadge.appendChild(statusLabel);

        identity.appendChild(nameEl);
        identity.appendChild(roleEl);
        identity.appendChild(modelEl);
        identity.appendChild(statusBadge);

        header.appendChild(avatar);
        header.appendChild(identity);
        panel.appendChild(header);

        // ---- Current Location ----
        if (agent.floor !== undefined) {
            const locSection = document.createElement('div');
            locSection.className = 'hr-ap-section';

            const locTitle = document.createElement('div');
            locTitle.className = 'hr-ap-section-title';
            locTitle.textContent = 'CURRENT LOCATION';
            locSection.appendChild(locTitle);

            const locRow = document.createElement('div');
            locRow.className = 'hr-ap-location';

            const locIcon = document.createElement('span');
            locIcon.className = 'hr-ap-location-icon';
            locIcon.textContent = '\uD83D\uDCCD';

            const locText = document.createElement('div');

            const locFloor = document.createElement('div');
            locFloor.className = 'hr-ap-location-detail';
            const floorName = FLOOR_NAMES[String(agent.floor)] || `Floor ${agent.floor}`;
            locFloor.textContent = floorName;

            const locDiv = document.createElement('div');
            locDiv.className = 'hr-ap-location-sub';
            locDiv.textContent = agent.division
                ? (DIVISION_NAMES[agent.division] || agent.division) + ' Division'
                : 'Unassigned';

            if (agent.tower) {
                const towerEl = document.createElement('div');
                towerEl.className = 'hr-ap-location-sub';
                towerEl.textContent = agent.tower === 'right' ? 'Server Tower' : 'Local Tower';
                locText.appendChild(towerEl);
            }

            locText.appendChild(locFloor);
            locText.appendChild(locDiv);
            locRow.appendChild(locIcon);
            locRow.appendChild(locText);
            locSection.appendChild(locRow);
            panel.appendChild(locSection);
        }

        // ---- Description ----
        if (agent.description) {
            const descSection = document.createElement('div');
            descSection.className = 'hr-ap-section';

            const descTitle = document.createElement('div');
            descTitle.className = 'hr-ap-section-title';
            descTitle.textContent = 'DESCRIPTION';
            descSection.appendChild(descTitle);

            const descText = document.createElement('div');
            descText.style.cssText = 'font-size:12px;color:#8899aa;line-height:1.5;';
            descText.textContent = agent.description;
            descSection.appendChild(descText);
            panel.appendChild(descSection);
        }

        // ---- Capabilities ----
        const capabilities = this._deriveCapabilities(agent);
        if (capabilities.length) {
            const capSection = document.createElement('div');
            capSection.className = 'hr-ap-section';

            const capTitle = document.createElement('div');
            capTitle.className = 'hr-ap-section-title';
            capTitle.textContent = 'CAPABILITIES';
            capSection.appendChild(capTitle);

            const capWrap = document.createElement('div');
            capWrap.className = 'hr-ap-caps';
            capabilities.forEach(cap => {
                const tag = document.createElement('span');
                tag.className = 'hr-ap-cap-tag';
                tag.textContent = cap;
                capWrap.appendChild(tag);
            });
            capSection.appendChild(capWrap);
            panel.appendChild(capSection);
        }

        // ---- Activity Log ----
        const logEntries = this._getActivityLog(agent.id);
        const logSection = document.createElement('div');
        logSection.className = 'hr-ap-section';

        const logTitle = document.createElement('div');
        logTitle.className = 'hr-ap-section-title';
        logTitle.textContent = 'ACTIVITY LOG';
        logSection.appendChild(logTitle);

        if (logEntries.length === 0) {
            const noLog = document.createElement('div');
            noLog.style.cssText = 'font-size:11px;color:#445566;font-style:italic;';
            noLog.textContent = 'No recent activity recorded';
            logSection.appendChild(noLog);
        } else {
            logEntries.slice(-5).reverse().forEach(entry => {
                const item = document.createElement('div');
                item.className = 'hr-ap-log-item';

                const time = document.createElement('span');
                time.className = 'hr-ap-log-time';
                time.textContent = this._formatTime(entry.time);

                const dot = document.createElement('div');
                dot.className = 'hr-ap-log-dot';
                dot.style.background = entry.color || '#4A90D9';

                const msg = document.createElement('span');
                msg.className = 'hr-ap-log-msg';
                msg.textContent = entry.message;

                item.appendChild(time);
                item.appendChild(dot);
                item.appendChild(msg);
                logSection.appendChild(item);
            });
        }
        panel.appendChild(logSection);

        // ---- Connections ----
        const connections = this._getConnections(agent.id);
        if (connections.length) {
            const connSection = document.createElement('div');
            connSection.className = 'hr-ap-section';

            const connTitle = document.createElement('div');
            connTitle.className = 'hr-ap-section-title';
            connTitle.textContent = 'CONNECTIONS';
            connSection.appendChild(connTitle);

            connections.forEach(conn => {
                const item = document.createElement('div');
                item.className = 'hr-ap-conn-item';

                const dot = document.createElement('div');
                dot.className = 'hr-ap-conn-dot';
                dot.style.background = conn.color || '#4A90D9';
                dot.textContent = (conn.name || '?')[0].toUpperCase();

                const name = document.createElement('span');
                name.className = 'hr-ap-conn-name';
                name.textContent = conn.name || conn.id;

                const type = document.createElement('span');
                type.className = 'hr-ap-conn-type';
                type.textContent = conn.type || 'link';

                item.appendChild(dot);
                item.appendChild(name);
                item.appendChild(type);

                item.style.cursor = 'pointer';
                item.addEventListener('click', () => {
                    eventBus.emit('agentPanel:selectAgent', { agentId: conn.id });
                });

                connSection.appendChild(item);
            });
            panel.appendChild(connSection);
        }

        // ---- Performance Metrics ----
        this._renderPerformanceSection(panel, agent);

        // ---- Action Buttons ----
        const actions = document.createElement('div');
        actions.className = 'hr-ap-actions';

        const btnReassign = this._createButton('Reassign');
        btnReassign.addEventListener('click', () => {
            eventBus.emit('agentPanel:reassign', { agentId: agent.id });
        });

        const btnHistory = this._createButton('View History');
        btnHistory.addEventListener('click', () => {
            eventBus.emit('agentPanel:viewHistory', { agentId: agent.id });
        });

        const btnCommand = this._createButton('Send Command', 'primary');
        btnCommand.addEventListener('click', () => {
            eventBus.emit('agentPanel:sendCommand', { agentId: agent.id });
        });

        actions.appendChild(btnReassign);
        actions.appendChild(btnHistory);
        actions.appendChild(btnCommand);
        panel.appendChild(actions);
    }

    _createButton(text, variant) {
        const btn = document.createElement('button');
        btn.className = 'hr-ap-btn' + (variant ? ` ${variant}` : '');
        btn.textContent = text;
        return btn;
    }

    _deriveCapabilities(agent) {
        const caps = [];
        const role = (agent.role || '').toLowerCase();
        const desc = (agent.description || '').toLowerCase();
        const combined = role + ' ' + desc;

        if (combined.includes('frontend'))    caps.push('Frontend');
        if (combined.includes('backend') || combined.includes('server'))  caps.push('Backend');
        if (combined.includes('deploy'))      caps.push('Deployment');
        if (combined.includes('code'))        caps.push('Code Generation');
        if (combined.includes('ai') || combined.includes('llm'))  caps.push('AI/ML');
        if (combined.includes('test'))        caps.push('Testing');
        if (combined.includes('review'))      caps.push('Code Review');
        if (combined.includes('security'))    caps.push('Security');
        if (combined.includes('refactor'))    caps.push('Refactoring');
        if (combined.includes('full-stack') || combined.includes('full stack'))  caps.push('Full-Stack');
        if (combined.includes('telegram'))    caps.push('Messaging');
        if (combined.includes('sync'))        caps.push('Sync');
        if (combined.includes('autonomous'))  caps.push('Autonomous');
        if (combined.includes('rapid') || combined.includes('fast'))  caps.push('Rapid Execution');
        if (combined.includes('coach') || combined.includes('feedback'))  caps.push('Coaching');
        if (combined.includes('game') || combined.includes('xp'))  caps.push('Gamification');
        if (combined.includes('community') || combined.includes('social'))  caps.push('Community');
        if (combined.includes('conservation'))caps.push('Conservation');
        if (combined.includes('sponsor'))     caps.push('Sponsorship');

        // Always add at least one
        if (caps.length === 0) caps.push('General');
        return caps;
    }

    _getActivityLog(agentId) {
        if (!this._activityLog.has(agentId)) {
            // Generate seed activity for demo purposes
            const now = Date.now();
            const seed = [
                { time: now - 300000, message: 'Agent initialized', color: '#4A90D9' },
                { time: now - 180000, message: 'Status check completed', color: '#2ECC71' },
                { time: now - 60000,  message: 'Awaiting task assignment', color: '#F39C12' },
            ];
            this._activityLog.set(agentId, seed);
        }
        return this._activityLog.get(agentId);
    }

    _getConnections(agentId) {
        const conns = stateManager.get('connections') || [];
        const connList = Array.isArray(conns) ? conns : (conns.connections || []);
        const results = [];

        const agents = stateManager.get('agents') || {};

        connList.forEach(c => {
            let otherId = null;
            if (c.from === agentId) otherId = c.to;
            else if (c.to === agentId) otherId = c.from;

            if (otherId) {
                const other = agents[otherId] || {};
                results.push({
                    id: otherId,
                    name: other.name || otherId,
                    color: other.avatar || c.color || '#4A90D9',
                    type: c.type || 'link',
                });
            }
        });
        return results;
    }

    _formatTime(ts) {
        const d = new Date(ts);
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
    }

    // -----------------------------------------------------------------------
    // Performance Section
    // -----------------------------------------------------------------------

    _renderPerformanceSection(panel, agent) {
        const stats = this._agentMetrics.getAgentStats(agent.id);

        const section = document.createElement('div');
        section.className = 'hr-ap-section';

        const title = document.createElement('div');
        title.className = 'hr-ap-section-title';
        title.textContent = 'PERFORMANCE';
        section.appendChild(title);

        // Stats grid
        const grid = document.createElement('div');
        grid.className = 'hr-ap-perf-grid';

        const statItems = [
            { label: 'COMPLETED', value: stats.completed, color: '#2ECC71' },
            { label: 'SUCCESS RATE', value: stats.successRate + '%', color: '#3498DB' },
            { label: 'AVG DURATION', value: this._formatDuration(stats.avgDuration), color: '#F39C12' },
            { label: 'STREAK', value: stats.streak, color: '#9B59B6' },
        ];

        statItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'hr-ap-perf-card';

            const val = document.createElement('div');
            val.className = 'hr-ap-perf-value';
            val.style.color = item.color;
            val.textContent = item.value;

            const lbl = document.createElement('div');
            lbl.className = 'hr-ap-perf-label';
            lbl.textContent = item.label;

            card.appendChild(val);
            card.appendChild(lbl);
            grid.appendChild(card);
        });

        section.appendChild(grid);

        // Mini bar chart of last 10 task durations
        if (stats.recentDurations && stats.recentDurations.length > 0) {
            const chartWrap = document.createElement('div');
            chartWrap.className = 'hr-ap-perf-chart';

            const maxDur = Math.max(1, ...stats.recentDurations);
            stats.recentDurations.forEach(dur => {
                const bar = document.createElement('div');
                bar.className = 'hr-ap-perf-bar';
                bar.style.height = `${Math.max(2, (dur / maxDur) * 30)}px`;
                bar.title = this._formatDuration(dur);
                chartWrap.appendChild(bar);
            });

            section.appendChild(chartWrap);
        }

        // Top Skills based on task type frequency
        if (stats.taskTypes && Object.keys(stats.taskTypes).length > 0) {
            const skillsWrap = document.createElement('div');
            skillsWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;';
            const sorted = Object.entries(stats.taskTypes).sort((a, b) => b[1] - a[1]).slice(0, 5);
            sorted.forEach(([type, count]) => {
                const tag = document.createElement('span');
                tag.className = 'hr-ap-cap-tag';
                tag.textContent = `${type} (${count})`;
                skillsWrap.appendChild(tag);
            });
            section.appendChild(skillsWrap);
        }

        // Cross-tower indicator
        if (agent.tower) {
            const crossInfo = document.createElement('div');
            crossInfo.style.cssText = 'margin-top:8px;font-size:10px;color:#556677;';
            crossInfo.textContent = agent.tower === 'right'
                ? 'Server Tower Agent - may have counterparts on Local Tower'
                : 'Local Tower Agent - may have counterparts on Server Tower';
            section.appendChild(crossInfo);
        }

        panel.appendChild(section);
    }

    _formatDuration(ms) {
        if (!ms) return '0s';
        if (ms < 1000) return `${Math.round(ms)}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}min`;
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

        // Close when floor panel opens
        const unsub1 = eventBus.on('floorPanel:opening', () => {
            if (this._isOpen) this.hide();
        });
        this._unsubscribers.push(unsub1);

        // Track agent status changes for activity log
        const unsub2 = eventBus.on('registry:statusChanged', ({ id, status, old }) => {
            if (!this._activityLog.has(id)) {
                this._activityLog.set(id, []);
            }
            const log = this._activityLog.get(id);
            const sc = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
            log.push({
                time: Date.now(),
                message: `Status: ${old || 'unknown'} -> ${status}`,
                color: sc.color,
            });
            // Keep last 20
            if (log.length > 20) {
                this._activityLog.set(id, log.slice(-20));
            }
            // Re-render if viewing this agent
            if (this._isOpen && this._currentAgent && this._currentAgent.id === id) {
                this._currentAgent.runtimeStatus = status;
                this._render(this._currentAgent);
            }
        });
        this._unsubscribers.push(unsub2);

        // Agent selection from other UI components
        const unsub3 = eventBus.on('agentPanel:selectAgent', ({ agentId }) => {
            const agents = stateManager.get('agents') || {};
            const agent = agents[agentId];
            if (agent) this.show(agent);
        });
        this._unsubscribers.push(unsub3);
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Show the agent panel with agent data.
     * @param {object} agentData - Agent record from AgentRegistry
     */
    show(agentData) {
        if (!agentData) return;

        this._currentAgent = agentData;

        // Close floor panel if open
        eventBus.emit('agentPanel:opening', { agentId: agentData.id });

        this._render(agentData);
        this._isOpen = true;

        requestAnimationFrame(() => {
            this._panel.classList.add('open');
        });
    }

    /**
     * Hide the agent panel with slide-out animation.
     */
    hide() {
        this._isOpen = false;
        this._panel.classList.remove('open');
        eventBus.emit('agentPanel:closed');
    }

    /**
     * Update the displayed agent status without re-opening.
     * @param {string} status - New status key
     */
    updateStatus(status) {
        if (!this._isOpen || !this._currentAgent) return;
        this._currentAgent.runtimeStatus = status;
        this._render(this._currentAgent);
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

export function createAgentPanel() {
    if (!_instance) _instance = new AgentPanel();
    return _instance;
}

export default { AgentPanel, createAgentPanel };
