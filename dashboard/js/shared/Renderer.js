/**
 * Renderer.js - DOM rendering utilities for TSI Dashboard
 * Lightweight helpers for programmatic DOM creation
 */

export const R = {
    /**
     * Create an element with optional classes, attributes, and children
     * @param {string} tag
     * @param {object} opts - { cls, attrs, text, html, children, style, on }
     * @returns {HTMLElement}
     */
    el(tag, opts = {}) {
        const el = document.createElement(tag);

        if (opts.cls) {
            const classes = Array.isArray(opts.cls) ? opts.cls : opts.cls.split(' ');
            el.classList.add(...classes.filter(Boolean));
        }
        if (opts.attrs) {
            for (const [k, v] of Object.entries(opts.attrs)) {
                el.setAttribute(k, v);
            }
        }
        if (opts.text !== undefined) el.textContent = opts.text;
        if (opts.html !== undefined) el.innerHTML = opts.html;
        if (opts.style) Object.assign(el.style, opts.style);
        if (opts.on) {
            for (const [evt, fn] of Object.entries(opts.on)) {
                el.addEventListener(evt, fn);
            }
        }
        if (opts.children) {
            for (const child of opts.children) {
                if (child) el.appendChild(child);
            }
        }

        return el;
    },

    /** Create a text node */
    text(str) {
        return document.createTextNode(str);
    },

    /** Clear all children of an element */
    clear(el) {
        while (el.firstChild) el.removeChild(el.firstChild);
    },

    /** Create a div with class */
    div(cls, children) {
        return R.el('div', { cls, children });
    },

    /** Create a span with class and text */
    span(cls, text) {
        return R.el('span', { cls, text });
    },

    /** Metric bar component */
    metricBar(label, value, max, color) {
        const pct = max > 0 ? Math.round((value / max) * 100) : 0;
        return R.div('dash-metric-bar-container', [
            R.el('div', {
                cls: 'dash-metric-bar-label',
                children: [
                    R.span(null, label),
                    R.span(null, `${value}/${max}`)
                ]
            }),
            R.div('dash-metric-bar', [
                R.el('div', {
                    cls: 'dash-metric-bar-fill',
                    style: {
                        width: pct + '%',
                        background: color || 'var(--hr-accent)'
                    }
                })
            ])
        ]);
    },

    /** Stat card */
    statCard(label, value, sub) {
        return R.div('dash-stat-card', [
            R.div('dash-stat-card-label', [R.text(label)]),
            R.div('dash-stat-card-value', [R.text(String(value))]),
            sub ? R.div('dash-stat-card-sub', [R.text(sub)]) : null
        ]);
    },

    /** Priority badge */
    priorityBadge(priority) {
        if (!priority) return null;
        return R.span(`dash-priority dash-priority-${priority}`, priority);
    },

    /** Status badge */
    statusBadge(status) {
        if (!status) return null;
        return R.span(`dash-status dash-status-${status}`, status);
    },

    /** Clearance badge */
    clearanceBadge(clearance) {
        if (!clearance) return null;
        return R.span(`dash-agent-card-clearance dash-clearance-${clearance}`, clearance);
    }
};
