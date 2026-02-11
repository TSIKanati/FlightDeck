/**
 * Accounting Division - Calculator (flat box with buttons), chart display
 * Renders finance/accounting-themed 3D objects for a division zone.
 */
import * as THREE from 'three';
import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';

const DIVISION_COLOR = 0x27AE60;
const CHART_COLORS   = [0x2ECC71, 0x3498DB, 0xE74C3C, 0xF39C12, 0x9B59B6];

export class AccountingDivision {
    constructor() {
        /** @type {THREE.Group|null} */
        this._group = null;
        this._chartBars = [];
        this._chartCanvas = null;
        this._chartTexture = null;
        this._chartCtx = null;
        this._chartSprite = null;
        this._timer = 0;

        this._metrics = {
            transactionsProcessed: 0,
            revenue: 0,
            budget: 100000,
            reconciled: 99.1
        };
    }

    /**
     * @param {THREE.Vector3} position
     * @returns {THREE.Group}
     */
    create(position) {
        this._group = new THREE.Group();
        this._group.name = 'div-accounting';
        this._group.position.copy(position);

        this._buildCalculator();
        this._buildChartDisplay();
        this._build3DChart();
        this._buildLedger();

        return this._group;
    }

    _buildCalculator() {
        // Calculator body (flat box)
        const calcGroup = new THREE.Group();
        calcGroup.position.set(-0.5, 0.66, 0.2);

        const bodyGeo = new THREE.BoxGeometry(0.35, 0.02, 0.5);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0x2C3E50,
            roughness: 0.5,
            metalness: 0.3
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        calcGroup.add(body);

        // Display screen area
        const screenGeo = new THREE.PlaneGeometry(0.28, 0.08);
        const screenMat = new THREE.MeshStandardMaterial({
            color: 0xA8D8B9,
            emissive: 0x2ECC71,
            emissiveIntensity: 0.15,
            roughness: 0.2
        });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.rotation.x = -Math.PI / 2;
        screen.position.set(0, 0.011, -0.16);
        calcGroup.add(screen);

        // Calculator buttons (4x4 grid of tiny boxes)
        const btnRows = 4;
        const btnCols = 4;
        const btnSize = 0.05;
        const btnGap = 0.01;
        const startX = -((btnCols - 1) * (btnSize + btnGap)) / 2;
        const startZ = -((btnRows - 1) * (btnSize + btnGap)) / 2 + 0.08;

        const btnColors = [0x95A5A6, 0x95A5A6, 0x95A5A6, 0xE67E22];
        for (let row = 0; row < btnRows; row++) {
            for (let col = 0; col < btnCols; col++) {
                const btnGeo = new THREE.BoxGeometry(btnSize, 0.015, btnSize);
                const btnMat = new THREE.MeshStandardMaterial({
                    color: btnColors[col],
                    roughness: 0.4,
                    metalness: 0.2
                });
                const btn = new THREE.Mesh(btnGeo, btnMat);
                btn.position.set(
                    startX + col * (btnSize + btnGap),
                    0.018,
                    startZ + row * (btnSize + btnGap)
                );
                calcGroup.add(btn);
            }
        }

        this._group.add(calcGroup);
    }

