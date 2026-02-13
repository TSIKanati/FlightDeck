/**
 * EnterpriseView.js - Cross-floor enterprise overview (default view)
 * Shows totals, floor table, clearance distribution, task summary
 */

import { R } from '../shared/Renderer.js';
import { GradeWidget } from '../components/GradeWidget.js';

export class EnterpriseView {
    constructor(data, router, taskStore, gradeStore, knowledge, comms) {
        this._data = data;
        this._router = router;
        this._tasks = taskStore;
        this._grades = gradeStore;
        this._knowledge = knowledge;
        this._comms = comms;
    }

    render() {
        const container = R.div('dash-main');
        const counts = this._data.agentCountsByFloor();

        // Header
        const header = R.div('dash-overview-header');
        header.appendChild(R.el('h2', { text: 'Enterprise Overview' }));
        header.appendChild(R.el('p', { text: `TSI Enterprise Command Center \u2014 ${this._data.agents.length} agents across ${this._data.floors.length} floors` }));
        container.appendChild(header);

        // Stat cards
        const taskStats = this._tasks ? this._tasks.stats() : { total: 0, 'in-progress': 0 };
        const gradeCount = this._grades ? this._grades.getAll().length : 0;

        const kbCount = this._knowledge ? this._knowledge.getAll().length : 0;
        const commsStats = this._comms ? this._comms.stats() : { total: 0, pending: 0 };

        const stats = R.div('dash-stat-grid');
        stats.appendChild(R.statCard('Total Agents', this._data.agents.length, `${this._data.floors.length} floors`));
        stats.appendChild(R.statCard('Projects', this._data.projects.length, this._countByStatus()));
        stats.appendChild(R.statCard('Active Tasks', taskStats['in-progress'] + (taskStats.review || 0), `${taskStats.total} total`));
        stats.appendChild(R.statCard('Reviews', gradeCount, 'Performance evaluations'));
        stats.appendChild(R.statCard('Knowledge Base', kbCount, 'Entries across projects'));
        stats.appendChild(R.statCard('Tower Comms', commsStats.total, commsStats.pending > 0 ? `${commsStats.pending} pending` : 'All acknowledged'));
        container.appendChild(stats);

        // Clearance distribution
        container.appendChild(this._clearanceSection());

        // Floor table
        container.appendChild(this._floorTableSection(counts));

        return container;
    }

    _countByStatus() {
        const sc = {};
        for (const p of this._data.projects) {
            sc[p.status] = (sc[p.status] || 0) + 1;
        }
        return Object.entries(sc).map(([k, v]) => `${v} ${k}`).join(', ');
    }

    _clearanceSection() {
        const sec = R.div('dash-section');
        sec.appendChild(R.div('dash-section-title', [R.text('Clearance Distribution')]));

        const clearanceCounts = { alpha: 0, beta: 0, gamma: 0, delta: 0 };
        for (const a of this._data.agents) {
            const c = a.securityClearance;
            if (c && clearanceCounts[c] !== undefined) clearanceCounts[c]++;
        }
        const total = this._data.agents.length;
        const colors = { alpha: '#ffd700', beta: '#3c8cff', gamma: '#2ecc71', delta: '#95a5a6' };

        const bars = R.el('div');
        for (const [level, count] of Object.entries(clearanceCounts)) {
            bars.appendChild(R.metricBar(
                level.toUpperCase(),
                count,
                total,
                colors[level]
            ));
        }
        sec.appendChild(bars);
        return sec;
    }

    _floorTableSection(counts) {
        const sec = R.div('dash-section');
        sec.appendChild(R.div('dash-section-title', [R.text('All Floors')]));

        const table = R.el('table', { cls: 'dash-floor-table' });

        // Header
        const thead = R.el('thead');
        const tr = R.el('tr');
        for (const h of ['Floor', 'Name', 'Agents', 'Tasks', 'Avg Grade', 'Project', 'Status']) {
            tr.appendChild(R.el('th', { text: h }));
        }
        thead.appendChild(tr);
        table.appendChild(thead);

        // Body - sorted by index descending
        const tbody = R.el('tbody');
        const sorted = [...this._data.floors].sort((a, b) => b.index - a.index);

        for (const f of sorted) {
            const row = R.el('tr', {
                on: { click: () => this._router.navigate(`floor=${f.id}`) }
            });

            // Floor number
            const indexLabel = f.index < 0 ? `B${Math.abs(f.index)}` : `F${f.index}`;
            row.appendChild(R.el('td', {
                children: [R.el('span', {
                    text: indexLabel,
                    style: { fontFamily: 'var(--hr-font-mono)', fontWeight: '600' }
                })]
            }));

            // Name with emoji
            row.appendChild(R.el('td', {
                children: [R.el('span', {
                    cls: 'dash-floor-table-name',
                    children: [
                        R.span('dash-floor-table-emoji', f.emoji || ''),
                        R.text(f.name)
                    ]
                })]
            }));

            // Agent count
            const count = counts.get(f.index) || 0;
            row.appendChild(R.el('td', {
                children: [R.el('span', {
                    text: String(count),
                    style: { fontFamily: 'var(--hr-font-mono)', fontWeight: '600' }
                })]
            }));

            // Task count
            const floorTasks = this._tasks ? this._tasks.floorStats(f.index) : { total: 0 };
            row.appendChild(R.el('td', {
                text: floorTasks.total > 0 ? String(floorTasks.total) : '-',
                style: { fontFamily: 'var(--hr-font-mono)' }
            }));

            // Floor grade
            const floorGrade = this._grades ? this._grades.floorAverageGrade(f.index) : null;
            row.appendChild(R.el('td', {
                children: [floorGrade
                    ? GradeWidget.renderBadge(floorGrade.grade, floorGrade.averageScore)
                    : R.span('dash-grade-badge dash-grade-none', '--')]
            }));

            // Project
            const project = this._data.getProjectByFloor(f.index);
            if (project) {
                row.appendChild(R.el('td', {
                    children: [R.priorityBadge(project.priority)]
                }));
                row.appendChild(R.el('td', {
                    children: [R.statusBadge(project.status)]
                }));
            } else {
                row.appendChild(R.el('td', { text: f.type === 'enterprise' ? '\u2014' : '' }));
                row.appendChild(R.el('td', { text: '' }));
            }

            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        sec.appendChild(table);
        return sec;
    }
}
