const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Remove query params and decode URL
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  // 1. Try exact requested relative path
  let filePath = path.join(ROOT_DIR, reqPath);

  // 2. If not found, try finding file by basename in ROOT_DIR
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const base = path.basename(reqPath);
    const candidateInRoot = path.join(ROOT_DIR, base);
    if (fs.existsSync(candidateInRoot) && !fs.statSync(candidateInRoot).isDirectory()) {
      filePath = candidateInRoot;
    }
  }

  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    const stat = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Support HTTP Range headers for media (audio/video)
    const range = req.headers.range;
    if (range && (contentType.startsWith('audio/') || contentType.startsWith('video/'))) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  } else {
    // 404 handler
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found: ' + reqPath);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`Server is running at: http://localhost:${PORT}`);
  console.log(`Serving Three.js / WebGL site from: ${ROOT_DIR}`);
  console.log(`====================================================`);
});
