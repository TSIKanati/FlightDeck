/**
 * AssetInventory.js - Asset tracking per project
 * Detailed breakdown of files, sizes, repos, and findings
 */

import { R } from '../shared/Renderer.js';

export class AssetInventory {
    constructor(data, router, assetStore) {
        this._data = data;
        this._router = router;
        this._assets = assetStore;
    }

    render(projectId) {
        const container = R.div('dash-main');
        const project = this._data.getProject(projectId);
        const assetData = this._assets.getProject(projectId);

        if (!project) {
            container.appendChild(R.div('dash-empty', [
                R.div('dash-empty-icon', [R.text('\uD83D\uDD0D')]),
                R.div('dash-empty-text', [R.text(`Project "${projectId}" not found`)])
            ]));
            return container;
        }

        // Header
        const hdr = R.div('dash-floor-header');
        hdr.appendChild(R.el('div', {
            cls: 'dash-floor-header-emoji',
            style: { borderColor: project.color },
            children: [R.text(project.emoji || '')]
        }));
        const info = R.div('dash-floor-header-info');
        info.appendChild(R.el('h2', { text: `${project.name} Assets` }));
        info.appendChild(R.el('p', { text: project.description }));
        info.appendChild(R.div('dash-agent-card-meta', [
            R.priorityBadge(project.priority),
            R.statusBadge(project.status)
        ]));
        hdr.appendChild(info);
        container.appendChild(hdr);

        // Asset stats
        if (assetData?.assets) {
            const stats = R.div('dash-stat-grid');
            const a = assetData.assets;
            if (a.htmlPages) stats.appendChild(R.statCard('HTML Pages', a.htmlPages, 'Files'));
            if (a.jsModules) stats.appendChild(R.statCard('JS Modules', a.jsModules, 'Files'));
            if (a.cssFiles) stats.appendChild(R.statCard('CSS Files', a.cssFiles, 'Files'));
            if (a.images) stats.appendChild(R.statCard('Images', a.images, 'Files'));
            if (a.audioFiles) stats.appendChild(R.statCard('Audio Files', a.audioFiles, 'Files'));
            if (a.dataFiles) stats.appendChild(R.statCard('Data Files', a.dataFiles, 'Files'));
            if (a.totalSizeMB) stats.appendChild(R.statCard('Total Size', `${Math.round(a.totalSizeMB)}MB`, 'On disk'));
            container.appendChild(stats);
        } else {
            container.appendChild(R.div('dash-empty', [
                R.div('dash-empty-icon', [R.text('\uD83D\uDCE6')]),
                R.div('dash-empty-text', [R.text('No asset inventory yet. Run an audit to populate.')])
            ]));
        }

        // Tech stack
        if (project.techStack?.length) {
            const sec = R.div('dash-section');
            sec.appendChild(R.div('dash-section-title', [R.text('Tech Stack')]));
            const tags = R.div('dash-agent-card-meta');
            for (const tech of project.techStack) {
                tags.appendChild(R.span('dash-agent-card-tag', tech));
            }
            sec.appendChild(tags);
            container.appendChild(sec);
        }

        // Repository info
        if (assetData?.repo) {
            const sec = R.div('dash-section');
            sec.appendChild(R.div('dash-section-title', [R.text('Repository')]));
            sec.appendChild(R.el('a', {
                cls: 'dash-link',
                text: assetData.repo,
                attrs: { href: assetData.repo, target: '_blank' }
            }));
            container.appendChild(sec);
        }

        // Findings
        if (assetData?.findings?.length) {
            const sec = R.div('dash-section');
            sec.appendChild(R.div('dash-section-title', [R.text(`Findings (${assetData.findings.length})`)]));

            for (const f of assetData.findings) {
                const findingCard = R.div('dash-finding-card', [
                    R.div('dash-finding-header', [
                        R.el('span', {
                            cls: `dash-status dash-status-${f.severity === 'critical' ? 'production' : f.severity === 'warning' ? 'development' : 'reserved'}`,
                            text: f.severity || 'info'
                        }),
                        R.span('dash-finding-date', f.date || '')
                    ]),
                    R.el('p', { cls: 'dash-finding-text', text: f.description || f.text || '' })
                ]);
                sec.appendChild(findingCard);
            }
            container.appendChild(sec);
        }

        // Back link
        container.appendChild(R.el('a', {
            cls: 'dash-back-link',
            text: '\u2190 Back to Project Audit',
            attrs: { href: '#' },
            on: { click: (e) => { e.preventDefault(); this._router.navigate('audit'); } }
        }));

        return container;
    }
}
