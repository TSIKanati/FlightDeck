/**
 * TSI Highrise System Resource Monitor
 * Feeds Power Station floor with real CPU/RAM/GPU/Disk metrics
 *
 * Pushes metrics to highrise-api via REST and optionally WebSocket
 */

import express from 'express';
import { WebSocket } from 'ws';
import si from 'systeminformation';

const app = express();
const PORT = process.env.PORT || 8082;
const API_URL = process.env.API_URL || 'http://highrise-api:8081';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '3000');

// ─── Metric State ───────────────────────────────────────
const metrics = {
    cpu: 0,
    ram: 0,
    gpu: 0,
    gpuTemp: 0,
    disk: 0,
    network: { rx: 0, tx: 0 },
    uptime: 0,
    processes: 0,
    dockerContainers: 0,
    history: [],
    lastUpdate: 0
};

const HISTORY_MAX = 120; // 6 minutes at 3s intervals

// ─── Collect Metrics ────────────────────────────────────
async function collectMetrics() {
    try {
        const [cpu, mem, gpu, disk, net, proc, time, docker] = await Promise.allSettled([
            si.currentLoad(),
            si.mem(),
            si.graphics(),
            si.fsSize(),
            si.networkStats(),
            si.processes(),
            si.time(),
            si.dockerContainers()
        ]);

        // CPU
        if (cpu.status === 'fulfilled') {
            metrics.cpu = Math.round(cpu.value.currentLoad * 10) / 10;
        }

        // RAM
        if (mem.status === 'fulfilled') {
            const m = mem.value;
            metrics.ram = Math.round((m.used / m.total) * 1000) / 10;
            metrics.ramUsed = Math.round(m.used / 1073741824 * 10) / 10; // GB
            metrics.ramTotal = Math.round(m.total / 1073741824 * 10) / 10;
        }

        // GPU
        if (gpu.status === 'fulfilled' && gpu.value.controllers?.length) {
            const ctrl = gpu.value.controllers;
            // Find dedicated GPU (NVIDIA or AMD)
            const dedicated = ctrl.find(c =>
                c.vendor?.includes('NVIDIA') ||
                c.vendor?.includes('AMD') ||
                c.model?.includes('RTX') ||
                c.model?.includes('RX')
            ) || ctrl[0];

            metrics.gpu = dedicated.utilizationGpu || 0;
            metrics.gpuTemp = dedicated.temperatureGpu || 0;
            metrics.gpuName = dedicated.model || 'Unknown';
            metrics.gpuVram = dedicated.memoryUsed
                ? Math.round(dedicated.memoryUsed / dedicated.memoryTotal * 100)
                : 0;
        }

        // Disk
        if (disk.status === 'fulfilled' && disk.value.length) {
            const primary = disk.value[0];
            metrics.disk = Math.round(primary.use * 10) / 10;
            metrics.diskUsed = Math.round(primary.used / 1073741824);
            metrics.diskTotal = Math.round(primary.size / 1073741824);
        }

        // Network
        if (net.status === 'fulfilled' && net.value.length) {
            const n = net.value[0];
            metrics.network.rx = Math.round(n.rx_sec / 1024); // KB/s
            metrics.network.tx = Math.round(n.tx_sec / 1024);
        }

        // Processes
        if (proc.status === 'fulfilled') {
            metrics.processes = proc.value.all || 0;
        }

        // Uptime
        if (time.status === 'fulfilled') {
            metrics.uptime = time.value.uptime;
        }

        // Docker
        if (docker.status === 'fulfilled') {
            metrics.dockerContainers = docker.value.length || 0;
        }

        metrics.lastUpdate = Date.now();

        // History
        metrics.history.push({
            ts: Date.now(),
            cpu: metrics.cpu,
            ram: metrics.ram,
            gpu: metrics.gpu
        });
        if (metrics.history.length > HISTORY_MAX) {
            metrics.history.shift();
        }

        // Push to API
        pushToAPI();

    } catch (err) {
        console.error('[MONITOR] Collection error:', err.message);
    }
}

// ─── Push to Highrise API ───────────────────────────────
async function pushToAPI() {
    try {
        await fetch(`${API_URL}/api/metrics/local`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cpu: metrics.cpu,
                ram: metrics.ram,
                gpu: metrics.gpu,
                gpuTemp: metrics.gpuTemp,
                gpuName: metrics.gpuName,
                disk: metrics.disk,
                network: metrics.network,
                processes: metrics.processes,
                uptime: metrics.uptime,
                dockerContainers: metrics.dockerContainers
            })
        });
    } catch (err) {
        // API might not be up yet, silently retry next cycle
    }
}

// ─── REST Endpoints ─────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', lastUpdate: metrics.lastUpdate });
});

app.get('/metrics', (req, res) => {
    res.json(metrics);
});

app.get('/metrics/history', (req, res) => {
    res.json(metrics.history);
});

app.get('/metrics/summary', (req, res) => {
    const alertLevel = (val) => val > 85 ? 'critical' : val > 60 ? 'warning' : 'normal';

    res.json({
        cpu: { value: metrics.cpu, level: alertLevel(metrics.cpu) },
        ram: { value: metrics.ram, level: alertLevel(metrics.ram), used: metrics.ramUsed, total: metrics.ramTotal },
        gpu: { value: metrics.gpu, level: alertLevel(metrics.gpu), temp: metrics.gpuTemp, name: metrics.gpuName },
        disk: { value: metrics.disk, level: alertLevel(metrics.disk) },
        network: metrics.network,
        overall: alertLevel(Math.max(metrics.cpu, metrics.ram, metrics.gpu))
    });
});

// ─── Start ──────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║  TSI HIGHRISE MONITOR - Power Station Feed       ║
║  Port: ${PORT}                                       ║
║  Polling: every ${POLL_INTERVAL}ms                          ║
║  API Target: ${API_URL.padEnd(34)}║
╚══════════════════════════════════════════════════╝
    `);

    // Initial collection
    collectMetrics();

    // Continuous polling
    setInterval(collectMetrics, POLL_INTERVAL);
});
