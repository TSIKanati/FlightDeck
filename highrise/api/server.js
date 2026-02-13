/**
 * TSI Highrise API Server
 * WebSocket relay + REST API for the 3D Command Center
 *
 * Connects:
 *   - @BeeFranknBot (Telegram C2)
 *   - @FullySailSallyBot (VPS WebSocket)
 *   - Highrise 3D UI (WebSocket clients)
 *   - System Monitor (resource data)
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 8081;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:8080';
const SALLY_WS_URL = process.env.SALLY_WS_URL || 'ws://localhost:3001';
const BEEFRANK_TOKEN = process.env.BEEFRANK_BOT_TOKEN || '';

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// ─── State ──────────────────────────────────────────────
const state = {
    agents: new Map(),
    floors: new Map(),
    connections: [],
    systemMetrics: { local: {}, server: {} },
    sallyConnected: false,
    beeFrankConnected: false,
    uiClients: new Set(),
    bootTime: Date.now()
};

// ─── HTTP Server ────────────────────────────────────────
const server = createServer(app);

// ─── WebSocket Server (for Highrise UI clients) ─────────
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
    const clientId = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    state.uiClients.add(ws);

    console.log(`[WS] Highrise UI connected: ${clientId} (total: ${state.uiClients.size})`);

    // Send initial state snapshot
    ws.send(JSON.stringify({
        type: 'INIT',
        data: {
            agents: Array.from(state.agents.values()),
            systemMetrics: state.systemMetrics,
            sallyConnected: state.sallyConnected,
            beeFrankConnected: state.beeFrankConnected,
            uptime: Date.now() - state.bootTime
        }
    }));

    ws.on('message', (raw) => {
        try {
            const msg = JSON.parse(raw.toString());
            handleUIMessage(ws, msg);
        } catch (e) {
            console.error('[WS] Bad message from UI:', e.message);
        }
    });

    ws.on('close', () => {
        state.uiClients.delete(ws);
        console.log(`[WS] UI disconnected: ${clientId} (remaining: ${state.uiClients.size})`);
    });
});

function handleUIMessage(ws, msg) {
    switch (msg.type) {
        case 'AGENT_COMMAND':
            // Forward agent command to appropriate handler
            routeAgentCommand(msg.data);
            break;
        case 'REQUEST_METRICS':
            ws.send(JSON.stringify({ type: 'METRICS', data: state.systemMetrics }));
            break;
        case 'PING':
            ws.send(JSON.stringify({ type: 'PONG', ts: Date.now() }));
            break;
    }
}

// ─── Broadcast to all UI clients ────────────────────────
function broadcast(type, data) {
    const msg = JSON.stringify({ type, data, ts: Date.now() });
    for (const client of state.uiClients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    }
}

// ─── Sally Connection (VPS WebSocket) ───────────────────
let sallyWs = null;
let sallyReconnectTimer = null;

function connectToSally() {
    if (!SALLY_WS_URL) return;

    try {
        sallyWs = new WebSocket(SALLY_WS_URL);

        sallyWs.on('open', () => {
            state.sallyConnected = true;
            console.log(`[SALLY] Connected to ${SALLY_WS_URL}`);
            broadcast('SALLY_STATUS', { connected: true });

            // Identify ourselves
            sallyWs.send(JSON.stringify({
                type: 'IDENTIFY',
                source: 'highrise-api',
                version: '1.0.0'
            }));
        });

        sallyWs.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw.toString());
                handleSallyMessage(msg);
            } catch (e) {
                console.error('[SALLY] Bad message:', e.message);
            }
        });

        sallyWs.on('close', () => {
            state.sallyConnected = false;
            console.log('[SALLY] Disconnected');
            broadcast('SALLY_STATUS', { connected: false });
            scheduleSallyReconnect();
        });

        sallyWs.on('error', (err) => {
            console.error('[SALLY] Error:', err.message);
            state.sallyConnected = false;
        });
    } catch (err) {
        console.error('[SALLY] Connection failed:', err.message);
        scheduleSallyReconnect();
    }
}

function scheduleSallyReconnect() {
    if (sallyReconnectTimer) clearTimeout(sallyReconnectTimer);
    sallyReconnectTimer = setTimeout(connectToSally, 5000);
}

function handleSallyMessage(msg) {
    switch (msg.type) {
        case 'DEPLOY_STATUS':
            broadcast('DEPLOY_STATUS', msg.data);
            break;
        case 'SERVER_HEALTH':
            state.systemMetrics.server = msg.data;
            broadcast('SERVER_METRICS', msg.data);
            break;
        case 'SYNC_STATUS':
            broadcast('SYNC_STATUS', msg.data);
            break;
        case 'AGENT_STATUS':
            updateAgent(msg.data);
            break;
        case 'C2_TASK_COMPLETE':
            broadcast('C2_TASK_COMPLETE', msg.data);
            break;
        case 'C2_TASK_PROGRESS':
            broadcast('C2_TASK_PROGRESS', msg.data);
            break;
        case 'CROSS_TOWER_TASK':
            broadcast('CROSS_TOWER_TASK', msg.data);
            break;
        default:
            // Forward unknown messages as generic events
            broadcast('SALLY_EVENT', msg);
    }
}

// ─── BeeFrank Bot (Telegram C2) ─────────────────────────
let beeFrankBot = null;

async function initBeeFrank() {
    if (!BEEFRANK_TOKEN) {
        console.log('[BEEFRANK] No token provided, skipping Telegram integration');
        return;
    }

    try {
        const TelegramBot = (await import('node-telegram-bot-api')).default;
        beeFrankBot = new TelegramBot(BEEFRANK_TOKEN, { polling: true });
        state.beeFrankConnected = true;

        console.log('[BEEFRANK] Telegram bot connected');
        broadcast('BEEFRANK_STATUS', { connected: true });

        beeFrankBot.on('message', (msg) => {
            const chatId = msg.chat.id;
            const text = msg.text || '';

            // Forward to UI as a C2 event
            broadcast('BEEFRANK_MESSAGE', {
                chatId,
                from: msg.from?.first_name || 'Unknown',
                text,
                timestamp: msg.date * 1000
            });

            // Handle commands
            if (text.startsWith('/status')) {
                const report = generateStatusReport();
                beeFrankBot.sendMessage(chatId, report, { parse_mode: 'Markdown' });
            } else if (text.startsWith('/agents')) {
                const agentList = Array.from(state.agents.values())
                    .map(a => `${a.status === 'active' ? '🟢' : '🟡'} *${a.name}* - ${a.role}`)
                    .join('\n');
                beeFrankBot.sendMessage(chatId, `*Highrise Agents:*\n${agentList}`, { parse_mode: 'Markdown' });
            } else if (text.startsWith('/floor')) {
                const floorNum = parseInt(text.split(' ')[1]);
                if (floorNum) {
                    broadcast('NAVIGATE_FLOOR', { floor: floorNum });
                    beeFrankBot.sendMessage(chatId, `Navigating to floor ${floorNum}`);
                }
            }
        });

        beeFrankBot.on('error', (err) => {
            console.error('[BEEFRANK] Error:', err.message);
        });
    } catch (err) {
        console.error('[BEEFRANK] Failed to init:', err.message);
    }
}

function generateStatusReport() {
    const activeAgents = Array.from(state.agents.values()).filter(a => a.status === 'active').length;
    const totalAgents = state.agents.size;
    const uptime = Math.floor((Date.now() - state.bootTime) / 60000);
    const local = state.systemMetrics.local;
    const svr = state.systemMetrics.server;

    return `*🏢 HIGHRISE STATUS*
━━━━━━━━━━━━━━━━━
*Agents:* ${activeAgents}/${totalAgents} active
*UI Clients:* ${state.uiClients.size}
*Sally:* ${state.sallyConnected ? '🟢 Connected' : '🔴 Offline'}
*Uptime:* ${uptime}min

*Local System:*
  CPU: ${local.cpu || '??'}%
  RAM: ${local.ram || '??'}%
  GPU: ${local.gpu || '??'}%

*Server:*
  CPU: ${svr.cpu || '??'}%
  RAM: ${svr.ram || '??'}%
  Bandwidth: ${svr.bandwidth || '??'}%`;
}

// ─── Agent Management ───────────────────────────────────
function updateAgent(agentData) {
    const existing = state.agents.get(agentData.id) || {};
    const updated = { ...existing, ...agentData, lastUpdate: Date.now() };
    state.agents.set(agentData.id, updated);
    broadcast('AGENT_UPDATE', updated);
}

function routeAgentCommand(cmd) {
    console.log(`[CMD] Agent command: ${cmd.action} -> ${cmd.targetAgent}`);

    // Route to Sally if it's a server-side agent
    if (cmd.platform === 'server' && sallyWs?.readyState === WebSocket.OPEN) {
        sallyWs.send(JSON.stringify({ type: 'AGENT_COMMAND', data: cmd }));
    }

    // Route to BeeFrank if it's a notification
    if (cmd.action === 'notify' && beeFrankBot && cmd.chatId) {
        beeFrankBot.sendMessage(cmd.chatId, cmd.message);
    }

    broadcast('AGENT_COMMAND_ACK', { ...cmd, routed: true });
}

// ─── REST Endpoints ─────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: Date.now() - state.bootTime,
        uiClients: state.uiClients.size,
        sallyConnected: state.sallyConnected,
        beeFrankConnected: state.beeFrankConnected,
        agentCount: state.agents.size
    });
});

app.get('/api/agents', (req, res) => {
    res.json(Array.from(state.agents.values()));
});

app.post('/api/agents/:id/command', (req, res) => {
    const { id } = req.params;
    const cmd = { targetAgent: id, ...req.body };
    routeAgentCommand(cmd);
    res.json({ success: true, cmd });
});

app.get('/api/metrics', (req, res) => {
    res.json(state.systemMetrics);
});

app.post('/api/metrics/local', (req, res) => {
    state.systemMetrics.local = { ...state.systemMetrics.local, ...req.body, ts: Date.now() };
    broadcast('LOCAL_METRICS', state.systemMetrics.local);
    res.json({ received: true });
});

app.post('/api/metrics/server', (req, res) => {
    state.systemMetrics.server = { ...state.systemMetrics.server, ...req.body, ts: Date.now() };
    broadcast('SERVER_METRICS', state.systemMetrics.server);
    res.json({ received: true });
});

// ─── C2 Endpoints ──────────────────────────────────────
app.post('/api/c2/task', (req, res) => {
    const cmd = req.body;
    console.log(`[C2-API] Task command received:`, cmd);

    // Forward to Sally VPS if connected
    if (sallyWs?.readyState === WebSocket.OPEN) {
        sallyWs.send(JSON.stringify({ type: 'C2_TASK', data: cmd }));
    }

    // Broadcast to UI clients
    broadcast('CROSS_TOWER_TASK', cmd);

    res.json({ success: true, routed: state.sallyConnected, cmd });
});

app.get('/api/c2/status', (req, res) => {
    res.json({
        leftTower: {
            name: 'BeeFrank C2',
            status: 'online',
            metrics: state.systemMetrics.local
        },
        rightTower: {
            name: 'Sally C2',
            status: state.sallyConnected ? 'online' : 'offline',
            metrics: state.systemMetrics.server
        },
        sallyConnected: state.sallyConnected,
        beeFrankConnected: state.beeFrankConnected,
        uptime: Date.now() - state.bootTime,
        agents: Array.from(state.agents.values()),
        uiClients: state.uiClients.size
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        towers: {
            left: { name: 'Local (ProArt)', status: 'online', metrics: state.systemMetrics.local },
            right: { name: 'Server (Sally)', status: state.sallyConnected ? 'online' : 'offline', metrics: state.systemMetrics.server }
        },
        agents: Array.from(state.agents.values()),
        connections: state.connections,
        uptime: Date.now() - state.bootTime
    });
});

// ─── Start ──────────────────────────────────────────────
server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║  TSI HIGHRISE API - WebSocket Relay              ║
║  Port: ${PORT}                                       ║
║  WS:   ws://localhost:${PORT}/ws                     ║
║                                                  ║
║  Sally:    ${SALLY_WS_URL.padEnd(36)}║
║  BeeFrank: ${BEEFRANK_TOKEN ? 'TOKEN SET ✓' : 'NO TOKEN (demo mode)'}                       ║
╚══════════════════════════════════════════════════╝
    `);

    connectToSally();
    initBeeFrank();
});
