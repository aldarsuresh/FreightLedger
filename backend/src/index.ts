import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import tripRoutes from './routes/trip.routes';
import partyRoutes from './routes/party.routes';
import invoiceRoutes from './routes/invoice.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'FreightLedger Micro-SaaS API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/invoices', invoiceRoutes);

// Start Server
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 FreightLedger Backend running at http://localhost:${PORT}`);
    });
  });
}

export default app;

