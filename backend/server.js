/**
 * MEDSHELF - Full-Stack Smart Medicine Expiry Tracker for Home Use
 * Entry Point: Node.js / Express Server (backend/server.js)
 * 
 * Features:
 * - Express.js REST API with CORS and JSON parsing
 * - Serves frontend static files seamlessly
 * - Graceful fallback to native Node.js HTTP if npm install has not been run
 * - Mounts Auth, Medicines, and Dashboard API endpoints
 */

const path = require('path');
const fs = require('fs');
const http = require('http');

const PORT = parseInt(process.env.PORT || '5000', 10);
const FRONTEND_DIR = path.join(__dirname, '../frontend');

// Attempt to load Express; if not installed, provide native HTTP server
let useExpress = false;
let expressApp = null;

try {
  const express = require('express');
  const cors = require('cors');

  expressApp = express();
  useExpress = true;

  // Middleware
  expressApp.use(cors());
  expressApp.use(express.json());
  expressApp.use(express.urlencoded({ extended: true }));

  // API Routes
  expressApp.use('/api/auth', require('./routes/auth.routes'));
  expressApp.use('/api/medicines', require('./routes/medicines.routes'));
  expressApp.use('/api/dashboard', require('./routes/dashboard.routes'));

  // Health check endpoint
  expressApp.get('/api/health', (req, res) => {
    res.json({
      status: 'UP',
      appName: 'MedShelf',
      timestamp: new Date().toISOString(),
      database: require('./config/db').getDbType()
    });
  });

  // Serve static frontend assets
  expressApp.use(express.static(FRONTEND_DIR));

  // Serve login as default entry if route not matched
  expressApp.get('*', (req, res) => {
    const requestedPath = path.join(FRONTEND_DIR, req.path);
    if (fs.existsSync(requestedPath) && fs.statSync(requestedPath).isFile()) {
      return res.sendFile(requestedPath);
    }
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });

  const server = expressApp.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(` MedShelf Full-Stack Server Running on Port ${PORT}`);
    console.log(` Local URL: http://localhost:${PORT}`);
    console.log(` Frontend:  ${FRONTEND_DIR}`);
    console.log(`========================================================`);
  });

  server.on('error', (err) => {
    console.error('[Server Error]:', err.message);
  });

} catch (e) {
  // Graceful Native Node.js HTTP Server Fallback (Runs with ZERO npm dependencies!)
  console.log('[Server] Express module not detected. Starting native Node.js HTTP server...');

  const authController = require('./controllers/auth.controller');
  const medicinesController = require('./controllers/medicines.controller');
  const dashboardController = require('./controllers/dashboard.controller');
  const { authenticateToken } = require('./middleware/auth');

  // Helper to parse JSON body
  function parseBody(req) {
    return new Promise((resolve) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (err) {
          resolve({});
        }
      });
    });
  }

  // Response helpers
  function sendJson(res, statusCode, obj) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end(JSON.stringify(obj));
  }

  // Native MIME types
  const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.png': 'image/png',
    '.ico': 'image/x-icon'
  };

  const nativeServer = http.createServer(async (req, res) => {
    // Enable CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      return res.end();
    }

    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = parsedUrl.pathname;
    req.query = Object.fromEntries(parsedUrl.searchParams);
    req.body = await parseBody(req);

    // Mock Express res methods
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (obj) => sendJson(res, res.statusCode || 200, obj);

    // API Routing
    if (pathname.startsWith('/api/')) {
      // Health check
      if (pathname === '/api/health' && req.method === 'GET') {
        return res.json({
          status: 'UP',
          appName: 'MedShelf',
          timestamp: new Date().toISOString(),
          database: require('./config/db').getDbType()
        });
      }

      // Auth routes
      if (pathname === '/api/auth/register' && req.method === 'POST') {
        return authController.register(req, res);
      }
      if (pathname === '/api/auth/login' && req.method === 'POST') {
        return authController.login(req, res);
      }
      if (pathname === '/api/auth/reset-password' && req.method === 'POST') {
        return authController.resetPassword(req, res);
      }

      // Protected routes authentication wrapper
      return authenticateToken(req, res, async () => {
        if (pathname === '/api/auth/me' && req.method === 'GET') {
          return authController.getProfile(req, res);
        }
        if (pathname === '/api/dashboard/stats' && req.method === 'GET') {
          return dashboardController.getDashboardStats(req, res);
        }

        // Medicines Routes
        if (pathname === '/api/medicines/seed-demo' && req.method === 'POST') {
          return medicinesController.seedDemoData(req, res);
        }

        if (pathname === '/api/medicines' && req.method === 'GET') {
          return medicinesController.getAllMedicines(req, res);
        }
        if (pathname === '/api/medicines' && req.method === 'POST') {
          return medicinesController.createMedicine(req, res);
        }

        const medMatch = pathname.match(/^\/api\/medicines\/(\d+)$/);
        if (medMatch) {
          req.params = { id: medMatch[1] };
          if (req.method === 'GET') return medicinesController.getMedicineById(req, res);
          if (req.method === 'PUT') return medicinesController.updateMedicine(req, res);
          if (req.method === 'DELETE') return medicinesController.deleteMedicine(req, res);
        }

        const adjustMatch = pathname.match(/^\/api\/medicines\/(\d+)\/adjust-qty$/);
        if (adjustMatch && req.method === 'PATCH') {
          req.params = { id: adjustMatch[1] };
          return medicinesController.adjustQuantity(req, res);
        }

        return res.status(404).json({ success: false, message: 'API route not found' });
      });
    }

    // Static File Serving
    let filePath = path.join(FRONTEND_DIR, pathname === '/' ? 'index.html' : pathname);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(FRONTEND_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        });
        res.end(content);
      }
    });
  });

  nativeServer.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(` MedShelf Native Full-Stack Server Running on Port ${PORT}`);
    console.log(` Local URL: http://localhost:${PORT}`);
    console.log(` Frontend:  ${FRONTEND_DIR}`);
    console.log(`========================================================`);
  });
}
