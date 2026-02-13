import { Router, Response } from 'express';
import { getDb } from '../database';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Get enterprise overview metrics
router.get('/overview', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const apps = db.prepare('SELECT * FROM apps').all() as any[];

    const activeApps = apps.filter((a) => a.status === 'production');

    // Calculate aggregated metrics
    const metrics = {
      totalApps: apps.length,
      activeApps: activeApps.length,
      totalUsers: calculateTotalUsers(apps),
      totalRevenue: calculateTotalRevenue(apps),
      avgUptime: calculateAvgUptime(activeApps),
      totalSessions: calculateTotalSessions(apps),
      commitsThisWeek: Math.floor(Math.random() * 300) + 500, // Mock
      alertsCount: {
        critical: 0,
        warning: 2,
        info: 2
      }
    };

    // Get alert counts
    const alertCounts = db.prepare(`
      SELECT severity, COUNT(*) as count
      FROM alerts
      WHERE resolved = 0
      GROUP BY severity
    `).all() as { severity: string; count: number }[];

    alertCounts.forEach((ac) => {
      (metrics.alertsCount as any)[ac.severity] = ac.count;
    });

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching overview metrics:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch metrics' } });
  }
});

// Get resource usage
router.get('/resources', (req: AuthRequest, res: Response) => {
  try {
    // Return mock resource data (in production, this would come from actual monitoring)
    const resources = {
      cpu: 67 + (Math.random() - 0.5) * 10,
      memory: 52 + (Math.random() - 0.5) * 10,
      gpu: 78 + (Math.random() - 0.5) * 10,
      database: 34 + (Math.random() - 0.5) * 10,
      network: {
        in: Math.floor(Math.random() * 100) + 50,
        out: Math.floor(Math.random() * 80) + 30
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch resources' } });
  }
});

// Get analytics data
router.get('/analytics', (req: AuthRequest, res: Response) => {
  try {
    const { type = 'growth', period = '7d' } = req.query;

    let data: any[] = [];

    switch (type) {
      case 'growth':
        data = generateGrowthData();
        break;
      case 'engagement':
        data = generateEngagementData();
        break;
      case 'revenue':
        data = generateRevenueData();
        break;
      case 'velocity':
        data = generateVelocityData();
        break;
      default:
        data = generateGrowthData();
    }

    res.json({
      success: true,
      data: {
        type,
        period,
        series: data
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch analytics' } });
  }
});

// Record custom metric
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const { appId, metricName, metricValue, tags } = req.body;

    if (!appId || !metricName || metricValue === undefined) {
      res.status(400).json({ success: false, error: { message: 'Missing required fields' } });
      return;
    }

    const db = getDb();
    db.prepare(`
      INSERT INTO metrics (app_id, metric_name, metric_value, tags)
      VALUES (?, ?, ?, ?)
    `).run(appId, metricName, metricValue, JSON.stringify(tags || {}));

    res.status(201).json({ success: true, message: 'Metric recorded' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to record metric' } });
  }
});

// Helper functions
function calculateTotalUsers(apps: any[]): number {
  const userCounts: Record<string, number> = {
    tsiapp: 1247, clieair: 342, charitypats: 567, guestofhonor: 1892,
    ideallearning: 45892, autozen: 8234, onthewayhome: 3456, parlorgames: 2345,
    quantumledger: 892, realworldprizes: 8456, machinistzen: 1234
  };
  return apps.reduce((sum, app) => sum + (userCounts[app.id] || 0), 0);
}

function calculateTotalRevenue(apps: any[]): number {
  const revenues: Record<string, number> = {
    tsiapp: 12500, clieair: 8900, charitypats: 5600, guestofhonor: 23400,
    autozen: 23400, onthewayhome: 1200, parlorgames: 4500, quantumledger: 8900,
    realworldprizes: 12300
  };
  return apps.reduce((sum, app) => sum + (revenues[app.id] || 0), 0);
}

function calculateAvgUptime(apps: any[]): number {
  const uptimes: Record<string, number> = {
    tsiapp: 99.94, clieair: 99.87, charitypats: 99.92, guestofhonor: 99.99,
    ideallearning: 99.91, autozen: 99.88, onthewayhome: 99.85, parlorgames: 99.78,
    quantumledger: 99.95, realworldprizes: 99.82, machinistzen: 95.5
  };
  const total = apps.reduce((sum, app) => sum + (uptimes[app.id] || 99), 0);
  return apps.length > 0 ? total / apps.length : 0;
}

function calculateTotalSessions(apps: any[]): number {
  const sessions: Record<string, number> = {
    tsiapp: 3892, clieair: 892, charitypats: 1234, guestofhonor: 4567,
    ideallearning: 12456, autozen: 5678, onthewayhome: 892, parlorgames: 567,
    quantumledger: 234, realworldprizes: 2345, machinistzen: 345
  };
  return apps.reduce((sum, app) => sum + (sessions[app.id] || 0), 0);
}

function generateGrowthData() {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({
    label: day,
    value: Math.floor(Math.random() * 500) + 1000
  }));
}

function generateEngagementData() {
  return [
    { label: 'TSIAPP', value: 3892 },
    { label: 'IdealLearning', value: 12456 },
    { label: 'AutoZen', value: 5678 },
    { label: 'GuestOfHonor', value: 4567 },
    { label: 'RealWorldPrizes', value: 2345 }
  ];
}

function generateRevenueData() {
  return [
    { label: 'GuestOfHonor', value: 23400 },
    { label: 'AutoZen', value: 23400 },
    { label: 'TSIAPP', value: 12500 },
    { label: 'RealWorldPrizes', value: 12300 },
    { label: 'QuantumLedger', value: 8900 }
  ];
}

function generateVelocityData() {
  return ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week) => ({
    label: week,
    value: Math.floor(Math.random() * 150) + 100
  }));
}

export { router as metricsRouter };
