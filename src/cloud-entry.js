const { makeClient, synchronize } = require('./cloud-sync');
const CONFIG_KEY = 'java-ai-lab.cloud-config.v1';
let client = null, config = null, status = '未配置 Supabase 项目，进度保存在本机。';
let conflicts = [], choices = {}, busy = false, dirty = false, timer = null, subscription = null, retryCount = 0;
function message(text) { status = text; const e = document.getElementById('cloudStatus'); if (e) e.textContent = text; }
function show() {
  const u = document.getElementById('cloudUrl'), k = document.getElementById('cloudKey');
  if (!u || !k) return;
  if (config) { u.value = config.url; k.value = config.key; }
  message(status);
  const host = document.getElementById('cloudConflicts');
  if (!host) return;
  host.textContent = '';
  conflicts.forEach(c => {
    const box = document.createElement('div'), title = document.createElement('p');
    title.textContent = '草稿冲突：' + c.chapter + '。请选择要保留的代码：'; box.appendChild(title);
    [['local', '本机版本', c.local], ['remote', '云端版本', c.remote]].forEach(([choice, label, code]) => {
      const h = document.createElement('strong'), pre = document.createElement('pre'), button = document.createElement('button');
      h.textContent = label; pre.textContent = code; pre.style.cssText = 'white-space:pre-wrap;max-height:200px;overflow:auto';
      button.type = 'button'; button.className = 'btn sm'; button.textContent = '保留' + label;
      button.addEventListener('click', () => { choices[c.chapter] = { local: c.local, remote: c.remote, choice }; conflicts = conflicts.filter(x => x.chapter !== c.chapter); show(); schedule(50); });
      box.append(h, pre, button);
    });
    host.appendChild(box);
  });
}
function schedule(ms = 1500) {
  if (!client) return;
  dirty = true;
  clearTimeout(timer); timer = setTimeout(() => run().catch(e => message('同步失败：' + (e.message || '请检查网络或项目配置'))), ms);
}
async function run() {
  if (!client || busy) return;
  dirty = false;
  if (!navigator.onLine) { message('离线：进度保存在本机，联网后会重试。'); return; }
  busy = true;
  try {
    const auth = await client.auth.getUser();
    if (auth.error || !auth.data.user) { message('未登录：本地进度可继续使用。'); return; }
    const user = auth.data.user, baseKey = 'java-ai-lab.sync-base.v1.' + config.url + '.' + user.id;
    const ownerKey = 'java-ai-lab.sync-owner.v1', owner = config.url + '|' + user.id;
    if (localStorage.getItem(ownerKey) && localStorage.getItem(ownerKey) !== owner) { message('本机进度已关联其他账号；请登录原账号或使用另一个浏览器，避免混合不同用户的数据。'); return; }
    let base;
    try { base = JSON.parse(localStorage.getItem(baseKey) || 'null') || undefined; } catch (_) { base = undefined; }
    message('正在同步…');
    const result = await synchronize(client, user.id, base, window.CourseBridge.snapshot, window.CourseBridge.apply, choices, window.CourseBridge.canApply);
    if (result.status === 'conflict') { conflicts = result.conflicts; message('发现草稿冲突，请选择保留的版本。'); show(); return; }
    if (result.status === 'editing') { message('检测到正在编辑代码，离开编辑框后继续同步。'); return; }
    if (result.status === 'retry') {
      retryCount++;
      if (retryCount > 4) { message('暂时无法同步，请检查数据库权限后手动重试。'); return; }
      message('数据正在变化，稍后重试。'); schedule(1500 * retryCount); return;
    }
    localStorage.setItem(baseKey, JSON.stringify(result.base));
    localStorage.setItem(ownerKey, owner);
    retryCount = 0; conflicts = []; choices = {}; message('同步完成。'); show();
  } finally { busy = false; if (dirty && navigator.onLine) schedule(1500); }
}
function configure(url, key) {
  if (busy) throw new Error('同步正在进行，请稍后再切换项目。');
  const next = makeClient(url.trim(), key.trim()); // 校验成功后才写配置
  conflicts = []; choices = {}; retryCount = 0;
  config = { url: new URL(url.trim()).origin, key: key.trim() };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); client = next;
  if (subscription) subscription.unsubscribe();
  subscription = client.auth.onAuthStateChange(() => { setTimeout(() => schedule(0), 0); }).data.subscription;
  message('项目已配置；请使用邮箱验证码登录。'); show(); schedule(0);
}
async function action(target) {
  if (target.closest('[data-cloud-config]')) { configure(document.getElementById('cloudUrl').value, document.getElementById('cloudKey').value); return; }
  if (!client) throw new Error('请先配置 Supabase 项目地址和公开密钥。');
  if (target.closest('[data-cloud-send]')) {
    const email = document.getElementById('cloudEmail').value.trim();
    if (!email) throw new Error('请输入邮箱。');
    const result = await client.auth.signInWithOtp({ email }); if (result.error) throw result.error;
    message('已请求发送验证码，请查看邮箱。');
  } else if (target.closest('[data-cloud-verify]')) {
    const email = document.getElementById('cloudEmail').value.trim(), token = document.getElementById('cloudOtp').value.trim();
    const result = await client.auth.verifyOtp({ email, token, type: 'email' }); if (result.error) throw result.error;
    document.getElementById('cloudOtp').value = ''; message('登录成功，正在同步。'); schedule(0);
  } else if (target.closest('[data-cloud-now]')) { retryCount = 0; schedule(0); }
  else if (target.closest('[data-cloud-logout]')) { const result = await client.auth.signOut(); if (result.error) throw result.error; conflicts = []; choices = {}; message('已退出登录，本机数据保留。'); show(); }
}
document.addEventListener('click', event => {
  if (!event.target.closest || !event.target.closest('[data-cloud-config],[data-cloud-send],[data-cloud-verify],[data-cloud-now],[data-cloud-logout]')) return;
  action(event.target).catch(error => message('操作失败：' + (error.message || '请检查配置和网络。')));
});
window.addEventListener('course-page-rendered', show);
window.addEventListener('course-state-change', () => schedule());
window.addEventListener('online', () => schedule(0));
setInterval(() => { if (!document.hidden) schedule(0); }, 30000);
document.addEventListener('focusout', event => { if (event.target && event.target.id === 'exEditor') schedule(500); });
try { const saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); if (saved) configure(saved.url, saved.key); else show(); } catch (_) { message('同步配置无效，请重新填写。'); }
