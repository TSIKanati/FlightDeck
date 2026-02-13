/**
 * ProjectAudit.js - Project website/codebase review dashboard
 * Shows all projects with their audit status, findings, and asset counts
 */

import { R } from '../shared/Renderer.js';

export class ProjectAudit {
    constructor(data, router, assetStore, taskStore, knowledge) {
        this._data = data;
        this._router = router;
        this._assets = assetStore;
        this._tasks = taskStore;
        this._knowledge = knowledge;
    }

    render() {
        const container = R.div('dash-main');

        // Header
        const header = R.div('dash-overview-header');
        header.appendChild(R.el('h2', { text: 'Project Audit & Review' }));
        header.appendChild(R.el('p', { text: `Review all ${this._data.projects.length} projects \u2014 websites, codebases, and assets` }));
        container.appendChild(header);

        // Summary stats
        const totals = this._assets.totalCounts();
        const stats = R.div('dash-stat-grid');
        stats.appendChild(R.statCard('Projects', this._data.projects.length, `${totals.projects} inventoried`));
        stats.appendChild(R.statCard('Total Pages', totals.htmlPages || 0, 'HTML files'));
        stats.appendChild(R.statCard('JS Modules', totals.jsModules || 0, 'JavaScript files'));
        stats.appendChild(R.statCard('Total Size', `${Math.round(totals.totalSizeMB || 0)}MB`, 'All assets'));
        container.appendChild(stats);

        // Project table
        container.appendChild(this._renderProjectTable());

        return container;
    }

