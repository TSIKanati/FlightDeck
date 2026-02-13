/**
 * TowerComms.js - Twin Tower Communication UI
 * Displays message queue between Server Tower and Local Tower.
 * Allows sending spin-up requests, status updates, and resource alerts.
 */

import { R } from '../shared/Renderer.js';
import { CommsBridge } from '../core/CommsBridge.js';

export class TowerComms {
    /**
     * Render the comms panel for a project
     * @param {object} opts - { comms: CommsBridge, project, projects, data, onRefresh }
     */
    static renderPanel(opts = {}) {
        const panel = R.div('dash-comms-panel');

        // Header with tower indicators
        panel.appendChild(TowerComms._renderHeader(opts.comms));

        // Message compose
        panel.appendChild(TowerComms._renderCompose(opts));

        // Message list
        const messages = opts.project
            ? opts.comms.getByProject(opts.project)
            : opts.comms.getAll().sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

        panel.appendChild(TowerComms._renderMessages(messages, opts));

        return panel;
    }

    static _renderHeader(comms) {
        const stats = comms.stats();
        const header = R.div('dash-comms-header', [
            R.div('dash-comms-tower', [
                R.span('dash-comms-tower-icon', CommsBridge.TOWERS.SERVER.icon),
                R.div('dash-comms-tower-info', [
                    R.div('dash-comms-tower-name', [R.text(CommsBridge.TOWERS.SERVER.name)]),
                    R.div('dash-comms-tower-host', [R.text(CommsBridge.TOWERS.SERVER.host)])
                ])
            ]),
            R.div('dash-comms-bridge-indicator', [
                R.span('dash-comms-bridge-line', ''),
                R.span('dash-comms-bridge-status', stats.pending > 0 ? `${stats.pending} pending` : 'Connected')
            ]),
            R.div('dash-comms-tower', [
                R.span('dash-comms-tower-icon', CommsBridge.TOWERS.LOCAL.icon),
                R.div('dash-comms-tower-info', [
                    R.div('dash-comms-tower-name', [R.text(CommsBridge.TOWERS.LOCAL.name)]),
                    R.div('dash-comms-tower-host', [R.text(CommsBridge.TOWERS.LOCAL.host)])
                ])
            ])
        ]);
        return header;
    }

    static _renderCompose(opts) {
        const compose = R.div('dash-comms-compose');

        // Message type select
        const typeSelect = R.el('select', { cls: 'dash-input' });
        const types = [
            { value: CommsBridge.TYPES.SPIN_UP_REQUEST, label: 'Spin Up Agent Request' },
            { value: CommsBridge.TYPES.TASK_SYNC, label: 'Sync Task' },
            { value: CommsBridge.TYPES.STATUS_UPDATE, label: 'Status Update' },
            { value: CommsBridge.TYPES.RESOURCE_ALERT, label: 'Resource Alert' },
            { value: CommsBridge.TYPES.AGENT_TRANSFER, label: 'Transfer Agent' }
        ];
        for (const t of types) {
            typeSelect.appendChild(R.el('option', { text: t.label, attrs: { value: t.value } }));
        }

        // Direction select
        const dirSelect = R.el('select', { cls: 'dash-input' });
        dirSelect.appendChild(R.el('option', { text: 'Server \u2192 Local', attrs: { value: 'server-to-local' } }));
        dirSelect.appendChild(R.el('option', { text: 'Local \u2192 Server', attrs: { value: 'local-to-server' } }));

        const row1 = R.div('dash-form-row', [
            R.div('dash-form-field', [
                R.el('label', { cls: 'dash-form-label', text: 'Message Type' }),
                typeSelect
            ]),
            R.div('dash-form-field', [
                R.el('label', { cls: 'dash-form-label', text: 'Direction' }),
                dirSelect
            ])
        ]);

        // Project select
        const projSelect = R.el('select', { cls: 'dash-input' });
        projSelect.appendChild(R.el('option', { text: '(All Projects)', attrs: { value: '' } }));
        if (opts.projects) {
            for (const p of opts.projects) {
                const opt = R.el('option', { text: p.name, attrs: { value: p.id } });
                if (opts.project === p.id) opt.selected = true;
                projSelect.appendChild(opt);
            }
        }

        // Subject
        const subjectInput = R.el('input', {
            cls: 'dash-input',
            attrs: { type: 'text', placeholder: 'Subject...' }
        });

        const row2 = R.div('dash-form-row', [
            R.div('dash-form-field', [
                R.el('label', { cls: 'dash-form-label', text: 'Project' }),
                projSelect
            ]),
            R.div('dash-form-field', [
                R.el('label', { cls: 'dash-form-label', text: 'Subject' }),
                subjectInput
            ])
        ]);

        // Body
        const bodyInput = R.el('textarea', {
            cls: 'dash-input dash-textarea',
            attrs: { placeholder: 'Message body...', rows: '3' }
        });

        // Agent count (for spin-up)
        const countInput = R.el('input', {
            cls: 'dash-input',
            attrs: { type: 'number', min: '1', max: '10', value: '1', placeholder: 'Agent count' }
        });
        const countField = R.div('dash-form-field', [
            R.el('label', { cls: 'dash-form-label', text: 'Agent Count' }),
            countInput
        ]);

        // Priority
        const prioSelect = R.el('select', { cls: 'dash-input' });
        for (const p of ['P0', 'P1', 'P2', 'P3']) {
            prioSelect.appendChild(R.el('option', { text: p, attrs: { value: p } }));
        }
        prioSelect.value = 'P2';

        const row3 = R.div('dash-form-row', [
            countField,
            R.div('dash-form-field', [
                R.el('label', { cls: 'dash-form-label', text: 'Priority' }),
                prioSelect
            ])
        ]);

        // Send button
        const sendBtn = R.el('button', {
            cls: 'dash-btn dash-btn-primary',
            text: '\uD83D\uDCE1 Send Message',
            on: {
                click: () => {
                    const dir = dirSelect.value.split('-to-');
                    const msgOpts = {
                        type: typeSelect.value,
                        from: dir[0],
                        to: dir[1],
                        project: projSelect.value || null,
                        subject: subjectInput.value.trim() || typeSelect.options[typeSelect.selectedIndex].text,
                        body: bodyInput.value.trim(),
                        priority: prioSelect.value,
                        agentCount: parseInt(countInput.value) || 1
                    };

                    if (typeSelect.value === CommsBridge.TYPES.SPIN_UP_REQUEST) {
                        opts.comms.requestSpinUp(msgOpts);
                    } else {
                        opts.comms.sendMessage(msgOpts);
                    }

                    // Clear form
                    subjectInput.value = '';
                    bodyInput.value = '';
                    countInput.value = '1';

                    if (opts.onRefresh) opts.onRefresh();
                }
            }
        });

        compose.appendChild(R.el('h4', { cls: 'dash-comms-compose-title', text: 'Send Tower Message' }));
        compose.appendChild(row1);
        compose.appendChild(row2);
        compose.appendChild(R.div('dash-form-field', [
            R.el('label', { cls: 'dash-form-label', text: 'Message' }),
            bodyInput
        ]));
        compose.appendChild(row3);
        compose.appendChild(R.div('dash-form-buttons', [sendBtn]));

        return compose;
    }

