/**
 * TowerCommsView.js - Full-page tower communications view
 * Shows message queue between Server Tower and Local Tower
 */

import { R } from '../shared/Renderer.js';
import { TowerComms } from '../components/TowerComms.js';

export class TowerCommsView {
    constructor(data, router, comms) {
        this._data = data;
        this._router = router;
        this._comms = comms;
    }

    render(projectId) {
        const container = R.div('dash-main');

        // Header
        const header = R.div('dash-overview-header');
        header.appendChild(R.el('h2', { text: 'Tower Communications' }));
        header.appendChild(R.el('p', {
            text: 'Server Tower (VPS @FullySailSally) \u2194 Local Tower (ASUS ProArt) \u2014 Cross-tower agent coordination and resource management'
        }));
        container.appendChild(header);

        // Stats
        const stats = this._comms.stats();
        const grid = R.div('dash-stat-grid');
        grid.appendChild(R.statCard('Total Messages', stats.total, ''));
        grid.appendChild(R.statCard('Pending', stats.pending, 'Awaiting response'));
        grid.appendChild(R.statCard('Spin-Up Requests', stats.spinUpRequests, 'Agent requests'));
        grid.appendChild(R.statCard('Acknowledged', stats.acknowledged, 'Completed'));
        container.appendChild(grid);

        // Comms panel
        const panelContainer = R.div('dash-section');
        const renderPanel = () => {
            R.clear(panelContainer);
            panelContainer.appendChild(TowerComms.renderPanel({
                comms: this._comms,
                project: projectId || null,
                projects: this._data.projects,
                data: this._data,
                onRefresh: () => renderPanel()
            }));
        };
        renderPanel();
        container.appendChild(panelContainer);

        return container;
    }
}
