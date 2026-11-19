#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const PORT = +process.argv[2] || 5197;
const INQUIRY_LOG = path.join(ROOT, 'data', 'inquiries-log.jsonl');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4a': 'audio/mp4',
  '.gltf': 'model/gltf+json',
  '.glb': 'model/gltf-binary',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

const ROUTE_MAP = {
  '/': 'index.html',
  '/map': 'map.html',
  '/flats': 'properties.html',
  '/properties': 'properties.html',
  '/projects': 'projects.html',
  '/architecture': 'projects.html',
  '/services': 'services.html',
  '/spaces': 'services.html',
  '/about': 'about.html',
  '/location': 'about.html',
  '/agreement': 'about.html',
  '/privacy-policy': 'about.html'
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  if (urlPath === '/api/contact.json' || urlPath === '/api/favourites/pdf/mail') {
    let body = '';
    req.on('data', ch => { body += ch; });
    req.on('end', () => {
      try {
        fs.appendFileSync(INQUIRY_LOG, JSON.stringify({ ts: new Date().toISOString(), path: urlPath, body }) + '\n');
      } catch (_) {}
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: true, ok: true, message: 'Thank you. RG Constructions has received your enquiry.' }));
    });
    return;
  }

  if (urlPath === '/api/flats/favourites.json') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ status: true, data: [] }));
  }

  const mapped = ROUTE_MAP[urlPath];
  const rel = mapped ? mapped : urlPath.replace(/^\/+/, '');
  let filePath = path.join(ROOT, rel);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (fs.existsSync(filePath + '.html')) filePath += '.html';
    else { res.writeHead(404); return res.end('Not Found: ' + urlPath); }
  }

  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const type = TYPES[ext] || 'application/octet-stream';
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': type,
      'Access-Control-Allow-Origin': '*'
    });
    return fs.createReadStream(filePath, { start, end }).pipe(res);
  }
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': stat.size,
    'Access-Control-Allow-Origin': '*'
  });
  fs.createReadStream(filePath).pipe(res);
}).listen(PORT, () => console.log('Beyond Bricks · RG Constructions server listening on http://localhost:' + PORT));