    _buildChartDisplay() {
        // Flat-screen chart display on a stand
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 192;
        this._chartCanvas = canvas;
        this._chartCtx = canvas.getContext('2d');
        this._drawChart();

        this._chartTexture = new THREE.CanvasTexture(canvas);

        // Monitor frame
        const frameGeo = new THREE.BoxGeometry(1.2, 0.85, 0.04);
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x1A1A2E,
            roughness: 0.3,
            metalness: 0.6
        });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0.3, 1.3, -1.2);
        this._group.add(frame);

        // Chart on screen
        const chartMat = new THREE.MeshBasicMaterial({
            map: this._chartTexture,
            transparent: true
        });
        const chartGeo = new THREE.PlaneGeometry(1.1, 0.75);
        const chartMesh = new THREE.Mesh(chartGeo, chartMat);
        chartMesh.position.set(0.3, 1.3, -1.17);
        this._group.add(chartMesh);

        // Stand
        const standGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.5, 6);
        const standMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6 });
        const stand = new THREE.Mesh(standGeo, standMat);
        stand.position.set(0.3, 0.65, -1.2);
        this._group.add(stand);
    }

    _drawChart() {
        const ctx = this._chartCtx;
        const w = this._chartCanvas.width;
        const h = this._chartCanvas.height;

        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = '#0A0A2E';
        ctx.fillRect(0, 0, w, h);

        // Title
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#ECF0F1';
        ctx.textAlign = 'center';
        ctx.fillText('REVENUE BREAKDOWN', w / 2, 18);

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        for (let i = 1; i <= 4; i++) {
            const y = 30 + (h - 50) * (i / 5);
            ctx.beginPath();
            ctx.moveTo(30, y);
            ctx.lineTo(w - 10, y);
            ctx.stroke();
        }

        // Bar chart
        const barCount = 5;
        const barWidth = (w - 60) / barCount - 8;
        const maxH = h - 60;

        for (let i = 0; i < barCount; i++) {
            const barH = (0.3 + Math.random() * 0.7) * maxH;
            const x = 35 + i * (barWidth + 8);
            const y = h - 20 - barH;

            const color = CHART_COLORS[i % CHART_COLORS.length];
            ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
            ctx.fillRect(x, y, barWidth, barH);

            // Value label
            ctx.font = '10px sans-serif';
            ctx.fillStyle = '#ECF0F1';
            ctx.textAlign = 'center';
            ctx.fillText('$' + Math.floor(barH * 100), x + barWidth / 2, y - 4);
        }

        // Month labels
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#95A5A6';
        for (let i = 0; i < barCount; i++) {
            const x = 35 + i * (barWidth + 8) + barWidth / 2;
            ctx.fillText(months[i], x, h - 6);
        }
    }

    _build3DChart() {
        // 3D bar chart floating above desk area
        const chartGroup = new THREE.Group();
        chartGroup.position.set(0.6, 0.65, 0.4);

        const barCount = 5;
        const barWidth = 0.1;
        const spacing = 0.05;

        for (let i = 0; i < barCount; i++) {
            const height = 0.15 + Math.random() * 0.4;
            const barGeo = new THREE.BoxGeometry(barWidth, height, barWidth);
            const barMat = new THREE.MeshStandardMaterial({
                color: CHART_COLORS[i],
                emissive: CHART_COLORS[i],
                emissiveIntensity: 0.1,
                roughness: 0.4,
                metalness: 0.3,
                transparent: true,
                opacity: 0.8
            });
            const bar = new THREE.Mesh(barGeo, barMat);
            bar.position.set(i * (barWidth + spacing), height / 2, 0);
            chartGroup.add(bar);
            this._chartBars.push({ mesh: bar, mat: barMat, targetH: height, currentH: height });
        }

        this._group.add(chartGroup);
    }

    _buildLedger() {
        // Open ledger book
        const ledgerGroup = new THREE.Group();
        ledgerGroup.position.set(-0.3, 0.66, -0.3);

        // Left page
        const pageGeo = new THREE.PlaneGeometry(0.25, 0.35);
        const pageMat = new THREE.MeshStandardMaterial({
            color: 0xFFFFF0,
            roughness: 0.95,
            side: THREE.DoubleSide
        });
        const leftPage = new THREE.Mesh(pageGeo, pageMat);
        leftPage.rotation.x = -Math.PI / 2;
        leftPage.rotation.z = -0.02;
        leftPage.position.set(-0.13, 0.005, 0);
        ledgerGroup.add(leftPage);

        // Right page
        const rightPage = new THREE.Mesh(pageGeo, pageMat.clone());
        rightPage.rotation.x = -Math.PI / 2;
        rightPage.rotation.z = 0.02;
        rightPage.position.set(0.13, 0.005, 0);
        ledgerGroup.add(rightPage);

        // Spine
        const spineGeo = new THREE.BoxGeometry(0.02, 0.01, 0.35);
        const spineMat = new THREE.MeshStandardMaterial({
            color: 0x006400,
            roughness: 0.5
        });
        const spine = new THREE.Mesh(spineGeo, spineMat);
        spine.position.y = 0.002;
        ledgerGroup.add(spine);

        // Pen
        const penGeo = new THREE.CylinderGeometry(0.008, 0.005, 0.2, 6);
        const penMat = new THREE.MeshStandardMaterial({
            color: 0x1A1A2E,
            roughness: 0.3,
            metalness: 0.5
        });
        const pen = new THREE.Mesh(penGeo, penMat);
        pen.rotation.z = Math.PI / 6;
        pen.position.set(0.2, 0.015, 0.1);
        ledgerGroup.add(pen);

        this._group.add(ledgerGroup);
    }

    /**
     * @param {number} delta
     */
    update(delta) {
        this._timer += delta;

        // Animate 3D chart bars (random target height changes)
        for (const bar of this._chartBars) {
            // Occasionally change target
            if (Math.random() < delta * 0.1) {
                bar.targetH = 0.15 + Math.random() * 0.4;
            }
            // Smoothly interpolate toward target
            bar.currentH += (bar.targetH - bar.currentH) * delta * 2;
            bar.mesh.scale.y = bar.currentH / bar.mesh.geometry.parameters.height;
            bar.mesh.position.y = bar.currentH / 2;
        }

        // Periodically redraw 2D chart
        if (Math.floor(this._timer) % 10 === 0 && Math.floor((this._timer - delta)) % 10 !== 0) {
            this._drawChart();
            if (this._chartTexture) {
                this._chartTexture.needsUpdate = true;
            }
        }

        // Increment metrics
        this._metrics.transactionsProcessed += delta * 0.5;
        this._metrics.revenue += delta * 12;
    }

    /**
     * @returns {object}
     */
    getMetrics() {
        return {
            transactionsProcessed: Math.floor(this._metrics.transactionsProcessed),
            revenue: Math.floor(this._metrics.revenue),
            budget: this._metrics.budget,
            reconciled: this._metrics.reconciled
        };
    }

    dispose() {
        if (this._chartTexture) this._chartTexture.dispose();
        if (this._group) {
            this._group.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            });
            this._group.removeFromParent();
        }
    }
}
