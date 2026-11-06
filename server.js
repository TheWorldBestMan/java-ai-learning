/* 零依赖静态服务器：本地预览与手机访问 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 5178);
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache'
  });
  res.end(body);
}

let diagnosticRunning = false;
function loopback(address) { return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'; }
function localHost(host) {
  try { const u = new URL('http://' + host); return ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) && Number(u.port || 80) === PORT; } catch (_) { return false; }
}
function checkTool(label, program, args, hint) {
  return new Promise(resolve => execFile(program, args, { timeout: 5000, maxBuffer: 65536, windowsHide: true, encoding: 'utf8' }, (err, stdout, stderr) => {
    const first = (stdout || stderr || '').split(/\r?\n/).map(x => x.trim()).find(Boolean);
    resolve(err ? { label, ok: false, message: hint } : { label, ok: true, output: (first || '可用').slice(0, 200) });
  }));
}
async function diagnostics(req, res) {
  if (!loopback(req.socket.remoteAddress) || !localHost(req.headers.host || '')) return send(res, 403, 'Forbidden');
  if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) return send(res, 403, 'Forbidden');
  if (req.method !== 'GET') return send(res, 405, 'Method Not Allowed');
  if (diagnosticRunning) return send(res, 429, 'Busy');
  diagnosticRunning = true;
  try {
    const isWin = process.platform === 'win32';
    const checks = await Promise.all([
      checkTool('Java', 'java', ['-version'], '未找到 Java，请安装 JDK 21 并检查 PATH。'),
      checkTool('Javac', 'javac', ['-version'], '未找到 javac，请检查是否安装 JDK。'),
      checkTool('Maven', isWin ? 'cmd.exe' : 'mvn', isWin ? ['/d', '/s', '/c', 'mvn -v'] : ['-v'], '未找到 Maven 或 JAVA_HOME 不正确；可在项目目录运行 Maven Wrapper。'),
      checkTool('Git', 'git', ['--version'], '未找到 Git，请安装并检查 PATH。'),
      checkTool('Docker 客户端', 'docker', ['--version'], '未找到 Docker 客户端，请安装 Docker Desktop。'),
      checkTool('Docker 引擎', 'docker', ['version', '--format', '{{.Server.Version}}'], '引擎不可用，请启动 Docker Desktop 并查看其错误提示。')
    ]);
    send(res, 200, JSON.stringify({ checks }), 'application/json; charset=utf-8');
  } finally { diagnosticRunning = false; }
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch (e) {
    return send(res, 400, 'Bad Request');
  }
  if (pathname === '/api/diagnostics') { diagnostics(req, res).catch(() => send(res, 500, 'Diagnostics failed')); return; }
  if (pathname === '/') pathname = '/index.html';

  const target = path.resolve(ROOT, '.' + pathname);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    return send(res, 403, 'Forbidden');
  }

  fs.stat(target, (err, stat) => {
    if (err || !stat.isFile()) {
      return send(res, 404, 'Not Found');
    }
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(target).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log('Java x AI 学习站已启动');
  console.log('本机访问: http://127.0.0.1:' + PORT);
  const nets = os.networkInterfaces();
  Object.keys(nets).forEach((name) => {
    (nets[name] || []).forEach((net) => {
      if (net.family === 'IPv4' && !net.internal) {
        console.log('局域网访问: http://' + net.address + ':' + PORT);
      }
    });
  });
  console.log('按 Ctrl+C 停止');
});
