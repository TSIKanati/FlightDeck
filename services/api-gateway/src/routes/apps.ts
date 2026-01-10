import { Router, Response } from 'express';
import { getDb } from '../database';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Get all apps
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const apps = db.prepare('SELECT * FROM apps ORDER BY priority, name').all();

    // Get metrics for each app (mock data for now)
    const appsWithMetrics = apps.map((app: any) => ({
      ...app,
      metrics: generateMockMetrics(app.id, app.status)
    }));

    res.json({
      success: true,
      data: appsWithMetrics
    });
  } catch (error) {
    console.error('Error fetching apps:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch apps' } });
  }
});

// Get single app
router.get('/:appId', (req: AuthRequest, res: Response) => {
  try {
    const { appId } = req.params;
    const db = getDb();
    const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(appId);

    if (!app) {
      res.status(404).json({ success: false, error: { message: 'App not found' } });
      return;
    }

    res.json({
      success: true,
      data: {
        ...app,
        metrics: generateMockMetrics(appId, (app as any).status)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch app' } });
  }
});

// Update app status
router.patch('/:appId/status', (req: AuthRequest, res: Response) => {
  try {
    const { appId } = req.params;
    const { status } = req.body;

    const validStatuses = ['production', 'development', 'maintenance', 'offline', 'not_started'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, error: { message: 'Invalid status' } });
      return;
    }

    const db = getDb();
    const result = db.prepare('UPDATE apps SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, appId);

    if (result.changes === 0) {
      res.status(404).json({ success: false, error: { message: 'App not found' } });
      return;
    }

    // Log audit
    db.prepare(`
      INSERT INTO audit_log (user_id, action, app_id, details, result)
      VALUES (?, 'app.status_change', ?, ?, 'success')
    `).run(req.user?.id, appId, JSON.stringify({ newStatus: status }));

    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to update status' } });
  }
});

// Get app metrics
router.get('/:appId/metrics', (req: AuthRequest, res: Response) => {
  try {
    const { appId } = req.params;
    const { from, to } = req.query;

    const db = getDb();
    const app = db.prepare('SELECT status FROM apps WHERE id = ?').get(appId) as { status: string } | undefined;

    if (!app) {
      res.status(404).json({ success: false, error: { message: 'App not found' } });
      return;
    }

    // Generate time series data
    const timeSeriesData = generateTimeSeriesData(24);

    res.json({
      success: true,
      data: {
        current: generateMockMetrics(appId, app.status),
        timeSeries: timeSeriesData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch metrics' } });
  }
});

// Helper functions
function generateMockMetrics(appId: string, status: string) {
  if (status === 'not_started') {
    return {
      users: 0,
      sessionsToday: 0,
      revenue: 0,
      uptime: 0,
      errorRate: 0,
      customMetrics: {}
    };
  }

  const baseMetrics: Record<string, any> = {
    tsiapp: { users: 1247, sessionsToday: 3892, revenue: 12500, uptime: 99.94, errorRate: 0.12, customMetrics: { callsScored: 127845, medalsWon: 45632 } },
    clieair: { users: 342, sessionsToday: 892, revenue: 8900, uptime: 99.87, errorRate: 0.08, customMetrics: { activeCases: 342, aiAnalyses: 8947 } },
    charitypats: { users: 567, sessionsToday: 1234, revenue: 5600, uptime: 99.92, errorRate: 0.15, customMetrics: { ideasFiled: 2847, creatorRevenue: 127400 } },
    guestofhonor: { users: 1892, sessionsToday: 4567, revenue: 23400, uptime: 99.99, errorRate: 0.02, customMetrics: { vipGuests: 1892, avgResponseTime: 18 } },
    ideallearning: { users: 45892, sessionsToday: 12456, revenue: 0, uptime: 99.91, errorRate: 0.18, customMetrics: { coursesCompleted: 127845, certificatesIssued: 2347 } },
    autozen: { users: 8234, sessionsToday: 5678, revenue: 23400, uptime: 99.88, errorRate: 0.22, customMetrics: { diagnosticsRun: 12847, partsFound: 45892 } },
    onthewayhome: { users: 3456, sessionsToday: 892, revenue: 1200, uptime: 99.85, errorRate: 0.25, customMetrics: { activeVolunteers: 3456, tasksCompleted: 892 } },
    parlorgames: { users: 2345, sessionsToday: 567, revenue: 4500, uptime: 99.78, errorRate: 0.35, customMetrics: { activeGames: 567, aiAccuracy: 98.7 } },
    quantumledger: { users: 892, sessionsToday: 234, revenue: 8900, uptime: 99.95, errorRate: 0.05, customMetrics: { accountsManaged: 892, transactionsProcessed: 234567 } },
    realworldprizes: { users: 8456, sessionsToday: 2345, revenue: 12300, uptime: 99.82, errorRate: 0.28, customMetrics: { prizesWon: 567, prizeValue: 45200 } },
    machinistzen: { users: 1234, sessionsToday: 345, revenue: 0, uptime: 95.5, errorRate: 2.5, customMetrics: { forumPosts: 4567, toolsListed: 5678 } }
  };

  return baseMetrics[appId] || {
    users: Math.floor(Math.random() * 1000),
    sessionsToday: Math.floor(Math.random() * 500),
    revenue: Math.floor(Math.random() * 10000),
    uptime: 95 + Math.random() * 5,
    errorRate: Math.random() * 2,
    customMetrics: {}
  };
}

function generateTimeSeriesData(hours: number) {
  return Array.from({ length: hours }, (_, i) => ({
    hour: `${i}:00`,
    users: Math.floor(Math.random() * 200) + 50,
    sessions: Math.floor(Math.random() * 500) + 100,
    errors: Math.floor(Math.random() * 10)
  }));
}

export { router as appsRouter };
