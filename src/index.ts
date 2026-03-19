import express from 'express';
import cors from 'cors';
import { CONFIG } from './config';
import { buildImages } from './docker-manager';

// Routes
import authRouter from './routes/auth';
import instancesRouter from './routes/instances';
import instanceActionsRouter from './routes/instance-actions';
import imagesRouter from './routes/images';
import secretsRouter from './routes/secrets';

const app = express();

// ─── Middleware ───
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── API Routes ───
app.use('/', authRouter);
app.use('/v1/compute/instances', instancesRouter);
app.use('/v1/compute/instances', instanceActionsRouter);
app.use('/v1/compute/images', imagesRouter);
app.use('/v1/secrets', secretsRouter);

// ─── Dashboard Route ───
app.get('/', (_req, res) => {
  res.redirect('/dashboard');
});

// Serve dashboard
app.get('/dashboard', (_req, res) => {
  res.sendFile('dashboard.html', { root: __dirname + '/../public' });
});

// ─── Internal API for dashboard ───
import * as store from './instance-store';
import * as dockerMgr from './docker-manager';

app.get('/api/dashboard/stats', async (_req, res) => {
  const records = store.getAllInstances();
  // Refresh statuses
  for (const record of records) {
    const status = await dockerMgr.getContainerStatus(record.containerId);
    store.updateInstanceStatus(record.instance.instanceId, status.status as any, status.sshPort);
  }

  const instances = records.map((r) => ({
    ...r.instance,
    containerId: r.containerId.substring(0, 12),
    rootPassword: r.rootPassword,
  }));

  const running = instances.filter((i) => i.status === 'running').length;
  const stopped = instances.filter((i) => i.status === 'stopped').length;
  const total = instances.length;

  res.json({
    stats: { total, running, stopped },
    instances,
    secrets: store.getAllSecrets(),
    availableImages: Object.entries(CONFIG.imageMapping).map(([id, info]) => ({
      imageId: id,
      ...info,
    })),
  });
});

// ─── Start Server ───
async function start() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     Contabo API Simulator v1.0.0         ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  await buildImages();

  app.listen(CONFIG.port, () => {
    console.log('');
    console.log(`🚀 API Server:   http://localhost:${CONFIG.port}`);
    console.log(`📊 Dashboard:    http://localhost:${CONFIG.port}/dashboard`);
    console.log(`🔑 Auth:         POST http://localhost:${CONFIG.port}/auth/auth/token`);
    console.log(`💻 Instances:    http://localhost:${CONFIG.port}/v1/compute/instances`);
    console.log(`🖼️  Images:       http://localhost:${CONFIG.port}/v1/compute/images`);
    console.log(`🔐 Secrets:      http://localhost:${CONFIG.port}/v1/secrets`);
    console.log('');
    console.log('Default root password: ' + CONFIG.defaultPassword);
    console.log('');
  });
}

start().catch(console.error);
