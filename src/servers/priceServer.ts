import express from 'express';
import { createServer } from 'http';
import { PriceUpdaterService } from '../services/priceUpdater';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3001;

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Health check endpoint with more details
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

if (!process.env.TRADERMADE_API_KEY) {
  throw new Error('Missing TRADERMADE_API_KEY environment variable');
}

const priceUpdater = new PriceUpdaterService(process.env.TRADERMADE_API_KEY);

// Start price updater with error handling
const startServer = async () => {
  try {
    await priceUpdater.start();
    console.log('Price updater started successfully');
  } catch (error) {
    console.error('Failed to start price updater:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown with timeout
const shutdown = (signal: string) => {
  console.log(`Received ${signal}, starting graceful shutdown...`);
  
  // Set shutdown timeout
  const forceExit = setTimeout(() => {
    console.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);

  Promise.all([
    new Promise(resolve => server.close(resolve)),
    new Promise(resolve => {
      priceUpdater.stop();
      resolve(true);
    })
  ]).then(() => {
    console.log('Graceful shutdown completed');
    clearTimeout(forceExit);
    process.exit(0);
  }).catch(err => {
    console.error('Error during shutdown:', err);
    process.exit(1);
  });
};

// Handle different termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  shutdown('uncaughtException');
});

// Start server
server.listen(port, () => {
  console.log(`Price server running on port ${port}`);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Process ID:', process.pid);
});
