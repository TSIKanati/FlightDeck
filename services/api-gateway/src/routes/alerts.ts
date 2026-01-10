import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Get all alerts
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const { appId, severity, acknowledged, limit = 50 } = req.query;
    const db = getDb();

    let query = 'SELECT a.*, apps.name as app_name FROM alerts a LEFT JOIN apps ON a.app_id = apps.id WHERE 1=1';
    const params: any[] = [];

    if (appId) {
      query += ' AND a.app_id = ?';
      params.push(appId);
    }

    if (severity) {
      query += ' AND a.severity = ?';
      params.push(severity);
    }

    if (acknowledged !== undefined) {
      query += ' AND a.acknowledged = ?';
      params.push(acknowledged === 'true' ? 1 : 0);
    }

    query += ' ORDER BY a.created_at DESC LIMIT ?';
    params.push(Number(limit));

    const alerts = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: alerts.map((alert: any) => ({
        ...alert,
        acknowledged: Boolean(alert.acknowledged),
        resolved: Boolean(alert.resolved),
        createdAt: alert.created_at,
        appName: alert.app_name
      }))
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch alerts' } });
  }
});

// Create alert
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { appId, severity, message, details } = req.body;

    if (!appId || !severity || !message) {
      res.status(400).json({ success: false, error: { message: 'Missing required fields' } });
      return;
    }

    const validSeverities = ['critical', 'warning', 'info'];
    if (!validSeverities.includes(severity)) {
      res.status(400).json({ success: false, error: { message: 'Invalid severity' } });
      return;
    }

    const db = getDb();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO alerts (id, app_id, severity, message, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, appId, severity, message, JSON.stringify(details || {}));

    // Log audit
    db.prepare(`
      INSERT INTO audit_log (user_id, action, app_id, details, result)
      VALUES (?, 'alert.create', ?, ?, 'success')
    `).run(req.user?.id, appId, JSON.stringify({ alertId: id, severity, message }));

    res.status(201).json({
      success: true,
      data: { id, appId, severity, message, details, acknowledged: false, createdAt: new Date().toISOString() }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to create alert' } });
  }
});

// Acknowledge alert
router.patch('/:alertId/acknowledge', (req: AuthRequest, res: Response) => {
  try {
    const { alertId } = req.params;
    const db = getDb();

    const result = db.prepare(`
      UPDATE alerts
      SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.user?.id, alertId);

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: { message: 'Alert not found' } });
      return;
    }

    // Log audit
    db.prepare(`
      INSERT INTO audit_log (user_id, action, details, result)
      VALUES (?, 'alert.acknowledge', ?, 'success')
    `).run(req.user?.id, JSON.stringify({ alertId }));

    res.json({ success: true, message: 'Alert acknowledged' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to acknowledge alert' } });
  }
});

// Resolve alert
router.patch('/:alertId/resolve', (req: AuthRequest, res: Response) => {
  try {
    const { alertId } = req.params;
    const db = getDb();

    const result = db.prepare(`
      UPDATE alerts
      SET resolved = 1, resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(alertId);

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: { message: 'Alert not found' } });
      return;
    }

    res.json({ success: true, message: 'Alert resolved' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to resolve alert' } });
  }
});

// Delete alert
router.delete('/:alertId', (req: AuthRequest, res: Response) => {
  try {
    const { alertId } = req.params;
    const db = getDb();

    const result = db.prepare('DELETE FROM alerts WHERE id = ?').run(alertId);

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: { message: 'Alert not found' } });
      return;
    }

    res.json({ success: true, message: 'Alert deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to delete alert' } });
  }
});

export { router as alertsRouter };
