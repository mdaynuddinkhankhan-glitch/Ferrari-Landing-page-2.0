import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

function steadfastProxyPlugin(): Plugin {
  return {
    name: 'steadfast-proxy',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url?.startsWith('/api/steadfast')) {
          return next();
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        try {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            let parsedBody: any = {};
            try {
              if (body) parsedBody = JSON.parse(body);
            } catch {
              // ignore
            }

            const apiKey = (req.headers['api-key'] as string) || parsedBody.apiKey;
            const secretKey = (req.headers['secret-key'] as string) || parsedBody.secretKey;

            if (req.url === '/api/steadfast/balance') {
              if (!apiKey || !secretKey) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 400, message: 'API Key ও Secret Key প্রয়োজন' }));
                return;
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
                res.writeHead(apiRes.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
              } catch (fetchErr: any) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 502, message: fetchErr?.message || 'Steadfast সংযোগ ব্যর্থ' }));
              }
              return;
            }

            if (req.url === '/api/steadfast/create_order') {
              if (!apiKey || !secretKey) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 400, message: 'API Key ও Secret Key প্রয়োজন' }));
                return;
              }

              try {
                const apiRes = await fetch('https://portal.packzy.com/api/v1/create_order', {
                  method: 'POST',
                  headers: {
                    'Api-Key': apiKey,
                    'Secret-Key': secretKey,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(parsedBody.orderData || parsedBody),
                });

                const data = await apiRes.json();
                res.writeHead(apiRes.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
              } catch (fetchErr: any) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 502, message: fetchErr?.message || 'বুকিং ব্যর্থ' }));
              }
              return;
            }

            if (req.url === '/api/steadfast/status') {
              if (!apiKey || !secretKey) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 400, message: 'API Key ও Secret Key প্রয়োজন' }));
                return;
              }

              const cid = parsedBody.consignmentId || parsedBody.cid;
              const trackingCode = parsedBody.trackingCode;
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
                res.writeHead(apiRes.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
              } catch (fetchErr: any) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 502, message: fetchErr?.message || 'স্ট্যাটাস চেক ব্যর্থ' }));
              }
              return;
            }

            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Endpoint not found' }));
          });
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err?.message || 'Internal proxy error' }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), steadfastProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      cors: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
