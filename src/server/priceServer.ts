import express from 'express';
import { createServer } from 'http';
import { PriceUpdaterService } from '../services/priceUpdater';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3001;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

const tradermadeApiKey = process.env.TRADERMADE_API_KEY;
if (!tradermadeApiKey) {
  throw new Error('Missing TRADERMADE_API_KEY environment variable');
}

// Initialize price updater
const priceUpdater = new PriceUpdaterService(tradermadeApiKey);

// Start the price updater service
priceUpdater.start().catch(console.error);

// Graceful shutdown
const shutdown = () => {
  console.log('Shutting down price updater...');
  priceUpdater.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(port, () => {
  console.log(`Price server running on port ${port}`);
});
