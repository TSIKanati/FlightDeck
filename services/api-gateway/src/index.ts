import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';

import { authRouter } from './routes/auth';
import { appsRouter } from './routes/apps';
import { alertsRouter } from './routes/alerts';
import { metricsRouter } from './routes/metrics';
import { deployRouter } from './routes/deploy';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { initDatabase } from './database';
import { setupWebSocket } from './websocket';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.API_PORT || 4000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/apps', authMiddleware, appsRouter);
app.use('/api/alerts', authMiddleware, alertsRouter);
app.use('/api/metrics', authMiddleware, metricsRouter);
app.use('/api/deploy', authMiddleware, deployRouter);

// Error handler
app.use(errorHandler);

// Initialize database and start server
async function start() {
  try {
    // Initialize database
    initDatabase();
    console.log('Database initialized');

    // Setup WebSocket
    setupWebSocket(io);
    console.log('WebSocket server ready');

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`FlightDeck API Gateway running on port ${PORT}`);
      console.log(`WebSocket server ready on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { io };
