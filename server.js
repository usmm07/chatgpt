const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_PATH = path.join(__dirname, 'data', 'contacts.json');
const DATA_DIR = path.dirname(DATA_PATH);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DATA_PATH)) {
  fs.writeFileSync(DATA_PATH, '[]', 'utf8');
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function loadContacts() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (error) {
    return [];
  }
}

function saveContacts(entries) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(entries, null, 2));
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function serveStatic(req, res) {
  const parsedUrl = url.parse(req.url);
  const safePath = path
    .normalize(parsedUrl.pathname)
    .replace(/^(\.\.[/\\])+/, '')
    .replace(/^[/\\]+/, '');
  const requestedPath = path.join(PUBLIC_DIR, safePath);

  let filePath = requestedPath;
  if (!path.extname(filePath)) {
    filePath = path.join(requestedPath, 'index.html');
  }

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { message: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { message: 'Not found' });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {};
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function handleContact(req, res) {
  parseJsonBody(req)
    .then((payload) => {
      const { name, email, phone, message } = payload || {};

      const trimmedName = typeof name === 'string' ? name.trim() : '';
      const trimmedEmail = typeof email === 'string' ? email.trim() : '';
      const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';
      const trimmedMessage = typeof message === 'string' ? message.trim() : '';

      const errors = [];
      if (!trimmedName) errors.push('Name is required');
      if (!trimmedEmail) {
        errors.push('Email is required');
      } else {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(trimmedEmail)) {
          errors.push('A valid email is required');
        }
      }

      if (errors.length) {
        sendJson(res, 400, { message: errors.join('. ') });
        return;
      }

      const newEntry = {
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        message: trimmedMessage,
        timestamp: new Date().toISOString(),
      };

      try {
        const entries = loadContacts();
        entries.push(newEntry);
        saveContacts(entries);
      } catch (error) {
        console.error('Failed to save contact entry', error);
        sendJson(res, 500, { message: 'Unable to save your request right now. Please try again later.' });
        return;
      }

      sendJson(res, 201, { message: 'Thanks for reaching out! We will respond soon.' });
    })
    .catch(() => {
      sendJson(res, 400, { message: 'Invalid request payload' });
    });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (req.method === 'GET' && parsedUrl.pathname === '/api/health') {
    sendJson(res, 200, { status: 'ok', service: 'diio-site' });
    return;
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/api/contact') {
    handleContact(req, res);
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res);
    return;
  }

  sendJson(res, 404, { message: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`Diio site running at http://localhost:${PORT}`);
});
