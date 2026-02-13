/**
 * FloorNav.js - Left sidebar floor navigation
 * Groups floors into Enterprise, Social, and Project sections
 */

import { R } from '../shared/Renderer.js';

export class FloorNav {
    /**
     * @param {import('../shared/DataBridge.js').DataBridge} data
     * @param {import('../core/Router.js').Router} router
     */
    constructor(data, router) {
        this._data = data;
        this._router = router;
        this._el = null;
        this._activeFloor = null;
    }

    render() {
        // If we already have an element, just clear and rebuild its contents
        if (!this._el) {
            this._el = document.createElement('div');
            this._el.className = 'dash-sidebar';
        } else {
            R.clear(this._el);
        }

        const counts = this._data.agentCountsByFloor();

        // Group floors by type
        const enterprise = [];
        const social = [];
        const project = [];

        // Sort floors by index descending (top floors first)
        const sorted = [...this._data.floors].sort((a, b) => b.index - a.index);

        for (const f of sorted) {
            if (f.type === 'enterprise') enterprise.push(f);
            else if (f.type === 'social') social.push(f);
            else if (f.type === 'project') project.push(f);
        }

        // Enterprise Overview item
        const overviewItem = this._createItem(
            { emoji: '\uD83C\uDFE2', name: 'Enterprise Overview', index: null },
            this._data.agents.length,
            () => this._router.navigate('enterprise')
        );
        if (!this._activeFloor) overviewItem.classList.add('active');
        this._el.appendChild(overviewItem);

        if (enterprise.length) {
            this._el.appendChild(this._section('Enterprise', enterprise, counts));
        }
        if (social.length) {
            this._el.appendChild(this._section('Social', social, counts));
        }
        if (project.length) {
            this._el.appendChild(this._section('Projects', project, counts));
        }

        return this._el;
    }

    _section(title, floors, counts) {
        const sec = R.div('dash-sidebar-section');
        sec.appendChild(R.div('dash-sidebar-section-title', [R.text(title)]));

        for (const f of floors) {
            const count = counts.get(f.index) || 0;
            const item = this._createItem(f, count, () => {
                this._router.navigate(`floor=${f.id}`);
            });
            if (this._activeFloor === f.id) item.classList.add('active');
            sec.appendChild(item);
        }

        return sec;
    }

    _createItem(floor, count, onClick) {
        const label = floor.index !== null && floor.index !== undefined
            ? (floor.index < 0 ? `B${Math.abs(floor.index)}` : `F${floor.index}`)
            : '';

        const item = R.el('div', {
            cls: 'dash-floor-item',
            on: { click: onClick },
            children: [
                R.span('dash-floor-item-emoji', floor.emoji || ''),
                R.div('dash-floor-item-info', [
                    R.div('dash-floor-item-name', [R.text(floor.name)]),
                    label ? R.div('dash-floor-item-sub', [R.text(label)]) : null
                ]),
                R.span('dash-floor-item-count', String(count))
            ]
        });

        return item;
    }

    /** Highlight active floor - just re-renders contents in place */
    setActive(floorId) {
        this._activeFloor = floorId;
        if (!this._el) return;
        this.render(); // Safe: clears and re-populates the same element
    }
}
