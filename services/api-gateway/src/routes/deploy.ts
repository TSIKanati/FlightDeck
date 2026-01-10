import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database';
import { AuthRequest, requirePermission } from '../middleware/auth';

const router = Router();

// Get deployments
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const { appId, status, limit = 20 } = req.query;
    const db = getDb();

    let query = `
      SELECT d.*, apps.name as app_name, users.email as triggered_by_email
      FROM deployments d
      LEFT JOIN apps ON d.app_id = apps.id
      LEFT JOIN users ON d.triggered_by = users.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (appId) {
      query += ' AND d.app_id = ?';
      params.push(appId);
    }

    if (status) {
      query += ' AND d.status = ?';
      params.push(status);
    }

    query += ' ORDER BY d.started_at DESC LIMIT ?';
    params.push(Number(limit));

    const deployments = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: deployments
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch deployments' } });
  }
});

// Trigger deployment
router.post('/', requirePermission('deployment.full'), (req: AuthRequest, res: Response) => {
  try {
    const { appId, branch = 'main' } = req.body;

    if (!appId) {
      res.status(400).json({ success: false, error: { message: 'App ID required' } });
      return;
    }

    const db = getDb();

    // Check if app exists
    const app = db.prepare('SELECT id, name FROM apps WHERE id = ?').get(appId);
    if (!app) {
      res.status(404).json({ success: false, error: { message: 'App not found' } });
      return;
    }

    // Create deployment record
    const deploymentId = uuidv4();
    const commitSha = Math.random().toString(36).substring(2, 10);

    db.prepare(`
      INSERT INTO deployments (id, app_id, triggered_by, branch, commit_sha, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(deploymentId, appId, req.user?.id, branch, commitSha);

    // Log audit
    db.prepare(`
      INSERT INTO audit_log (user_id, action, app_id, details, result)
      VALUES (?, 'deploy.trigger', ?, ?, 'success')
    `).run(req.user?.id, appId, JSON.stringify({ deploymentId, branch, commitSha }));

    // Simulate deployment process (in production, this would trigger actual CI/CD)
    simulateDeployment(db, deploymentId);

    res.status(201).json({
      success: true,
      data: {
        id: deploymentId,
        appId,
        branch,
        commitSha,
        status: 'pending',
        startedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to trigger deployment' } });
  }
});

// Get deployment status
router.get('/:deploymentId', (req: AuthRequest, res: Response) => {
  try {
    const { deploymentId } = req.params;
    const db = getDb();

    const deployment = db.prepare(`
      SELECT d.*, apps.name as app_name
      FROM deployments d
      LEFT JOIN apps ON d.app_id = apps.id
      WHERE d.id = ?
    `).get(deploymentId);

    if (!deployment) {
      res.status(404).json({ success: false, error: { message: 'Deployment not found' } });
      return;
    }

    res.json({
      success: true,
      data: deployment
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch deployment' } });
  }
});

// Cancel deployment
router.post('/:deploymentId/cancel', requirePermission('deployment.full'), (req: AuthRequest, res: Response) => {
  try {
    const { deploymentId } = req.params;
    const db = getDb();

    const deployment = db.prepare('SELECT status FROM deployments WHERE id = ?').get(deploymentId) as { status: string } | undefined;

    if (!deployment) {
      res.status(404).json({ success: false, error: { message: 'Deployment not found' } });
      return;
    }

    if (!['pending', 'running'].includes(deployment.status)) {
      res.status(400).json({ success: false, error: { message: 'Deployment cannot be cancelled' } });
      return;
    }

    db.prepare(`
      UPDATE deployments
      SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(deploymentId);

    res.json({ success: true, message: 'Deployment cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to cancel deployment' } });
  }
});

// Simulate deployment process
function simulateDeployment(db: any, deploymentId: string) {
  const stages = [
    { progress: 10, status: 'running', log: 'Starting deployment...' },
    { progress: 30, status: 'running', log: 'Pulling latest code...' },
    { progress: 50, status: 'running', log: 'Installing dependencies...' },
    { progress: 70, status: 'running', log: 'Building application...' },
    { progress: 90, status: 'running', log: 'Deploying to server...' },
    { progress: 100, status: 'success', log: 'Deployment complete!' }
  ];

  let stageIndex = 0;

  const interval = setInterval(() => {
    if (stageIndex >= stages.length) {
      clearInterval(interval);
      return;
    }

    const stage = stages[stageIndex];
    const logs = stages.slice(0, stageIndex + 1).map(s => s.log).join('\n');

    db.prepare(`
      UPDATE deployments
      SET progress = ?, status = ?, logs = ?${stage.status === 'success' ? ', completed_at = CURRENT_TIMESTAMP' : ''}
      WHERE id = ?
    `).run(stage.progress, stage.status, logs, deploymentId);

    stageIndex++;
  }, 2000);
}

export { router as deployRouter };
