import { createApp } from './app.js';
import { config, ROOT } from './config.js';
import fs from 'node:fs';
import path from 'node:path';

const settings = config();
if (!['127.0.0.1', 'localhost'].includes(settings.host) && settings.password.length < 12) {
  console.error('LAN access requires APP_PASSWORD with at least 12 characters.');
  process.exit(1);
}
const app = createApp();
function listen(port, attempt = 0) {
  const server = app.listen(port, settings.host, () => {
    const info = { pid: process.pid, host: settings.host, port, url: `http://127.0.0.1:${port}` };
    fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'tmp/server.json'), JSON.stringify(info));
    console.log(`GEO workspace ready: ${info.url}`);
  });
  server.on('error', error => {
    if (error.code === 'EADDRINUSE' && attempt < 20) listen(port + 1, attempt + 1);
    else { console.error('Unable to start server:', error.code); process.exit(1); }
  });
}
listen(settings.port);
