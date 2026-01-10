import { Server as SocketServer, Socket } from 'socket.io';
import { verifyToken } from '../middleware/auth';
import { getDb } from '../database';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

export function setupWebSocket(io: SocketServer): void {
  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = verifyToken(token as string);
    if (!decoded) {
      return next(new Error('Invalid token'));
    }

    socket.userId = decoded.userId;
    socket.userEmail = decoded.email;
    socket.userRole = decoded.role;
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Client connected: ${socket.userId} (${socket.userEmail})`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Join role-based room
    socket.join(`role:${socket.userRole}`);

    // Handle subscription to app updates
    socket.on('subscribe:app', (appId: string) => {
      socket.join(`app:${appId}`);
      console.log(`${socket.userEmail} subscribed to app:${appId}`);
    });

    socket.on('unsubscribe:app', (appId: string) => {
      socket.leave(`app:${appId}`);
      console.log(`${socket.userEmail} unsubscribed from app:${appId}`);
    });

    // Handle real-time metric updates
    socket.on('metrics:update', (data: { appId: string; metrics: any }) => {
      // Broadcast to all subscribers of this app
      io.to(`app:${data.appId}`).emit('app:metrics:updated', {
        app: data.appId,
        metrics: data.metrics,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.userId}`);
    });
  });

  // Set up periodic metric broadcasting
  startMetricsBroadcast(io);

  // Set up alert broadcasting
  startAlertMonitoring(io);
}

function startMetricsBroadcast(io: SocketServer): void {
  // Broadcast resource metrics every 5 seconds
  setInterval(() => {
    const resources = {
      cpu: 67 + (Math.random() - 0.5) * 10,
      memory: 52 + (Math.random() - 0.5) * 10,
      gpu: 78 + (Math.random() - 0.5) * 10,
      database: 34 + (Math.random() - 0.5) * 10,
      timestamp: new Date().toISOString()
    };

    io.emit('resources:updated', resources);
  }, 5000);

  // Broadcast app metrics every 30 seconds
  setInterval(() => {
    const db = getDb();
    const apps = db.prepare('SELECT id FROM apps WHERE status = ?').all('production') as { id: string }[];

    apps.forEach((app) => {
      const metrics = {
        users: Math.floor(Math.random() * 100) + 50,
        sessions: Math.floor(Math.random() * 200) + 100,
        errorRate: Math.random() * 0.5
      };

      io.to(`app:${app.id}`).emit('app:metrics:updated', {
        app: app.id,
        metrics,
        timestamp: new Date().toISOString()
      });
    });
  }, 30000);
}

function startAlertMonitoring(io: SocketServer): void {
  // Check for new alerts every 10 seconds
  let lastCheck = new Date().toISOString();

  setInterval(() => {
    const db = getDb();
    const newAlerts = db.prepare(`
      SELECT a.*, apps.name as app_name
      FROM alerts a
      LEFT JOIN apps ON a.app_id = apps.id
      WHERE a.created_at > ?
    `).all(lastCheck) as any[];

    newAlerts.forEach((alert) => {
      io.emit('alert:new', {
        id: alert.id,
        appId: alert.app_id,
        appName: alert.app_name,
        severity: alert.severity,
        message: alert.message,
        createdAt: alert.created_at
      });
    });

    lastCheck = new Date().toISOString();
  }, 10000);
}

// Export broadcast functions for use by routes
export function broadcastAppStatusChange(io: SocketServer, appId: string, status: string): void {
  io.emit('app:status:changed', {
    app: appId,
    status,
    timestamp: new Date().toISOString()
  });
}

export function broadcastDeploymentProgress(io: SocketServer, deploymentId: string, progress: number, status: string): void {
  io.emit('deploy:progress', {
    deployId: deploymentId,
    progress,
    status,
    timestamp: new Date().toISOString()
  });
}

export function broadcastAlert(io: SocketServer, alert: any): void {
  io.emit('alert:new', {
    ...alert,
    timestamp: new Date().toISOString()
  });
}
