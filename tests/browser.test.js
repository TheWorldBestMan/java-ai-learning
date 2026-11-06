/* 无依赖 CDP 冒烟测试：真实 Edge 渲染、交互、截图 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9337;
const BASE = process.env.TEST_BASE || 'http://127.0.0.1:5178';
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'learning-site-shots-'));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'learning-site-edge-'));

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForJson(url, tries) {
  for (let i = 0; i < (tries || 60); i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) { /* retry */ }
    await sleep(250);
  }
  throw new Error('timeout waiting for ' + url);
}

async function main() {
  const proc = spawn(EDGE, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + profile,
    '--window-size=1440,1200',
    'about:blank'
  ], { stdio: 'ignore' });

  const pages = await waitForJson('http://127.0.0.1:' + PORT + '/json/list');
  const page = pages.find(p => p.type === 'page' && (p.url === 'about:blank' || p.url.startsWith('http')));
  if (!page) throw new Error('no usable page target: ' + JSON.stringify(pages.map(p => ({ type: p.type, url: p.url }))));
  const wsUrl = page.webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let seq = 0;
  const pending = new Map();
  const errors = [];
  const consoleErrors = [];

  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    if (msg.id) {
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails || {};
      errors.push((d.exception && d.exception.description) || d.text || 'exception');
    }
    if (msg.method === 'Log.entryAdded') {
      const e = msg.params.entry;
      if (e.level === 'error') errors.push(e.text + ' ' + (e.url || ''));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push((msg.params.args || []).map(a => a.value || a.description || '').join(' '));
    }
  };

  function send(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }

  async function evalJs(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
      userGesture: true
    });
    if (res.exceptionDetails) {
      throw new Error('eval failed: ' + (res.exceptionDetails.text || '') + ' ' +
        (res.exceptionDetails.exception ? res.exceptionDetails.exception.description : ''));
    }
    return res.result ? res.result.value : undefined;
  }

  async function goto(hash) {
    await evalJs('location.hash = ' + JSON.stringify(hash));
    await sleep(450);
  }

  async function shot(file, full) {
    let params = { format: 'png' };
    if (full) {
      const metrics = await send('Page.getLayoutMetrics');
      const size = metrics.cssContentSize || metrics.contentSize;
      params = {
        format: 'png',
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width: 1440, height: Math.min(size.height, 5000), scale: 1 }
      };
    }
    const res = await send('Page.captureScreenshot', params);
    fs.writeFileSync(path.join(OUT, file), Buffer.from(res.data, 'base64'));
    return file;
  }

  const checks = [];
  function check(name, ok, detail) {
    checks.push({ name, ok: !!ok, detail: detail || '' });
    if (!ok) console.log('FAIL ' + name + ' :: ' + (detail || ''));
    else console.log('ok   ' + name);
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.navigate', { url: BASE + '/#/home' });
  let heroReady = false;
  for (let i = 0; i < 50; i++) {
    try {
      heroReady = await evalJs('!!document.querySelector(".hero")');
    } catch (e) { heroReady = false; }
    if (heroReady) break;
    await sleep(200);
  }
  if (!heroReady) {
    console.log('DEBUG url=' + (await evalJs('location.href')));
    console.log('DEBUG body=' + (await evalJs('document.body.innerText.slice(0, 500)')));
    console.log('DEBUG html=' + (await evalJs('document.body.innerHTML.slice(0, 500)')));
  }
  check('home hero renders', heroReady);
  check('home title', (await evalJs('document.querySelector(".hero h1").textContent')).indexOf('大模型应用工程师') >= 0);
  check('sidebar chapters', (await evalJs('document.querySelectorAll(".nav-chapter").length')) === 24);
  check('capability matrix', (await evalJs('document.querySelectorAll(".matrix-row").length')) >= 7);
  await shot('test-home.png', true);

  // 搜索
  await evalJs('(function(){var i=document.querySelector("#searchInput");i.value="熔断";i.dispatchEvent(new Event("input",{bubbles:true}));})()');
  await sleep(120);
  check('search results', (await evalJs('document.querySelectorAll("#searchResults button").length')) > 0);

  // 章节 + 测验 + 练习
  await goto('#/chapter/env');
  check('chapter page', (await evalJs('!!document.querySelector(".chapter-header h1")')));
  check('quiz options', (await evalJs('document.querySelectorAll(".quiz-opt").length')) === 8);
  await evalJs('(function(){var ch=window.CHAPTERS.find(function(c){return c.id==="env";});ch.quiz.forEach(function(q,i){var b=document.querySelector("[data-quiz=\\""+i+"\\"][data-opt=\\""+q.answer+"\\"]");if(b)b.click();});})()');
  await sleep(300);
  check('quiz score 2/2', (await evalJs('document.querySelector("#quizScore").textContent')).indexOf('2 / 2') >= 0);
  await evalJs('(function(){var ch=window.CHAPTERS.find(function(c){return c.id==="env";});var ed=document.querySelector("#exEditor");ed.value=ch.exercise.solution;ed.dispatchEvent(new Event("input",{bubbles:true}));document.querySelector("[data-ex-check]").click();})()');
  await sleep(350);
  check('exercise checks pass', (await evalJs('document.querySelectorAll("#exChecks .check-item.pass").length')) === 5);
  check('chapter completed', (await evalJs('localStorage.getItem("java-ai-lab.progress.v1")')).indexOf('"done":true') >= 0);
  check('aside progress 100%', (await evalJs('document.querySelector("#asidePct").textContent')) === '100%');
  await shot('test-chapter.png', true);

  await goto('#/chapter/spring-boot');
  check('spring introductory example renders', await evalJs('document.body.innerText.includes("从 Java 对象到 Spring") && document.body.innerText.includes("GreetingService.java")'));
  check('chapter navigation rendered', await evalJs('document.querySelectorAll(".chapter-toc a").length > 3'));
  await evalJs('document.querySelector("[data-bookmark]").click()');
  check('chapter bookmark persists', await evalJs('document.querySelector("[data-bookmark]").getAttribute("aria-pressed") === "true"'));
  await evalJs('document.querySelector(".chapter-toc a").click()');
  await sleep(800);
  check('chapter heading route resolves', await evalJs('location.hash.includes("/s") && !!document.querySelector(".lesson-h2[id]")'));
  check('chapter reading position saved', await evalJs('!!JSON.parse(localStorage.getItem("java-ai-lab.progress.v1")).reading["spring-boot"]'));
  await goto('#/home');
  await goto('#/chapter/spring-boot');
  check('chapter reading position restored', await evalJs('(function(){var p=JSON.parse(localStorage.getItem("java-ai-lab.progress.v1")).reading["spring-boot"];var h=document.getElementById("section-"+p);return !!h && Math.abs(h.getBoundingClientRect().top)<160})()'));
  check('spring example download link', await evalJs('Array.from(document.querySelectorAll("a[download]")).some(function(a){return a.getAttribute("href") === "examples/downloads/spring-greeting.zip";})'));
  check('spring example download available', await evalJs('fetch("examples/downloads/spring-greeting.zip").then(function(r){return r.ok && r.headers.get("content-length") > 1000;})'));
  check('exercise limitation is visible', await evalJs('document.body.innerText.includes("不会编译、运行代码或验证行为")'));
  await goto('#/chapter/env');
  check('saved exercise and completion survive navigation', await evalJs('(function(){var s=JSON.parse(localStorage.getItem("java-ai-lab.progress.v1"));return !!s.chapters.env.done && document.querySelector("#exEditor").value === s.exercises.env.code;})()'));
  await evalJs('(function(){var e=document.querySelector("#exEditor");e.value += "\\n// edit";e.dispatchEvent(new Event("input",{bubbles:true}))})()');
  check('editing invalidates old exercise check', await evalJs('document.querySelector("#exTag").textContent.includes("待重新检查") && document.querySelectorAll("#exChecks .pass").length===0'));
  await evalJs('(function(){var e=document.querySelector("#exEditor");e.value=window.CHAPTERS.find(function(c){return c.id==="env"}).exercise.solution;e.dispatchEvent(new Event("input",{bubbles:true}));document.querySelector("[data-ex-check]").click()})()');
  check('exercise can be rechecked', await evalJs('document.querySelectorAll("#exChecks .pass").length===5'));
  await goto('#/chapter/java-core');
  check('java practice download available', await evalJs('fetch("examples/downloads/java-core-practice.zip").then(function(r){return r.ok && r.headers.get("content-length") > 1000;})'));
  await goto('#/chapter/spring-ai');
  check('spring ai walkthrough and version note', await evalJs('document.body.innerText.includes("从已有 Spring 项目接到一次模型响应") && document.body.innerText.includes("Chat 与 Embedding 可以是不同服务")'));
  await goto('#/chapter/rag-eval');
  check('rag metrics example renders', await evalJs('document.body.innerText.includes("Recall@3 = 1/2 = 0.5") && document.body.innerText.includes("无答案题要单独评估")'));
  await goto('#/chapter/rag-basic');
  check('rag tenant filter safety note renders', await evalJs('document.body.innerText.includes("tenantId 必须来自可信认证上下文")'));
  await goto('#/chapter/llm-basics');
  await evalJs('(function(){var q=window.CHAPTERS.find(function(c){return c.id==="llm-basics"}).quiz[0];var wrong=(q.answer+1)%q.options.length;Array.from(document.querySelectorAll("[data-quiz]")).find(function(b){return +b.dataset.quiz===0 && +b.dataset.opt===wrong}).click()})()');
  await goto('#/review');
  check('wrong answer enters review', await evalJs('!!document.querySelector("[data-review-ch=llm-basics]")'));
  await evalJs('(function(){var q=window.CHAPTERS.find(function(c){return c.id==="llm-basics"}).quiz[0];Array.from(document.querySelectorAll("[data-review-ch]")).find(function(b){return b.dataset.reviewCh==="llm-basics" && +b.dataset.reviewOpt===q.answer}).click()})()');
  check('review answer marks reviewed', await evalJs('document.body.innerText.includes("已复习")'));
  await goto('#/backup');
  check('backup export contains progress', await evalJs('(async function(){var orig=URL.createObjectURL,click=HTMLAnchorElement.prototype.click,blob;URL.createObjectURL=function(b){blob=b;return "blob:test"};HTMLAnchorElement.prototype.click=function(){};document.querySelector("[data-export-backup]").click();URL.createObjectURL=orig;HTMLAnchorElement.prototype.click=click;var d=JSON.parse(await blob.text());return d.format==="java-ai-learning-backup" && !!d.state.chapters.env.done})()'));
  await evalJs('(function(){localStorage.setItem("java-ai-lab.token.v1",JSON.stringify({input:123}));var s=JSON.parse(localStorage.getItem("java-ai-lab.progress.v1"));s.exercises.env.code="backup conflict";s.chapters["java-core"]={done:true};var q=window.CHAPTERS.find(function(c){return c.id==="rag-prod"}).quiz[0];s.quiz["rag-prod"]={answers:{0:(q.answer+1)%q.options.length}};var d={format:"java-ai-learning-backup",version:1,exportedAt:"2026-01-01",state:s,labs:{"java-ai-lab.token.v1":{input:456,output:789}}};var dt=new DataTransfer();dt.items.add(new File([JSON.stringify(d)],"backup.json",{type:"application/json"}));var f=document.querySelector("#backupFile");f.files=dt.files;f.dispatchEvent(new Event("change",{bubbles:true}));})()');
  await sleep(300);
  check('backup preview rendered', await evalJs('!!document.querySelector("[data-confirm-import]")'));
  await evalJs('document.querySelector("[data-confirm-import]").click()');
  check('backup merges completion and preserves draft', await evalJs('(function(){var s=JSON.parse(localStorage.getItem("java-ai-lab.progress.v1"));return s.chapters["java-core"].done && s.exercises.env.code!=="backup conflict"})()'));
  check('backup merges lab parameters', await evalJs('(function(){var s=JSON.parse(localStorage.getItem("java-ai-lab.token.v1"));return s.input===123 && s.output===789})()'));
  await goto('#/review');
  check('legacy wrong answers enter review', await evalJs('!!document.querySelector("[data-review-ch=rag-prod]")'));
  await goto('#/backup');
  await evalJs('(function(){var dt=new DataTransfer();dt.items.add(new File(["not json"],"bad.json"));var f=document.querySelector("#backupFile");f.files=dt.files;f.dispatchEvent(new Event("change",{bubbles:true}));})()');
  await sleep(200);
  check('invalid backup does not change state', await evalJs('document.querySelector("#backupPreview").textContent.includes("当前数据未改变") && JSON.parse(localStorage.getItem("java-ai-lab.progress.v1")).chapters["java-core"].done'));
  await goto('#/diagnostics');
  check('diagnostics page renders', await evalJs('document.body.innerText.includes("本机环境诊断")'));
  await goto('#/cloud');
  check('cloud page defaults to local mode', await evalJs('document.querySelector("#cloudStatus").textContent.includes("未配置")'));
  await evalJs('(function(){document.querySelector("#cloudUrl").value="https://example.supabase.co";document.querySelector("#cloudKey").value="sb_secret_do_not_save";document.querySelector("[data-cloud-config]").click()})()');
  await sleep(100);
  check('cloud rejects secret keys', await evalJs('document.querySelector("#cloudStatus").textContent.includes("不要填写 secret") && !localStorage.getItem("java-ai-lab.cloud-config.v1")'));

  // Token lab
  await goto('#/lab/token');
  check('token lab monthly', (await evalJs('document.querySelector("#tk-monthly").textContent')).indexOf('—') < 0);
  const before = await evalJs('document.querySelector("#tk-monthly").textContent');
  await evalJs('(function(){var i=document.querySelector("#tk-calls");i.value=4000;i.dispatchEvent(new Event("input",{bubbles:true}));})()');
  await sleep(150);
  const after = await evalJs('document.querySelector("#tk-monthly").textContent');
  check('token recalcs', before !== after, before + ' -> ' + after);
  await shot('test-token.png', false);

  // RAG lab
  await goto('#/lab/rag');
  await evalJs('document.querySelector("#rag-run").click()');
  await sleep(800);
  check('rag chunks rendered', (await evalJs('document.querySelectorAll(".rag-chunk").length')) === 4);
  check('rag gold hit', (await evalJs('!!document.querySelector(".hit-banner.hit")')));
  await shot('test-rag.png', true);

  // Circuit lab
  await goto('#/lab/resilience');
  await evalJs('document.querySelector("#cb-run").click()');
  await sleep(2400);
  check('circuit 30 cells', (await evalJs('document.querySelectorAll("#cb-cells .cell").length')) === 30);
  check('circuit metrics', (await evalJs('document.querySelector("#cb-success").textContent')) !== '0');
  check('circuit opened/fallback', (await evalJs('document.querySelector("#cb-degraded").textContent')) !== '0');
  await shot('test-circuit.png', false);

  // Prompt lab
  await goto('#/lab/prompt');
  check('prompt 3 versions', (await evalJs('document.querySelectorAll(".version-item").length')) === 3);
  await evalJs('(function(){var s=document.querySelector("#pl-canary");s.value=60;s.dispatchEvent(new Event("input",{bubbles:true}));})()');
  await sleep(120);
  check('prompt canary updates without rerender', (await evalJs('document.querySelector("#pl-canary-v").textContent')) === '60%');
  await evalJs('document.querySelector("#pl-publish").click()');
  await sleep(250);
  check('prompt publish v3', (await evalJs('document.querySelector("#pl-active").textContent')) === 'v3');
  await evalJs('document.querySelector("#pl-rollback").click()');
  await sleep(250);
  check('prompt rollback v2', (await evalJs('document.querySelector("#pl-active").textContent')) === 'v2');
  await shot('test-prompt.png', true);

  // Projects / Interview / Cheatsheet
  await goto('#/roadmap');
  check('roadmap 7 stages', (await evalJs('document.querySelectorAll(".stage-card").length')) === 7);
  await goto('#/project/kb');
  check('project detail milestones', (await evalJs('document.querySelectorAll(".milestone").length')) === 7);
  await goto('#/projects');
  check('2 projects', (await evalJs('document.querySelectorAll(".project-card-lg").length')) === 2);
  await goto('#/interview');
  check('30 interview qa', (await evalJs('document.querySelectorAll(".qa").length')) === 30);
  await goto('#/cheatsheet');
  check('cheatsheet tabs', (await evalJs('document.querySelectorAll(".cheat-tabs button").length')) >= 8);
  check('cheatsheet code', (await evalJs('document.querySelectorAll(".cheat-item .code-block").length')) > 0);

  // 移动端截图
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await goto('#/chapter/spring-boot');
  check('spring guide renders on mobile', await evalJs('document.body.innerText.includes("请求经过了什么")'));
  await goto('#/home');
  await evalJs('document.querySelector("#menuBtn").click()');
  await sleep(200);
  check('mobile menu opens', await evalJs('document.querySelector("#sidebar").classList.contains("open")'));
  await evalJs('document.querySelector("#backdrop").click()');
  await sleep(200);
  check('mobile menu closes', !(await evalJs('document.querySelector("#sidebar").classList.contains("open")')));
  await shot('test-mobile.png', false);
  await send('Emulation.clearDeviceMetricsOverride');

  await goto('#/home');
  await evalJs('document.querySelector("#themeBtn").click()');
  await sleep(250);
  check('light theme toggles', (await evalJs('document.documentElement.getAttribute("data-theme")')) === 'light');
  await shot('test-light.png', false);

  check('no uncaught exceptions', errors.length === 0, errors.join(' | ').slice(0, 500));
  check('no console errors', consoleErrors.length === 0, consoleErrors.join(' | ').slice(0, 500));

  const failed = checks.filter(c => !c.ok);
  console.log('\n' + (checks.length - failed.length) + '/' + checks.length + ' checks passed');
  if (failed.length) process.exitCode = 1;

  ws.close();
  proc.kill();
}

main().catch(err => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});
