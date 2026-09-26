import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Allow large payloads for image data URLs and settings
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS & cache control for API endpoints
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

// Data file paths
const DATA_DIR = path.resolve(__dirname, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'site_settings.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper functions for reading/writing persistent data
function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return defaultValue;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

// SSE (Server-Sent Events) clients list for real-time site updates
type SSEClient = { id: number; res: Response };
let sseClients: SSEClient[] = [];
let nextClientId = 1;

function broadcastSettings(settings: any) {
  const payload = `data: ${JSON.stringify({ type: 'settings_update', data: settings })}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch {
      // client disconnected
    }
  });
}

function broadcastOrders(orders: any) {
  const payload = `data: ${JSON.stringify({ type: 'orders_update', data: orders })}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(payload);
    } catch {
      // client disconnected
    }
  });
}

// -------------------------------------------------------------
// Real-time SSE Stream Endpoint
// -------------------------------------------------------------
app.get('/api/settings/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = nextClientId++;
  const client = { id: clientId, res };
  sseClients.push(client);

  // Send initial data immediately upon connection
  const currentSettings = readJsonFile(SETTINGS_FILE, null);
  if (currentSettings) {
    res.write(`data: ${JSON.stringify({ type: 'settings_update', data: currentSettings })}\n\n`);
  }

  // Heartbeat ping every 25 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// -------------------------------------------------------------
// Settings API Endpoints
// -------------------------------------------------------------
app.get('/api/settings', (_req: Request, res: Response) => {
  const settings = readJsonFile(SETTINGS_FILE, null);
  res.json({ success: true, settings });
});

app.post('/api/settings', (req: Request, res: Response) => {
  const incoming = req.body;
  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ success: false, error: 'Invalid settings payload' });
  }

  const existing = readJsonFile(SETTINGS_FILE, {});
  const merged = {
    ...existing,
    ...incoming,
    serverUpdatedAt: new Date().toISOString(),
    serverUpdatedAtMs: Date.now(),
  };

  writeJsonFile(SETTINGS_FILE, merged);
  broadcastSettings(merged);

  res.json({ success: true, settings: merged });
});

// -------------------------------------------------------------
// Orders API Endpoints
// -------------------------------------------------------------
app.get('/api/orders', (_req: Request, res: Response) => {
  const orders = readJsonFile<any[]>(ORDERS_FILE, []);
  res.json({ success: true, orders });
});

app.post('/api/orders', (req: Request, res: Response) => {
  const newOrder = req.body;
  if (!newOrder || !newOrder.orderId) {
    return res.status(400).json({ success: false, error: 'Order ID is required' });
  }

  const orders = readJsonFile<any[]>(ORDERS_FILE, []);
  const cleanId = String(newOrder.orderId).replace('#', '');

  // Check if order already exists
  const existingIdx = orders.findIndex(
    (o) => o.orderId === newOrder.orderId || String(o.orderId).replace('#', '') === cleanId
  );

  const enrichedOrder = {
    ...newOrder,
    createdAt: newOrder.createdAt || newOrder.orderTime || new Date().toISOString(),
    serverReceivedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    orders[existingIdx] = { ...orders[existingIdx], ...enrichedOrder };
  } else {
    orders.unshift(enrichedOrder);
  }

  writeJsonFile(ORDERS_FILE, orders);
  broadcastOrders(orders);

  res.json({ success: true, order: enrichedOrder });
});

app.patch('/api/orders/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  const cleanId = String(id).replace('#', '');

  const orders = readJsonFile<any[]>(ORDERS_FILE, []);
  const targetIdx = orders.findIndex(
    (o) => o.orderId === id || String(o.orderId).replace('#', '') === cleanId
  );

  if (targetIdx === -1) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  orders[targetIdx] = {
    ...orders[targetIdx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  writeJsonFile(ORDERS_FILE, orders);
  broadcastOrders(orders);

  res.json({ success: true, order: orders[targetIdx] });
});

app.delete('/api/orders/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const cleanId = String(id).replace('#', '');

  let orders = readJsonFile<any[]>(ORDERS_FILE, []);
  orders = orders.filter(
    (o) => o.orderId !== id && String(o.orderId).replace('#', '') !== cleanId
  );

  writeJsonFile(ORDERS_FILE, orders);
  broadcastOrders(orders);

  res.json({ success: true });
});

// -------------------------------------------------------------
// Steadfast Courier API Proxies
// -------------------------------------------------------------
app.all('/api/steadfast/balance', async (req: Request, res: Response) => {
  const apiKey = (req.headers['api-key'] as string) || req.body?.apiKey;
  const secretKey = (req.headers['secret-key'] as string) || req.body?.secretKey;

  if (!apiKey || !secretKey) {
    return res.status(400).json({ status: 400, message: 'API Key ও Secret Key প্রয়োজন' });
  }

  try {
    const apiRes = await fetch('https://portal.packzy.com/api/v1/get_balance', {
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
    });

    const data = await apiRes.json();
    res.status(apiRes.status).json(data);
  } catch (fetchErr: any) {
    res.status(502).json({ status: 502, message: fetchErr?.message || 'Steadfast সংযোগ ব্যর্থ' });
  }
});

app.post('/api/steadfast/create_order', async (req: Request, res: Response) => {
  const apiKey = (req.headers['api-key'] as string) || req.body?.apiKey;
  const secretKey = (req.headers['secret-key'] as string) || req.body?.secretKey;
  const payload = req.body?.orderData || req.body;

  if (!apiKey || !secretKey) {
    return res.status(400).json({ status: 400, message: 'API Key ও Secret Key প্রয়োজন' });
  }

  try {
    const apiRes = await fetch('https://portal.packzy.com/api/v1/create_order', {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await apiRes.json();
    res.status(apiRes.status).json(data);
  } catch (fetchErr: any) {
    res.status(502).json({ status: 502, message: fetchErr?.message || 'বুকিং ব্যর্থ' });
  }
});

app.all('/api/steadfast/status', async (req: Request, res: Response) => {
  const apiKey = (req.headers['api-key'] as string) || req.body?.apiKey;
  const secretKey = (req.headers['secret-key'] as string) || req.body?.secretKey;
  const cid = req.body?.consignmentId || req.body?.cid || req.query?.cid;
  const trackingCode = req.body?.trackingCode || req.query?.trackingCode;

  if (!apiKey || !secretKey) {
    return res.status(400).json({ status: 400, message: 'API Key ও Secret Key প্রয়োজন' });
  }

  let targetUrl = `https://portal.packzy.com/api/v1/status_by_cid/${cid}`;
  if (trackingCode) {
    targetUrl = `https://portal.packzy.com/api/v1/status_by_trackingcode/${trackingCode}`;
  }

  try {
    const apiRes = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
    });

    const data = await apiRes.json();
    res.status(apiRes.status).json(data);
  } catch (fetchErr: any) {
    res.status(502).json({ status: 502, message: fetchErr?.message || 'স্ট্যাটাস চেক ব্যর্থ' });
  }
});

// -------------------------------------------------------------
// Vite Dev Server Middleware or Static Production Serving
// -------------------------------------------------------------
async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: Number(PORT) },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
