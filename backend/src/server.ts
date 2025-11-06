import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import taskRoutes from './routes/tasks';
import mcpRoutes from './routes/mcp';
import agentRoutes from './routes/agent';

const app = express();
const PORT = process.env['PORT'] || 3001;

// Security middleware
app.use(helmet());
// CORS allow local frontend ports (3000 legacy, 5173 Vite)
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env['FRONTEND_URL'] || 'http://localhost:3000',
      'http://localhost:5173'
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root metadata / landing endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    service: 'KanbanX API',
    version: '0.1.0',
    description: 'AI-augmented Kanban workflow service. Use /api/* for resources.',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      tasks: '/api/tasks',
      mcp: '/api/mcp'
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/agent', agentRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found' 
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    error: process.env['NODE_ENV'] === 'production' ? 'Internal server error' : err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 KanbanX API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;