    static _renderMessages(messages, opts) {
        const sec = R.div('dash-section');
        sec.appendChild(R.div('dash-section-title', [
            R.text(`Messages (${messages.length})`)
        ]));

        if (!messages.length) {
            sec.appendChild(R.div('dash-empty', [
                R.div('dash-empty-icon', [R.text('\uD83D\uDCE1')]),
                R.div('dash-empty-text', [R.text('No tower communications yet')])
            ]));
            return sec;
        }

        for (const msg of messages) {
            sec.appendChild(TowerComms._renderMessage(msg, opts));
        }

        return sec;
    }

    static _renderMessage(msg, opts) {
        const isReply = !!msg.replyTo;
        const fromTower = msg.from === 'server' ? CommsBridge.TOWERS.SERVER : CommsBridge.TOWERS.LOCAL;
        const toTower = msg.to === 'server' ? CommsBridge.TOWERS.SERVER : CommsBridge.TOWERS.LOCAL;

        const card = R.el('div', {
            cls: `dash-comms-message dash-comms-${msg.status} ${isReply ? 'dash-comms-reply' : ''}`
        });

        // Header: from -> to, timestamp, status
        const header = R.div('dash-comms-message-header', [
            R.span('dash-comms-message-from', `${fromTower.icon} ${fromTower.name}`),
            R.span('dash-comms-message-arrow', '\u2192'),
            R.span('dash-comms-message-to', `${toTower.icon} ${toTower.name}`),
            R.span('dash-comms-message-time',
                msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''),
            R.span(`dash-comms-message-status dash-comms-status-${msg.status}`, msg.status)
        ]);
        card.appendChild(header);

        // Type badge + priority + subject
        const meta = R.div('dash-comms-message-meta', [
            R.span('dash-comms-type-badge', msg.type.replace(/-/g, ' ')),
            R.priorityBadge(msg.priority),
            msg.project ? R.span('dash-agent-card-tag', msg.project) : null
        ]);
        card.appendChild(meta);

        // Subject
        if (msg.subject) {
            card.appendChild(R.el('div', { cls: 'dash-comms-message-subject', text: msg.subject }));
        }

        // Body
        if (msg.body) {
            card.appendChild(R.el('p', { cls: 'dash-comms-message-body', text: msg.body }));
        }

        // Agent count for spin-up requests
        if (msg.type === CommsBridge.TYPES.SPIN_UP_REQUEST && msg.agentCount) {
            card.appendChild(R.div('dash-comms-message-detail', [
                R.text(`Requested agents: ${msg.agentCount}`)
            ]));
        }

        // Action buttons for pending messages
        if (msg.status === 'pending' && opts.comms) {
            const actions = R.div('dash-comms-message-actions');

            actions.appendChild(R.el('button', {
                cls: 'dash-btn dash-btn-primary',
                text: 'Acknowledge',
                style: { fontSize: '0.7rem', padding: '4px 10px' },
                on: {
                    click: (e) => {
                        e.stopPropagation();
                        opts.comms.acknowledge(msg.id);
                        if (opts.onRefresh) opts.onRefresh();
                    }
                }
            }));

            actions.appendChild(R.el('button', {
                cls: 'dash-btn dash-btn-ghost',
                text: 'Respond',
                style: { fontSize: '0.7rem', padding: '4px 10px' },
                on: {
                    click: (e) => {
                        e.stopPropagation();
                        const response = prompt('Enter response:');
                        if (response) {
                            opts.comms.respond(msg.id, response, 'resolved');
                            if (opts.onRefresh) opts.onRefresh();
                        }
                    }
                }
            }));

            card.appendChild(actions);
        }

        return card;
    }

    /**
     * Render a compact comms badge showing pending count
     */
    static renderBadge(comms) {
        const pending = comms.getPending().length;
        if (pending === 0) return null;
        return R.span('dash-comms-badge', `\uD83D\uDCE1 ${pending}`);
    }
}