    _renderProjectTable() {
        const sec = R.div('dash-section');
        sec.appendChild(R.div('dash-section-title', [R.text('All Projects')]));

        const table = R.el('table', { cls: 'dash-floor-table' });
        const thead = R.el('thead');
        const tr = R.el('tr');
        for (const h of ['Project', 'Priority', 'Domain', 'Tasks', 'KB', 'Status', 'Assets', 'Findings']) {
            tr.appendChild(R.el('th', { text: h }));
        }
        thead.appendChild(tr);
        table.appendChild(thead);

        const tbody = R.el('tbody');
        const sorted = [...this._data.projects].sort((a, b) => {
            const pa = parseInt((a.priority || 'P9').replace('P', ''));
            const pb = parseInt((b.priority || 'P9').replace('P', ''));
            return pa - pb;
        });

        for (const proj of sorted) {
            const assetData = this._assets.getProject(proj.id);
            const row = R.el('tr', {
                on: { click: () => this._router.navigate(`floor=${proj.id}`) }
            });

            // Project name with emoji
            row.appendChild(R.el('td', {
                children: [R.el('span', {
                    cls: 'dash-floor-table-name',
                    children: [
                        R.span('dash-floor-table-emoji', proj.emoji || ''),
                        R.text(proj.name)
                    ]
                })]
            }));

            // Priority
            row.appendChild(R.el('td', { children: [R.priorityBadge(proj.priority)] }));

            // Domain
            const domain = this._getDomain(proj.id);
            row.appendChild(R.el('td', {
                children: [domain ? R.el('a', {
                    cls: 'dash-link',
                    text: domain,
                    attrs: { href: `https://${domain}`, target: '_blank' }
                }) : R.text('-')]
            }));

            // Task count
            const taskStats = this._tasks ? this._tasks.projectStats(proj.id) : { total: 0 };
            row.appendChild(R.el('td', {
                text: taskStats.total > 0 ? `${taskStats.total} (${taskStats.locked || 0}\uD83D\uDD12)` : '-',
                style: { fontFamily: 'var(--hr-font-mono)', fontSize: '0.72rem' }
            }));

            // Knowledge base count
            const kbStats = this._knowledge ? this._knowledge.projectStats(proj.id) : { total: 0 };
            row.appendChild(R.el('td', {
                text: kbStats.total > 0 ? String(kbStats.total) : '-',
                style: { fontFamily: 'var(--hr-font-mono)' },
                on: kbStats.total > 0 ? { click: (e) => { e.stopPropagation(); this._router.navigate(`knowledge=${proj.id}`); } } : {}
            }));

            // Audit status
            const auditStatus = assetData?.status || 'pending';
            row.appendChild(R.el('td', {
                children: [R.el('span', {
                    cls: `dash-status dash-status-${auditStatus === 'reviewed' ? 'active' : auditStatus === 'in-review' ? 'development' : 'reserved'}`,
                    text: auditStatus
                })]
            }));

            // Asset count
            const assetCount = assetData?.assets ? Object.values(assetData.assets).reduce((s, v) => typeof v === 'number' ? s + v : s, 0) : 0;
            row.appendChild(R.el('td', { text: assetCount ? String(assetCount) : '-', style: { fontFamily: 'var(--hr-font-mono)' } }));

            // Findings count
            const findingsCount = assetData?.findings?.length || 0;
            row.appendChild(R.el('td', {
                children: [findingsCount > 0 ? R.el('span', {
                    cls: 'dash-status dash-status-development',
                    text: `${findingsCount} findings`
                }) : R.text('-')]
            }));

            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        sec.appendChild(table);

        // Domains needing audit
        sec.appendChild(this._renderDomainList());

        return sec;
    }

    _renderDomainList() {
        const domains = [
            { id: 'tsiapp', domain: 'translatorseries.com', desc: 'Hunting education platform' },
            { id: 'clieair', domain: 'clieair.com', desc: 'Civil Liberties AI Review' },
            { id: 'charitypats', domain: 'charitypats.com', desc: 'IP Protection & Charity' },
            { id: 'machinistzen', domain: 'machinistzen.com', desc: 'Machine Shop Monitoring' },
            { id: 'ideallearning', domain: 'ideallearning.net', desc: 'Free Education Platform' },
            { id: 'quantumledger', domain: 'quantumledgerbookkeeping.com', desc: 'AI Bookkeeping' },
            { id: 'realworldprizes', domain: 'realworldprizes.com', desc: 'Incentivized Gaming' },
            { id: 'urbot', domain: 'urbot.net', desc: 'Enterprise Command Center' }
        ];

        const sec = R.div('dash-section');
        sec.appendChild(R.div('dash-section-title', [R.text('Domain Inventory')]));

        const grid = R.div('dash-agent-grid');
        for (const d of domains) {
            const assetData = this._assets.getProject(d.id);
            const card = R.el('div', {
                cls: 'dash-agent-card',
                children: [
                    R.el('div', {
                        cls: 'dash-agent-card-avatar',
                        style: { background: assetData?.status === 'reviewed' ? 'var(--hr-success)' : 'var(--hr-accent)', fontSize: '0.7rem' },
                        children: [R.text(assetData?.status === 'reviewed' ? '\u2713' : '?')]
                    }),
                    R.div('dash-agent-card-body', [
                        R.div('dash-agent-card-name', [R.text(d.domain)]),
                        R.div('dash-agent-card-title', [R.text(d.desc)]),
                        R.div('dash-agent-card-meta', [
                            assetData?.assets?.totalSizeMB
                                ? R.span('dash-agent-card-tag', `${Math.round(assetData.assets.totalSizeMB)}MB`)
                                : null,
                            R.el('span', {
                                cls: `dash-status dash-status-${assetData?.status === 'reviewed' ? 'active' : 'reserved'}`,
                                text: assetData?.status || 'not audited'
                            })
                        ])
                    ])
                ]
            });
            grid.appendChild(card);
        }
        sec.appendChild(grid);
        return sec;
    }

    _getDomain(projectId) {
        const map = {
            tsiapp: 'translatorseries.com',
            clieair: 'clieair.com',
            charitypats: 'charitypats.com',
            machinistzen: 'machinistzen.com',
            ideallearning: 'ideallearning.net',
            quantumledger: 'quantumledgerbookkeeping.com',
            realworldprizes: 'realworldprizes.com',
            guestofhonor: null,
            onthewayhome: null,
            parlorgames: null,
            autozen: null,
            translatorstitan: null
        };
        return map[projectId] || null;
    }
}
