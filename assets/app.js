/* =============================================================
   Java × AI 工程化 · 学习站应用逻辑
   路由、课程渲染、测验、练习、进度、搜索、项目与题库
   ============================================================= */
(function () {
  'use strict';

  var CHAPTERS = (window.CHAPTERS || []).slice();
  var STAGES = (window.STAGES || []).slice();
  var SITE = window.SITE || {};
  var PROJECTS = window.PROJECTS || [];
  var INTERVIEW = window.INTERVIEW || [];
  var CHEATSHEET = window.CHEATSHEET || { groups: [] };
  var LABS = window.LABS || [];
  var KEY = 'java-ai-lab.progress.v1';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  STAGES.forEach(function (stage) {
    stage.chapters = CHAPTERS.filter(function (ch) { return ch.stage === stage.id; });
  });

  function chapterById(id) {
    for (var i = 0; i < CHAPTERS.length; i++) if (CHAPTERS[i].id === id) return CHAPTERS[i];
    return null;
  }

  function chapterIndex(id) {
    for (var i = 0; i < CHAPTERS.length; i++) if (CHAPTERS[i].id === id) return i;
    return -1;
  }

  function stageById(id) {
    for (var i = 0; i < STAGES.length; i++) if (STAGES[i].id === id) return STAGES[i];
    return null;
  }

  function projectById(id) {
    for (var i = 0; i < PROJECTS.length; i++) if (PROJECTS[i].id === id) return PROJECTS[i];
    return null;
  }

  function labById(id) {
    for (var i = 0; i < LABS.length; i++) if (LABS[i].id === id) return LABS[i];
    return null;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function stripHtml(s) {
    return String(s || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString('zh-CN');
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  /* ---------------- 进度存储 ---------------- */
  function defaultState() {
    return {
      version: 1,
      theme: 'dark',
      xp: 0,
      chapters: {},
      exercises: {},
      quiz: {},
      review: {},
      bookmarks: {},
      reading: {},
      labs: {},
      interview: {},
      lastChapter: null,
      cheatGroup: 'java',
      updatedAt: 0
    };
  }

  function normalizeState(parsed) {
    var next = defaultState();
    if (!parsed || typeof parsed !== 'object') return next;
    Object.keys(next).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(parsed, k)) next[k] = parsed[k];
    });
    ['chapters', 'exercises', 'quiz', 'review', 'bookmarks', 'reading', 'labs', 'interview'].forEach(function (k) {
      if (!next[k] || typeof next[k] !== 'object' || Array.isArray(next[k])) next[k] = {};
    });
    if (next.theme !== 'light') next.theme = 'dark';
    if (!Number.isFinite(next.xp) || next.xp < 0) next.xp = 0;
    return next;
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? normalizeState(JSON.parse(raw)) : defaultState();
    } catch (e) {
      return defaultState();
    }
  }

  var state = loadState();
  function seedReview() { CHAPTERS.forEach(function (ch) {
    var answers = state.quiz[ch.id] && state.quiz[ch.id].answers || {};
    ch.quiz.forEach(function (q, i) {
      var key = ch.id + ':' + i;
      if (answers[i] !== undefined && answers[i] !== q.answer && state.review[key] === undefined) state.review[key] = { reviewed: false };
    });
  }); }
  seedReview();
  var saveTimer = null;

  function save() {
    state.updatedAt = Date.now();
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    }, 120);
  }

  function isChapterDone(id) {
    return !!(state.chapters[id] && state.chapters[id].done);
  }

  function doneCount() {
    return CHAPTERS.filter(function (c) { return isChapterDone(c.id); }).length;
  }

  function stageDone(stage) {
    if (!stage.chapters.length) return 0;
    return stage.chapters.filter(function (c) { return isChapterDone(c.id); }).length;
  }

  function levelInfo() {
    var level = Math.floor(state.xp / 250) + 1;
    var inLevel = state.xp % 250;
    return { level: level, inLevel: inLevel, pct: inLevel / 250 * 100 };
  }

  function quizTotal() {
    return CHAPTERS.reduce(function (sum, ch) { return sum + (ch.quiz ? ch.quiz.length : 0); }, 0);
  }

  function quizCorrectTotal() {
    var total = 0;
    CHAPTERS.forEach(function (ch) {
      var rec = state.quiz[ch.id];
      if (!rec || !rec.answers) return;
      (ch.quiz || []).forEach(function (q, i) {
        if (rec.answers[i] === q.answer) total++;
      });
    });
    return total;
  }

  function labsVisited() {
    return Object.keys(state.labs || {}).length;
  }

  function toast(message, tone) {
    var host = $('#toastHost');
    if (!host) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (tone || '');
    el.textContent = message;
    host.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 2900);
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme === 'light' ? 'light' : 'dark');
  }

  /* ---------------- 路由 ---------------- */
  function parseRoute() {
    var raw = (location.hash || '').replace(/^#\/?/, '');
    var parts = raw.split('/').filter(Boolean);
    if (!parts.length) return { name: 'home' };
    if (parts[0] === 'chapter') return { name: 'chapter', id: parts[1] || '', section: parts[2] || '' };
    if (parts[0] === 'lab') return { name: 'lab', id: parts[1] || 'token' };
    if (parts[0] === 'project') return { name: 'project', id: parts[1] || '' };
    if (['home', 'roadmap', 'labs', 'projects', 'interview', 'cheatsheet', 'review', 'backup', 'diagnostics'].indexOf(parts[0]) >= 0) {
      return { name: parts[0] };
    }
    return { name: 'notfound', raw: raw };
  }

  function navTo(hash) {
    if (location.hash === hash) {
      render();
      return;
    }
    location.hash = hash;
  }

  function nextChapter() {
    var last = state.lastChapter ? chapterById(state.lastChapter) : null;
    if (last && !isChapterDone(last.id)) return last;
    for (var i = 0; i < CHAPTERS.length; i++) {
      if (!isChapterDone(CHAPTERS[i].id)) return CHAPTERS[i];
    }
    return CHAPTERS[CHAPTERS.length - 1] || null;
  }

  /* ---------------- 侧边栏 ---------------- */
  function renderSidebar(route) {
    var done = doneCount();
    var total = CHAPTERS.length;
    var pct = total ? Math.round(done / total * 100) : 0;
    var lv = levelInfo();
    var activeChapter = route.name === 'chapter' ? route.id : null;

    var html = [];
    html.push('<div class="sidebar-head">');
    html.push('<div class="brand">');
    html.push('<div class="brand-mark">J/AI</div>');
    html.push('<div class="brand-body"><div class="brand-name">' + esc(SITE.brand) + '</div>');
    html.push('<div class="brand-sub">' + esc(SITE.tagline) + '</div></div>');
    html.push('</div>');
    html.push('<div class="sidebar-progress">');
    html.push('<div class="row"><span>总进度</span><span class="spacer"></span><b>' + done + ' / ' + total + '</b></div>');
    html.push('<div class="progress thin"><i style="width:' + pct + '%"></i></div>');
    html.push('</div>');
    html.push('</div>');

    html.push('<div class="sidebar-scroll">');
    html.push('<div class="nav-section">学习</div>');
    html.push(navItem('#/home', '⌂', '学习总览', route.name === 'home'));
    html.push(navItem('#/roadmap', '⌁', '学习路线', route.name === 'roadmap'));
    html.push(navItem('#/review', '↻', '错题复习', route.name === 'review'));
    html.push(navItem('#/backup', '⇩', '进度备份', route.name === 'backup'));
    html.push(navItem('#/diagnostics', '⚙', '环境诊断', route.name === 'diagnostics'));
    var favorites = CHAPTERS.filter(function (ch) { return !!state.bookmarks[ch.id]; });
    if (favorites.length) { html.push('<div class="nav-section">我的收藏</div>'); favorites.forEach(function (ch) { html.push(navItem('#/chapter/' + ch.id, '★', ch.title, false)); }); }
    html.push(navItem('#/labs', '⚗', '交互实验室', route.name === 'labs' || route.name === 'lab', labsVisited() + ' / ' + LABS.length));
    html.push('<div class="nav-section">课程 · ' + CHAPTERS.length + ' 章</div>');

    STAGES.forEach(function (stage) {
      var sDone = stageDone(stage);
      html.push('<div class="nav-stage-title" style="--stage-color:' + stage.color + '">');
      html.push('<span class="bar"></span><span>' + esc(stage.index) + ' · ' + esc(stage.short) + '</span>');
      html.push('<span class="spacer"></span><span class="idx">' + sDone + '/' + stage.chapters.length + '</span>');
      html.push('</div>');
      stage.chapters.forEach(function (ch) {
        var idx = chapterIndex(ch.id) + 1;
        html.push('<a class="nav-item nav-chapter' + (activeChapter === ch.id ? ' active' : '') + '" href="#/chapter/' + ch.id + '" title="' + esc(ch.title) + '">');
        html.push('<span class="idx">' + pad(idx) + '</span>');
        html.push('<span class="label">' + esc(ch.title) + '</span>');
        html.push('<span class="dot' + (isChapterDone(ch.id) ? ' done' : '') + '"></span>');
        html.push('</a>');
      });
    });

    html.push('<div class="nav-section">输出</div>');
    html.push(navItem('#/projects', '▣', '项目实战', route.name === 'projects' || route.name === 'project'));
    html.push(navItem('#/interview', '✦', '面试题库', route.name === 'interview'));
    html.push(navItem('#/cheatsheet', '⌘', '速查手册', route.name === 'cheatsheet'));
    html.push('</div>');

    html.push('<div class="sidebar-foot"><span>Lv.' + lv.level + ' · ' + fmt(state.xp) + ' XP</span><span>' + (state.theme === 'light' ? '浅色' : '深色') + '</span></div>');
    $('#sidebar').innerHTML = html.join('');
  }

  function navItem(href, icon, label, active, extra) {
    return '<a class="nav-item' + (active ? ' active' : '') + '" href="' + href + '">' +
      '<span class="ico">' + icon + '</span><span class="label">' + esc(label) + '</span>' +
      (extra ? '<span class="idx">' + esc(extra) + '</span>' : '') + '</a>';
  }

  /* ---------------- 顶栏 ---------------- */
  function crumbFor(route) {
    if (route.name === 'home') return '学习总览';
    if (route.name === 'review') return '错题复习';
    if (route.name === 'backup') return '进度备份';
    if (route.name === 'diagnostics') return '环境诊断';
    if (route.name === 'roadmap') return '学习路线';
    if (route.name === 'labs') return '交互实验室';
    if (route.name === 'lab') {
      var lab = labById(route.id);
      return '实验室 / ' + (lab ? lab.title : route.id);
    }
    if (route.name === 'projects') return '项目实战';
    if (route.name === 'project') {
      var p = projectById(route.id);
      return '项目 / ' + (p ? p.title : route.id);
    }
    if (route.name === 'interview') return '面试题库';
    if (route.name === 'cheatsheet') return '速查手册';
    if (route.name === 'chapter') {
      var ch = chapterById(route.id);
      if (!ch) return '课程';
      var stage = stageById(ch.stage);
      return (stage ? stage.short : '课程') + ' / 第 ' + pad(chapterIndex(ch.id) + 1) + ' 章';
    }
    return '未找到';
  }

  function renderTopbar(route) {
    var html = [];
    html.push('<button class="icon-btn menu-btn" id="menuBtn" aria-label="打开导航">☰</button>');
    html.push('<div class="crumb">' + esc(crumbFor(route)) + '</div>');
    html.push('<span class="spacer"></span>');
    html.push('<div class="search-wrap">');
    html.push('<span class="search-icon">⌕</span>');
    html.push('<input id="searchInput" type="search" placeholder="搜索章节、概念、面试题…" autocomplete="off" aria-label="搜索课程" />');
    html.push('<kbd>Ctrl K</kbd>');
    html.push('<div class="search-results" id="searchResults" hidden></div>');
    html.push('</div>');
    html.push('<button class="icon-btn" id="themeBtn" aria-label="切换主题" title="切换主题">' + (state.theme === 'light' ? '☾' : '☀') + '</button>');
    $('#topbar').innerHTML = html.join('');
  }

  /* ---------------- 搜索 ---------------- */
  var searchIndex = [];

  function sectionText(section) {
    var text = [section.text || '', stripHtml(section.html || ''), section.code || '', section.title || ''];
    (section.items || []).forEach(function (item) { text.push(typeof item === 'string' ? stripHtml(item) : [item.title || '', stripHtml(item.detail || ''), item.sub || ''].join(' ')); });
    (section.rows || []).forEach(function (row) { text.push(row.map(stripHtml).join(' ')); });
    return text.join(' ');
  }

  function buildSearchIndex() {
    searchIndex = [];
    CHAPTERS.forEach(function (ch) {
      var text = [ch.title, ch.summary, (ch.tags || []).join(' '), (ch.objectives || []).join(' ')].join(' ');
      (ch.sections || []).forEach(function (s) {
        text += ' ' + sectionText(s);
      });
      (ch.quiz || []).forEach(function (q) { text += ' ' + q.q + ' ' + (q.options || []).join(' '); });
      searchIndex.push({
        type: '课程',
        title: '第 ' + pad(chapterIndex(ch.id) + 1) + ' 章 · ' + ch.title,
        meta: (ch.tags || []).join(' · '),
        href: '#/chapter/' + ch.id,
        text: text.toLowerCase()
      });
      var heading = ch.title, headingIndex = null;
      (ch.sections || []).forEach(function (section, index) {
        if (section.type === 'h' || section.type === 'h3') { heading = section.text; headingIndex = index; }
        if (headingIndex === null) return;
        var content = sectionText(section);
        if (!content.trim()) return;
        searchIndex.push({ type: '章节内容', title: heading, meta: ch.title, href: '#/chapter/' + ch.id + '/s' + headingIndex, text: content.toLowerCase() });
      });
    });
    LABS.forEach(function (lab) {
      searchIndex.push({ type: '实验室', title: lab.title, meta: lab.tag, href: '#/lab/' + lab.id, text: (lab.title + ' ' + lab.desc).toLowerCase() });
    });
    PROJECTS.forEach(function (p) {
      searchIndex.push({ type: '项目', title: p.title, meta: p.stack.join(' · '), href: '#/project/' + p.id, text: (p.title + ' ' + p.summary + ' ' + p.stack.join(' ')).toLowerCase() });
    });
    INTERVIEW.forEach(function (group) {
      group.questions.forEach(function (q) {
        searchIndex.push({ type: '面试', title: q.q, meta: group.title, href: '#/interview', text: (q.q + ' ' + stripHtml(q.a)).toLowerCase() });
      });
    });
    CHEATSHEET.groups.forEach(function (group) {
      group.items.forEach(function (item) {
        searchIndex.push({ type: '速查', title: item.title, meta: group.title, href: '#/cheatsheet', text: (item.title + ' ' + (item.note || '') + ' ' + item.code).toLowerCase() });
      });
    });
  }

  function doSearch(query) {
    var box = $('#searchResults');
    if (!box) return;
    var q = String(query || '').trim().toLowerCase();
    if (!q) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }
    var results = [];
    searchIndex.forEach(function (item) {
      var score = 0;
      if (item.title.toLowerCase().indexOf(q) >= 0) score += 10;
      if (item.meta.toLowerCase().indexOf(q) >= 0) score += 3;
      if (item.text.indexOf(q) >= 0) score += 1;
      if (score > 0) results.push({ item: item, score: score });
    });
    results.sort(function (a, b) { return b.score - a.score; });
    results = results.slice(0, 8);
    box.hidden = false;
    if (!results.length) {
      box.innerHTML = '<div class="hint">没有找到“' + esc(query) + '”。试试“熔断”“切块”“Token”。</div>';
      return;
    }
    box.innerHTML = results.map(function (r) {
      return '<button data-search-href="' + r.item.href + '">' +
        '<span class="sr-title">' + esc(r.item.title) + '</span>' +
        '<span class="sr-meta">' + esc(r.item.type) + ' · ' + esc(r.item.meta) + '</span></button>';
    }).join('');
  }

  /* ---------------- 代码高亮 ---------------- */
  function highlightCode(code, lang) {
    var safe = esc(code);
    var re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(@[A-Za-z_]\w*)|\b(public|private|protected|class|interface|record|enum|extends|implements|return|new|if|else|for|while|try|catch|finally|throw|throws|import|package|static|final|void|int|long|double|float|boolean|char|String|List|Map|Set|var|true|false|null|SELECT|FROM|WHERE|ORDER|BY|LIMIT|CREATE|TABLE|INDEX|INSERT|INTO|VALUES|UPDATE|SET|ON|CONFLICT|DO|USING|WITH|AND|OR|NOT|NULL|PRIMARY|KEY|REFERENCES|JOIN|GROUP|HAVING|ALTER|ADD|COLUMN|EXTENSION|EXISTS|AS|DESC|ASC)\b|\b(\d+(?:\.\d+)?)\b/g;
    return safe.replace(re, function (m, comment, str, ann, keyword, num) {
      if (comment) return '<span class="tok-com">' + m + '</span>';
      if (str) return '<span class="tok-str">' + m + '</span>';
      if (ann) return '<span class="tok-ann">' + m + '</span>';
      if (keyword) return '<span class="tok-key">' + m + '</span>';
      if (num) return '<span class="tok-num">' + m + '</span>';
      return m;
    });
  }

  function codeBlock(lang, title, code) {
    var langLabel = lang || 'text';
    return '<div class="code-block">' +
      '<div class="code-head"><span class="dot-group"><i></i><i></i><i></i></span>' +
      '<span class="code-title">' + esc(title || langLabel) + '</span><span class="spacer"></span>' +
      '<button class="copy-btn" data-copy="1" type="button">复制</button></div>' +
      '<pre><code class="lang-' + esc(langLabel) + '">' + highlightCode(code || '', langLabel) + '</code></pre>' +
      '</div>';
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        resolve();
      } catch (e) { reject(e); }
    });
  }

  /* ---------------- 内容片段渲染 ---------------- */
  function renderSections(sections) {
    var html = [];
    (sections || []).forEach(function (s, index) {
      if (!s || !s.type) return;
      if (s.type === 'p') {
        html.push('<p class="lesson-p">' + (s.html || '') + '</p>');
      } else if (s.type === 'h') {
        html.push('<h2 id="section-s' + index + '" tabindex="-1" class="lesson-h2">' + esc(s.text) + '</h2>');
      } else if (s.type === 'h3') {
        html.push('<h3 id="section-s' + index + '" tabindex="-1" class="lesson-h3">' + esc(s.text) + '</h3>');
      } else if (s.type === 'list') {
        var tag = s.ordered ? 'ol' : 'ul';
        html.push('<' + tag + ' class="lesson-list ' + (s.ordered ? 'ordered' : 'unordered') + '">');
        (s.items || []).forEach(function (item) { html.push('<li>' + item + '</li>'); });
        html.push('</' + tag + '>');
      } else if (s.type === 'code') {
        html.push(codeBlock(s.lang, s.title, s.code));
      } else if (s.type === 'callout') {
        html.push('<div class="callout ' + esc(s.tone || 'tip') + '">' +
          (s.title ? '<div class="callout-title">' + esc(s.title) + '</div>' : '') +
          '<div>' + (s.html || '') + '</div></div>');
      } else if (s.type === 'table') {
        html.push('<div class="table-wrap"><table><thead><tr>' +
          (s.head || []).map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
          '</tr></thead><tbody>' +
          (s.rows || []).map(function (row) {
            return '<tr>' + row.map(function (cell) { return '<td>' + cell + '</td>'; }).join('') + '</tr>';
          }).join('') + '</tbody></table></div>');
      } else if (s.type === 'flow') {
        html.push('<div class="flow">');
        (s.items || []).forEach(function (item, i) {
          if (i > 0) html.push('<span class="flow-arrow">→</span>');
          html.push('<div class="flow-node"><span class="n">' + pad(i + 1) + '</span><b>' + esc(item.title) + '</b><span>' + esc(item.sub || '') + '</span></div>');
        });
        html.push('</div>');
      } else if (s.type === 'compare') {
        html.push('<div class="compare">');
        ['left', 'right'].forEach(function (side) {
          var box = s[side];
          if (!box) return;
          html.push('<div class="compare-box"><h4>' + esc(box.title) + '</h4><ul>' +
            (box.items || []).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>');
        });
        html.push('</div>');
      } else if (s.type === 'steps') {
        html.push('<div class="steps">');
        (s.items || []).forEach(function (item, i) {
          html.push('<div class="step-item"><div class="n">' + pad(i + 1) + '</div><div><b>' + esc(item.title) + '</b><p>' + (item.detail || '') + '</p></div></div>');
        });
        html.push('</div>');
      }
    });
    return html.join('');
  }

  /* ---------------- 首页 ---------------- */
  function renderHome() {
    var done = doneCount();
    var total = CHAPTERS.length;
    var pct = total ? Math.round(done / total * 100) : 0;
    var lv = levelInfo();
    var next = nextChapter();
    var correct = quizCorrectTotal();
    var totalQ = quizTotal();
    var accuracy = totalQ ? Math.round(correct / totalQ * 100) : 0;

    var dash = 2 * Math.PI * 52;
    var offset = dash * (1 - pct / 100);

    var html = [];
    html.push('<section class="hero fade-up">');
    html.push('<div class="hero-inner">');
    html.push('<div>');
    html.push('<div class="hero-badge"><span class="pulse"></span> JAVA × LLM · 一条可验收的上线路线</div>');
    html.push('<h1>从 Java 基础，<br>到<span class="grad-text">能上线</span>的<br class="br-mobile">大模型应用工程师</h1>');
    html.push('<p class="lede">' + esc(SITE.subtitle) + '</p>');
    html.push('<div class="hero-actions">');
    html.push('<a class="btn primary lg" href="#/chapter/' + (next ? next.id : 'env') + '">' + (done ? '继续学习' : '从第 0 章开始') + ' →</a>');
    html.push('<a class="btn ghost lg" href="#/roadmap">看完整路线</a>');
    html.push('<a class="btn ghost lg" href="#/lab/token">先玩成本实验室</a>');
    html.push('</div>');
    html.push('<div class="hero-meta"><span><b>24</b> 章</span><span><b>4</b> 个实验室</span><span><b>2</b> 个项目</span><span>每章都有测验 / 练习</span></div>');
    html.push('</div>');
    html.push('<div class="terminal">');
    html.push('<div class="terminal-bar"><i></i><i></i><i></i><span>java-ai — roadmap.sh</span></div>');
    html.push('<div class="terminal-body">');
    html.push('<div><span class="c-com"># 不是收藏夹，是一条能跑通的链路</span></div>');
    html.push('<div><span class="c-key">$</span> ./learn --from java --to rag</div>');
    html.push('<div><span class="c-fn">[ok]</span> JDK 21 / Spring Boot 3</div>');
    html.push('<div><span class="c-fn">[ok]</span> ChatClient + AiServices</div>');
    html.push('<div><span class="c-fn">[ok]</span> pgvector + Milvus</div>');
    html.push('<div><span class="c-fn">[ok]</span> RAG eval: recall@10 0.88</div>');
    html.push('<div><span class="c-fn">[ok]</span> circuit breaker: CLOSED</div>');
    html.push('<div><span class="c-ann">[next]</span> deploy project A <span class="cursor"></span></div>');
    html.push('</div></div>');
    html.push('</div></section>');

    html.push('<div class="grid cols-2">');
    html.push('<div class="card">');
    html.push('<div class="row between"><div class="card-title mb-0">你的进度</div><span class="tag accent">Lv.' + lv.level + '</span></div>');
    html.push('<div class="row mt-2" style="gap:22px">');
    html.push('<div style="position:relative;flex:0 0 132px">');
    html.push('<svg width="132" height="132" viewBox="0 0 132 132">');
    html.push('<circle cx="66" cy="66" r="52" fill="none" stroke="rgba(148,170,210,0.14)" stroke-width="10"></circle>');
    html.push('<circle cx="66" cy="66" r="52" fill="none" stroke="url(#ringGrad)" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + dash.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '" transform="rotate(-90 66 66)"></circle>');
    html.push('<defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6ea8fe"></stop><stop offset="0.6" stop-color="#22d3ee"></stop><stop offset="1" stop-color="#a78bfa"></stop></linearGradient></defs>');
    html.push('<text x="66" y="62" text-anchor="middle" fill="currentColor" font-size="24" font-weight="800">' + pct + '%</text>');
    html.push('<text x="66" y="82" text-anchor="middle" fill="#65738e" font-size="10">已完成</text>');
    html.push('</svg></div>');
    html.push('<div style="flex:1;min-width:180px">');
    html.push('<div class="muted small">' + done + ' / ' + total + ' 章 · ' + fmt(state.xp) + ' XP</div>');
    html.push('<div class="progress mt-1"><i style="width:' + lv.pct + '%"></i></div>');
    html.push('<div class="tiny faint mt-1">距离 Lv.' + (lv.level + 1) + ' 还差 ' + (250 - lv.inLevel) + ' XP</div>');
    html.push('<div class="mt-2"><a class="btn sm primary" href="#/chapter/' + (next ? next.id : 'env') + '">' + (next ? '继续：' + esc(next.title) : '全部完成') + '</a></div>');
    html.push('</div></div>');
    html.push('</div>');

    html.push('<div class="card">');
    html.push('<div class="card-title">能力仪表盘</div>');
    html.push('<div class="grid cols-2" style="gap:9px">');
    html.push('<div class="stat"><b>' + done + '</b><span>完成章节</span></div>');
    html.push('<div class="stat"><b>' + accuracy + '%</b><span>测验掌握度</span></div>');
    html.push('<div class="stat"><b>' + labsVisited() + ' / ' + LABS.length + '</b><span>实验室探索</span></div>');
    html.push('<div class="stat"><b>' + state.xp + '</b><span>累计 XP</span></div>');
    html.push('</div>');
    html.push('<div class="note-box">建议顺序：先完成阶段 0~1，再用项目 A 倒逼 RAG；不要把所有课看完才动手。</div>');
    html.push('</div></div>');

    html.push('<h2 class="lesson-h2 mt-3">招聘要求，逐条变成证据</h2>');
    html.push('<div class="matrix">');
    html.push('<div class="matrix-row matrix-head"><span>岗位要求</span><span>对应课程</span><span>你会拿出的证据</span></div>');
    (SITE.capabilities || []).forEach(function (cap) {
      html.push('<div class="matrix-row"><div class="need">' + esc(cap.need) + '</div><div class="links">');
      (cap.chapters || []).forEach(function (id) {
        if (chapterById(id)) {
          html.push('<a class="chip-link" href="#/chapter/' + id + '">' + esc(chapterById(id).title) + '</a>');
        } else if (id.indexOf('lab-') === 0) {
          html.push('<a class="chip-link" href="#/lab/' + id.slice(4) + '">' + esc(id.slice(4)) + ' 实验室</a>');
        }
      });
      html.push('</div><div class="proof">' + esc(cap.proof) + '</div></div>');
    });
    html.push('</div>');

    html.push('<h2 class="lesson-h2 mt-3">学完你能做出什么</h2>');
    html.push('<div class="grid cols-2">');
    (SITE.outcomes || []).forEach(function (o) {
      html.push('<div class="card tight"><div class="card-title"><span class="ico">' + o.icon + '</span>' + esc(o.title) + '</div><p class="muted small mb-0">' + esc(o.desc) + '</p></div>');
    });
    html.push('</div>');

    html.push('<div class="row between mt-3"><h2 class="lesson-h2" style="margin:0">七个阶段</h2><a class="btn sm ghost" href="#/roadmap">展开路线 →</a></div>');
    html.push('<div class="grid cols-2 mt-1 stage-grid">');
    STAGES.forEach(function (stage) {
      var sd = stageDone(stage);
      var sp = stage.chapters.length ? Math.round(sd / stage.chapters.length * 100) : 0;
      html.push('<a class="card tight" href="#/roadmap" style="--stage-color:' + stage.color + ';border-left:3px solid ' + stage.color + ';text-decoration:none;color:inherit">');
      html.push('<div class="row between"><span class="tag" style="color:' + stage.color + ';border-color:' + stage.color + '55">' + stage.index + '</span><span class="tiny faint">' + sd + ' / ' + stage.chapters.length + ' 章</span></div>');
      html.push('<div class="card-title mt-1 mb-1">' + esc(stage.title) + '</div>');
      html.push('<p class="tiny muted mb-1">' + esc(stage.desc) + '</p>');
      html.push('<div class="progress thin"><i style="width:' + sp + '%;background:' + stage.color + '"></i></div>');
      html.push('</a>');
    });
    html.push('</div>');

    html.push('<div class="row between mt-3"><h2 class="lesson-h2" style="margin:0">四个实验室</h2><a class="btn sm ghost" href="#/labs">全部实验 →</a></div>');
    html.push('<div class="grid cols-2 mt-1">');
    LABS.forEach(function (lab) {
      html.push('<a class="card tight" href="#/lab/' + lab.id + '" style="text-decoration:none;color:inherit">');
      html.push('<div class="row between"><div class="card-title mb-0"><span class="ico">' + lab.icon + '</span>' + esc(lab.title) + '</div><span class="tag">' + esc(lab.tag) + '</span></div>');
      html.push('<p class="tiny muted mb-0 mt-1">' + esc(lab.desc) + '</p></a>');
    });
    html.push('</div>');

    html.push('<h2 class="lesson-h2 mt-3">这套课怎么用</h2>');
    html.push('<div class="grid cols-2">');
    (SITE.principles || []).forEach(function (p) {
      html.push('<div class="card tight"><div class="row"><span class="tag accent">' + p.n + '</span><b>' + esc(p.title) + '</b></div><p class="tiny muted mb-0 mt-1">' + esc(p.desc) + '</p></div>');
    });
    html.push('</div>');

    return html.join('');
  }

  /* ---------------- 路线图 ---------------- */
  function renderRoadmap() {
    var html = [];
    html.push('<div class="crumb-line">ROADMAP</div>');
    html.push('<h1 class="page-title">一条从 0 到上岗的路线</h1>');
    html.push('<p class="page-sub">每个阶段都有明确的产出。不要跳阶段，但可以在阶段内按项目需要调整顺序。建议每周 10~15 小时，6 周完成最小闭环，再用 4~6 周打磨项目。</p>');

    html.push('<div class="card">');
    html.push('<div class="card-title">6 周最小计划</div>');
    html.push('<div class="grid cols-3">');
    (SITE.roadmapWeeks || []).forEach(function (w) {
      html.push('<div class="stat"><b style="font-size:14px">' + esc(w.week) + '</b><div class="small" style="margin:4px 0">' + esc(w.focus) + '</div><span>' + esc(w.detail) + '</span></div>');
    });
    html.push('</div></div>');

    STAGES.forEach(function (stage) {
      var sd = stageDone(stage);
      var sp = stage.chapters.length ? Math.round(sd / stage.chapters.length * 100) : 0;
      html.push('<div class="card stage-card" style="--stage-color:' + stage.color + '">');
      html.push('<div class="stage-head">');
      html.push('<div class="stage-index">' + stage.index + '</div>');
      html.push('<div style="flex:1;min-width:0"><h3>' + esc(stage.title) + '</h3><p>' + esc(stage.desc) + '</p>');
      html.push('<div class="tiny" style="color:' + stage.color + ';margin-top:5px">' + esc(stage.outcome) + '</div></div>');
      html.push('<div class="stage-progress"><b>' + sd + ' / ' + stage.chapters.length + '</b><div class="progress thin mt-1"><i style="width:' + sp + '%;background:' + stage.color + '"></i></div></div>');
      html.push('</div>');
      html.push('<div class="chapter-list">');
      stage.chapters.forEach(function (ch) {
        var idx = chapterIndex(ch.id) + 1;
        html.push('<a class="chapter-row" href="#/chapter/' + ch.id + '">');
        html.push('<span class="num">' + pad(idx) + '</span>');
        html.push('<span><span class="ttl">' + esc(ch.title) + '</span><span class="sub">' + esc(ch.summary) + '</span></span>');
        html.push('<span class="right"><span>' + ch.minutes + ' min</span><span class="dot' + (isChapterDone(ch.id) ? ' done' : '') + '"></span></span>');
        html.push('</a>');
      });
      html.push('</div></div>');
    });

    html.push('<div class="callout tip"><div class="callout-title">别把路线当打卡</div>每一章至少留下一个可运行文件、一段笔记或一个失败复盘。面试时你讲的是“我遇到过什么、怎么修的”，不是“我看过 24 章”。</div>');
    return html.join('');
  }

  /* ---------------- 章节 ---------------- */
  function renderQuiz(ch) {
    if (!ch.quiz || !ch.quiz.length) return '';
    var rec = state.quiz[ch.id] || { answers: {} };
    var answers = rec.answers || {};
    var correct = 0;
    (ch.quiz).forEach(function (q, i) { if (answers[i] === q.answer) correct++; });

    var html = [];
    html.push('<div class="quiz-wrap" id="quizWrap">');
    html.push('<div class="quiz-head"><h3>随堂测验</h3><span class="tag">' + ch.quiz.length + ' 题</span><span class="score" id="quizScore">' + correct + ' / ' + ch.quiz.length + ' 正确</span></div>');
    html.push('<div class="quiz-body">');
    ch.quiz.forEach(function (q, qi) {
      var chosen = answers[qi];
      var solved = chosen === q.answer;
      html.push('<div class="quiz-q" data-q="' + qi + '">');
      html.push('<div class="quiz-stem"><span class="qno">Q' + (qi + 1) + '</span><span>' + esc(q.q) + '</span></div>');
      q.options.forEach(function (opt, oi) {
        var cls = 'quiz-opt';
        if (solved) {
          if (oi === q.answer) cls += ' correct';
          else if (oi === chosen) cls += ' wrong';
        }
        html.push('<button type="button" class="' + cls + '" data-quiz="' + qi + '" data-opt="' + oi + '"' + (solved ? ' disabled' : '') + '>' +
          '<span class="k">' + String.fromCharCode(65 + oi) + '</span><span>' + esc(opt) + '</span></button>');
      });
      html.push('<div class="quiz-explain" data-explain="' + qi + '"' + (solved ? '' : ' hidden') + '>' + (solved ? esc(q.explain) : '') + '</div>');
      html.push('</div>');
    });
    html.push('</div>');
    html.push('<div class="quiz-footer"><span class="tiny faint">答错可以重试；全部答对会标记本章完成。</span><span class="spacer"></span><span class="tag" id="quizTag">' + (correct === ch.quiz.length ? '已完成' : '进行中') + '</span></div>');
    html.push('</div>');
    return html.join('');
  }

  function renderExercise(ch) {
    if (!ch.exercise) return '';
    var ex = ch.exercise;
    var rec = state.exercises[ch.id] || {};
    var code = rec.code != null ? rec.code : (ex.starter || '');
    var passed = !!(rec.passed && rec.checks && rec.checks.length);
    var html = [];
    html.push('<div class="exercise" id="exercise">');
    html.push('<div class="exercise-head"><h3>' + esc(ex.title || '动手练习') + '</h3><span class="tag ' + (passed ? 'green' : '') + '" id="exTag">' + (passed ? '已通过' : '待完成') + '</span></div>');
    html.push('<p class="exercise-prompt">' + (ex.prompt || '') + '</p>');
    html.push('<p class="tiny muted">这里检查文本中的关键点，不会编译、运行代码或验证行为。全部通过后，请按章节中的步骤在自己的环境中运行并核对结果。</p>');
    html.push('<textarea class="editor" id="exEditor" spellcheck="false" aria-label="练习代码">' + esc(code) + '</textarea>');
    html.push('<div class="exercise-actions">');
    html.push('<button class="btn primary sm" data-ex-check="1" type="button">检查关键点</button>');
    html.push('<button class="btn sm" data-ex-hint="1" type="button">给我一个提示</button>');
    html.push('<button class="btn ghost sm" data-ex-solution="1" type="button">查看参考答案</button>');
    html.push('<span class="spacer"></span><span class="tiny faint">自动保存</span>');
    html.push('</div>');
    html.push('<div class="check-list" id="exChecks">');
    if (passed && rec.checks) {
      rec.checks.forEach(function (c) {
        html.push('<div class="check-item ' + (c.pass ? 'pass' : 'fail') + '"><span class="mark">' + (c.pass ? '✓' : '×') + '</span><span>' + esc(c.label) + '</span></div>');
      });
    }
    html.push('</div>');
    html.push('<div class="hints" id="exHints"></div>');
    html.push('<div class="solution" id="exSolution" hidden>' + codeBlock(ex.lang, '参考答案', ex.solution || '') + (ex.explain ? '<p class="tiny muted">' + esc(ex.explain) + '</p>' : '') + '</div>');
    html.push('</div>');
    return html.join('');
  }

  function renderChapter(id) {
    var ch = chapterById(id);
    if (!ch) return renderNotFound();
    state.lastChapter = ch.id;
    save();

    var stage = stageById(ch.stage);
    var idx = chapterIndex(ch.id);
    var prev = idx > 0 ? CHAPTERS[idx - 1] : null;
    var next = idx < CHAPTERS.length - 1 ? CHAPTERS[idx + 1] : null;
    var done = isChapterDone(ch.id);
    var quizDone = quizAllCorrect(ch);

    var html = [];
    html.push('<div class="chapter-layout">');
    html.push('<div>');
    html.push('<div class="chapter-header">');
    html.push('<div class="chapter-kicker"><span class="tag" style="color:' + (stage ? stage.color : '#6ea8fe') + ';border-color:' + (stage ? stage.color + '55' : '#6ea8fe55') + '">' + esc(stage ? stage.title : '课程') + '</span><span>第 ' + pad(idx + 1) + ' 章</span><span>·</span><span>' + ch.minutes + ' 分钟</span><span>·</span><span>' + esc(ch.level || '入门') + '</span></div>');
    html.push('<h1>' + esc(ch.title) + '</h1>');
    html.push('<p class="sum">' + esc(ch.summary) + '</p>');
    html.push('<div class="chapter-meta">');
    (ch.tags || []).forEach(function (t) { html.push('<span class="tag">' + esc(t) + '</span>'); });
    html.push('<span class="spacer"></span>');
    html.push('<button class="btn ' + (done ? 'ok' : 'primary') + ' sm" data-complete="1" type="button">' + (done ? '✓ 已完成 · 点击取消' : '标记本章完成') + '</button>');
    html.push('<button class="btn sm" data-bookmark="' + esc(ch.id) + '" type="button" aria-pressed="' + (!!state.bookmarks[ch.id]) + '">' + (state.bookmarks[ch.id] ? '★ 已收藏' : '☆ 收藏本章') + '</button>');
    html.push('</div></div>');

    html.push('<details class="card tight chapter-toc"><summary>本章目录</summary><ol>');
    (ch.sections || []).forEach(function (section, index) { if (section.type === 'h' || section.type === 'h3') html.push('<li><a href="#/chapter/' + esc(ch.id) + '/s' + index + '">' + esc(section.text) + '</a></li>'); });
    html.push('</ol></details>');

    html.push('<div class="card tight"><div class="card-title">本课目标</div><div class="objectives">');
    (ch.objectives || []).forEach(function (o, i) {
      html.push('<div class="objective"><span class="n">' + (i + 1) + '</span><span>' + esc(o) + '</span></div>');
    });
    html.push('</div></div>');

    html.push(renderSections(ch.sections));
    html.push(renderQuiz(ch));
    html.push(renderExercise(ch));

    if (ch.takeaways && ch.takeaways.length) {
      html.push('<div class="takeaways"><h3>带走这三句话</h3><ul>' +
        ch.takeaways.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>');
    }

    html.push('<div id="chapterCompleteSlot">' + (done ? completionBanner() : '') + '</div>');
    html.push('<div class="chapter-nav">');
    if (prev) {
      html.push('<a class="btn ghost" href="#/chapter/' + prev.id + '"><span><span class="dir">← 上一章</span><span class="ttl">' + esc(prev.title) + '</span></span></a>');
    } else {
      html.push('<span></span>');
    }
    if (next) {
      html.push('<a class="btn ghost" style="text-align:right" href="#/chapter/' + next.id + '"><span><span class="dir">下一章 →</span><span class="ttl">' + esc(next.title) + '</span></span></a>');
    } else {
      html.push('<a class="btn ghost" style="text-align:right" href="#/projects"><span><span class="dir">下一步 →</span><span class="ttl">进入项目实战</span></span></a>');
    }
    html.push('</div>');
    html.push('</div>');

    html.push('<aside class="chapter-aside">');
    var exDone = !ch.exercise || (state.exercises[ch.id] && state.exercises[ch.id].passed);
    var asidePct = done ? 100 : ((quizDone ? 50 : 0) + (exDone ? 50 : 0));
    html.push('<div class="aside-card"><h4>本章进度</h4>');
    html.push('<div class="prog-line"><span id="asideState">' + (done ? '已完成' : '进行中') + '</span><span id="asidePct">' + asidePct + '%</span></div>');
    html.push('<div class="progress thin"><i id="asideBar" style="width:' + asidePct + '%"></i></div>');
    html.push('<div class="tiny faint mt-1" id="asideDetail">测验：' + (quizDone ? '已通过' : '未完成') + '<br>练习：' + (ch.exercise ? (exDone ? '已通过' : '未完成') : '无') + '</div>');
    html.push('</div>');
    html.push('<div class="aside-card"><h4>学习建议</h4><ul>');
    html.push('<li>先跑通示例，再改一个参数观察变化</li>');
    html.push('<li>把报错原文记进笔记，别只记结论</li>');
    html.push('<li>能用一句话解释给非技术同事听</li>');
    html.push('</ul></div>');
    html.push('<div class="aside-card"><h4>相关</h4><div class="chips">');
    html.push('<a class="tag accent" href="#/cheatsheet">速查手册</a>');
    html.push('<a class="tag" href="#/interview">面试题库</a>');
    html.push('<a class="tag" href="#/projects">项目实战</a>');
    html.push('</div></div>');
    html.push('</aside>');
    html.push('</div>');
    return html.join('');
  }

  function completionBanner() {
    return '<div class="complete-banner"><span class="big">✓</span><div><b>本章已完成</b><span>去下一章，或者回到项目里用一遍。完成不等于掌握，能复述 + 能改代码才算。</span></div></div>';
  }

  function quizAllCorrect(ch) {
    if (!ch.quiz || !ch.quiz.length) return true;
    var rec = state.quiz[ch.id];
    if (!rec || !rec.answers) return false;
    return ch.quiz.every(function (q, i) { return rec.answers[i] === q.answer; });
  }

  function refreshAside(ch) {
    var done = isChapterDone(ch.id);
    var quizDone = quizAllCorrect(ch);
    var exDone = !ch.exercise || (state.exercises[ch.id] && state.exercises[ch.id].passed);
    var pct = done ? 100 : ((quizDone ? 50 : 0) + (exDone ? 50 : 0));
    var stateEl = $('#asideState');
    var pctEl = $('#asidePct');
    var bar = $('#asideBar');
    var detail = $('#asideDetail');
    if (stateEl) stateEl.textContent = done ? '已完成' : '进行中';
    if (pctEl) pctEl.textContent = pct + '%';
    if (bar) bar.style.width = pct + '%';
    if (detail) detail.innerHTML = '测验：' + (quizDone ? '已通过' : '未完成') + '<br>练习：' + (ch.exercise ? (exDone ? '已通过' : '未完成') : '无');
  }

  function maybeComplete(ch) {
    if (isChapterDone(ch.id)) return;
    var quizOk = quizAllCorrect(ch);
    var exOk = !ch.exercise || (state.exercises[ch.id] && state.exercises[ch.id].passed);
    if (!quizOk || !exOk) return;
    state.chapters[ch.id] = { done: true, at: Date.now() };
    state.xp += 60;
    save();
    toast('本章完成 +60 XP', 'ok');
    renderSidebar(parseRoute());
    refreshAside(ch);
    $$('[data-complete]').forEach(function (b) {
      b.className = 'btn ok sm';
      b.textContent = '✓ 已完成 · 点击取消';
    });
    var slot = $('#chapterCompleteSlot');
    if (slot) slot.innerHTML = completionBanner();
  }

  function toggleComplete(ch) {
    if (isChapterDone(ch.id)) {
      delete state.chapters[ch.id];
      toast('已取消完成标记');
    } else {
      state.chapters[ch.id] = { done: true, at: Date.now() };
      state.xp += 60;
      toast('本章完成 +60 XP', 'ok');
    }
    save();
    render();
  }

  function answerQuiz(ch, qi, oi) {
    var q = ch.quiz[qi];
    if (!q) return;
    var rec = state.quiz[ch.id] || { answers: {} };
    rec.answers = rec.answers || {};
    if (rec.answers[qi] === q.answer) return;
    rec.answers[qi] = oi;
    state.quiz[ch.id] = rec;
    if (oi !== q.answer) state.review[ch.id + ':' + qi] = { reviewed: false };
    save();

    var qEl = $('.quiz-q[data-q="' + qi + '"]');
    if (qEl) {
      $$('.quiz-opt', qEl).forEach(function (btn) {
        var idx = Number(btn.getAttribute('data-opt'));
        btn.classList.remove('correct', 'wrong');
        btn.disabled = false;
        if (idx === q.answer) {
          btn.classList.add('correct');
          btn.disabled = true;
        } else if (idx === oi) {
          btn.classList.add('wrong');
        }
      });
      var ex = $('[data-explain="' + qi + '"]', qEl);
      if (ex) {
        ex.hidden = false;
        ex.textContent = q.explain || '';
      }
    }

    var correct = 0;
    ch.quiz.forEach(function (qq, i) { if (rec.answers[i] === qq.answer) correct++; });
    var score = $('#quizScore');
    if (score) score.textContent = correct + ' / ' + ch.quiz.length + ' 正确';
    var tag = $('#quizTag');
    if (tag) {
      tag.textContent = correct === ch.quiz.length ? '已完成' : '进行中';
      tag.className = 'tag ' + (correct === ch.quiz.length ? 'green' : '');
    }

    if (oi === q.answer) {
      if (correct === ch.quiz.length) {
        state.xp += 40;
        save();
        toast('测验全部答对 +40 XP', 'ok');
        maybeComplete(ch);
      }
      refreshAside(ch);
    } else {
      toast('再想想：先排除明显错误项', 'warn');
    }
  }

  function runExerciseChecks(ch) {
    var ex = ch.exercise;
    if (!ex) return;
    var editor = $('#exEditor');
    if (!editor) return;
    var code = editor.value || '';
    var rec = state.exercises[ch.id] || {};
    rec.code = code;
    var results = (ex.checks || []).map(function (c) {
      var pass = false;
      try {
        if (c.includes) pass = code.indexOf(c.includes) >= 0;
        else if (c.re) pass = new RegExp(c.re, c.flags || '').test(code);
        else if (c.test) pass = !!c.test(code);
      } catch (e) { pass = false; }
      return { label: c.label, pass: pass };
    });
    rec.checks = results;
    var all = results.every(function (r) { return r.pass; });
    if (all) {
      if (!rec.passed) {
        state.xp += 30;
        toast('练习通过 +30 XP', 'ok');
      }
      rec.passed = true;
    } else {
      rec.passed = false;
    }
    state.exercises[ch.id] = rec;
    save();

    var box = $('#exChecks');
    if (box) {
      box.innerHTML = results.map(function (r) {
        return '<div class="check-item ' + (r.pass ? 'pass' : 'fail') + '"><span class="mark">' + (r.pass ? '✓' : '×') + '</span><span>' + esc(r.label) + '</span></div>';
      }).join('');
    }
    var tag = $('#exTag');
    if (tag) {
      tag.textContent = all ? '已通过' : '继续修改';
      tag.className = 'tag ' + (all ? 'green' : '');
    }
    if (all) {
      maybeComplete(ch);
    } else {
      toast('还有 ' + results.filter(function (r) { return !r.pass; }).length + ' 个关键点未满足', 'warn');
    }
    refreshAside(ch);
  }

  function showNextHint() {
    var ch = chapterById(parseRoute().id);
    if (!ch || !ch.exercise) return;
    var btn = $('[data-ex-hint]');
    var idx = Number(btn && btn.getAttribute('data-hint-index') || 0);
    var hints = ch.exercise.hints || [];
    if (idx >= hints.length) {
      toast('提示已经全部给出，先按提示改代码');
      return;
    }
    var box = $('#exHints');
    if (box) {
      var div = document.createElement('div');
      div.className = 'hint-item';
      div.textContent = '提示 ' + (idx + 1) + '：' + hints[idx];
      box.appendChild(div);
    }
    if (btn) {
      btn.setAttribute('data-hint-index', String(idx + 1));
      if (idx + 1 >= hints.length) btn.textContent = '提示已给出';
    }
  }

  /* ---------------- 实验室 ---------------- */
  function renderLabsIndex() {
    var html = [];
    html.push('<div class="crumb-line">LABS</div>');
    html.push('<h1 class="page-title">把抽象概念，调成手感</h1>');
    html.push('<p class="page-sub">四个实验室都只依赖浏览器，不调用真实模型。你可以放心改参数，观察成本、召回、状态机与灰度指标怎么变。</p>');
    html.push('<div class="grid cols-2">');
    LABS.forEach(function (lab) {
      var visited = !!state.labs[lab.id];
      html.push('<a class="card project-card-lg" href="#/lab/' + lab.id + '" style="text-decoration:none;color:inherit">');
      html.push('<div class="p-top"><div class="project-icon">' + lab.icon + '</div><div style="flex:1"><h3>' + esc(lab.title) + '</h3><span class="tag ' + (visited ? 'green' : 'accent') + '">' + (visited ? '已探索' : lab.tag) + '</span></div><span style="color:var(--faint)">→</span></div>');
      html.push('<p class="p-sum">' + esc(lab.desc) + '</p>');
      html.push('<div class="row"><span class="tiny faint">不需要 API Key · 即时反馈 · 参数可复位</span></div>');
      html.push('</a>');
    });
    html.push('</div>');
    html.push('<div class="card mt-2"><div class="card-title">实验室不是玩具</div><p class="muted small mb-0">每个实验对应一个真实工程决策：预算怎么分、TopK 怎么定、熔断阈值怎么设、Prompt 怎么灰度。玩完以后，回到章节把对应代码写进项目，才算真正学会。</p></div>');
    return html.join('');
  }

  function renderLab(id) {
    var lab = labById(id);
    if (!lab) return renderNotFound();
    state.labs[id] = state.labs[id] || Date.now();
    save();
    return '<div id="labRoot"></div>';
  }

  /* ---------------- 项目 ---------------- */
  function renderProjects() {
    var html = [];
    html.push('<div class="crumb-line">PROJECTS</div>');
    html.push('<h1 class="page-title">两个项目，把能力串成作品</h1>');
    html.push('<p class="page-sub">项目 A 证明你能做 RAG，项目 B 证明你能把它做稳、做便宜、做可治理。每个项目都有里程碑、验收标准与风险清单，照着交付即可。</p>');
    PROJECTS.forEach(function (p) {
      html.push('<div class="card project-card-lg">');
      html.push('<div class="p-top"><div class="project-icon">' + esc(p.num) + '</div><div style="flex:1"><h3>' + esc(p.title) + '</h3><div class="tiny faint">' + esc(p.subtitle) + '</div></div><span class="tag accent">' + esc(p.level) + '</span></div>');
      html.push('<p class="p-sum">' + esc(p.summary) + '</p>');
      html.push('<div class="project-meta">');
      (p.stack || []).forEach(function (s) { html.push('<span class="tag">' + esc(s) + '</span>'); });
      html.push('<span class="tag green">' + esc(p.duration) + '</span>');
      html.push('</div>');
      html.push('<div class="grid cols-2" style="gap:10px">');
      html.push('<div><div class="tiny faint mb-1">你会交付</div><ul class="lesson-list" style="margin:0">' + (p.outcomes || []).slice(0, 3).map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul></div>');
      html.push('<div><div class="tiny faint mb-1">里程碑</div><div class="small muted">' + (p.milestones || []).length + ' 个，从骨架到部署，每个都有验收物。</div></div>');
      html.push('</div>');
      html.push('<div class="row mt-2"><a class="btn primary sm" href="#/project/' + p.id + '">查看项目详情 →</a><a class="btn ghost sm" href="#/chapter/' + (p.id === 'kb' ? 'project-kb' : 'project-gateway') + '">读配套章节</a></div>');
      html.push('</div>');
    });
    return html.join('');
  }

  function renderProjectDetail(id) {
    var p = projectById(id);
    if (!p) return renderNotFound();
    var html = [];
    html.push('<div class="crumb-line">PROJECT ' + esc(p.num) + '</div>');
    html.push('<div class="row between top"><div><h1 class="page-title" style="margin-top:0">' + esc(p.title) + '</h1><p class="page-sub">' + esc(p.subtitle) + '</p></div><span class="tag accent">' + esc(p.duration) + '</span></div>');
    html.push('<div class="project-meta">');
    (p.stack || []).forEach(function (s) { html.push('<span class="tag">' + esc(s) + '</span>'); });
    html.push('</div>');

    html.push('<div class="card"><div class="card-title">项目目标</div><p class="muted small">' + esc(p.summary) + '</p><div class="grid cols-2"><div><div class="tiny faint mb-1">交付物</div><ul class="lesson-list" style="margin:0">' + (p.outcomes || []).map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul></div><div><div class="tiny faint mb-1">验收标准</div><ul class="acceptance">' + (p.acceptance || []).map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div></div></div>');

    html.push('<div class="card"><div class="card-title">架构与数据流</div><div class="arch">');
    (p.architecture || []).forEach(function (n, i) {
      if (i > 0) html.push('<span class="arch-arrow">→</span>');
      html.push('<div class="arch-node"><b>' + esc(n.title) + '</b>' + esc(n.sub) + '</div>');
    });
    html.push('</div><div class="tiny faint">把失败路径也画进架构图：超时、熔断、降级、转人工。只画成功路径的架构图，面试时会被追问穿。</div></div>');

    html.push('<div class="card"><div class="card-title">里程碑</div>');
    (p.milestones || []).forEach(function (m, i) {
      html.push('<div class="milestone"><div class="m-n">' + pad(i + 1) + '</div><div><b>' + esc(m.title) + '</b><p>' + esc(m.detail) + '</p><div class="deliver">验收：' + esc(m.deliver) + '</div></div></div>');
    });
    html.push('</div>');

    html.push('<div class="grid cols-2">');
    html.push('<div class="card"><div class="card-title">API 契约</div><ul class="lesson-list" style="margin:0">' + (p.api || []).map(function (a) { return '<li><code style="font-family:var(--mono);font-size:12px">' + esc(a) + '</code></li>'; }).join('') + '</ul></div>');
    html.push('<div class="card"><div class="card-title">风险与应对</div><ul class="lesson-list" style="margin:0">' + (p.risks || []).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul></div>');
    html.push('</div>');

    html.push('<div class="row mt-2"><a class="btn primary" href="#/chapter/' + (p.id === 'kb' ? 'project-kb' : 'project-gateway') + '">读配套章节 →</a><a class="btn ghost" href="#/projects">返回项目列表</a></div>');
    return html.join('');
  }

  /* ---------------- 面试 ---------------- */
  function renderInterview() {
    var total = 0, mastered = 0;
    INTERVIEW.forEach(function (g) {
      g.questions.forEach(function (q, i) {
        total++;
        if (state.interview[g.id + ':' + i]) mastered++;
      });
    });
    var html = [];
    html.push('<div class="row between top"><div><div class="crumb-line">INTERVIEW</div><h1 class="page-title" style="margin-top:0">面试题库</h1><p class="page-sub">30 道高频题，答案不是让你背，而是给你“回答的骨架”。先自己说一遍，再展开对照，最后标为已掌握。</p></div><span class="tag accent">' + mastered + ' / ' + total + ' 已掌握</span></div>');
    html.push('<div class="progress mb-3"><i style="width:' + (total ? mastered / total * 100 : 0) + '%"></i></div>');

    INTERVIEW.forEach(function (group) {
      html.push('<div class="qa-group-title">' + esc(group.title) + '</div>');
      html.push('<p class="tiny faint" style="margin:-4px 0 9px">' + esc(group.desc) + '</p>');
      group.questions.forEach(function (q, i) {
        var key = group.id + ':' + i;
        var isMastered = !!state.interview[key];
        html.push('<details class="qa"><summary>' + esc(q.q) + '</summary>');
        html.push('<div class="answer">' + q.a);
        html.push('<div class="row mt-1"><button class="btn sm ' + (isMastered ? 'ok' : '') + '" data-qa="' + key + '" type="button">' + (isMastered ? '✓ 已掌握' : '标记已掌握') + '</button><span class="tiny faint">能用自己的话讲出来，再点。</span></div></div></details>');
      });
    });
    return html.join('');
  }

  /* ---------------- 速查 ---------------- */
  function renderCheatsheet() {
    var groups = CHEATSHEET.groups || [];
    var activeId = state.cheatGroup || (groups[0] && groups[0].id);
    var active = null;
    groups.forEach(function (g) { if (g.id === activeId) active = g; });
    if (!active) active = groups[0];

    var html = [];
    html.push('<div class="crumb-line">CHEATSHEET</div>');
    html.push('<h1 class="page-title">速查手册</h1>');
    html.push('<p class="page-sub">' + esc(CHEATSHEET.intro || '') + '</p>');
    html.push('<div class="cheat-tabs">');
    groups.forEach(function (g) {
      html.push('<button type="button" class="' + (g.id === active.id ? 'active' : '') + '" data-cheat="' + g.id + '">' + esc(g.title) + '</button>');
    });
    html.push('</div>');
    html.push('<div class="cheat-group"><h3>' + esc(active.title) + '</h3>');
    (active.items || []).forEach(function (item, i) {
      html.push('<details class="cheat-item"' + (i === 0 ? ' open' : '') + '><summary>' + esc(item.title) + '</summary>' + codeBlock(item.lang, (item.lang || 'code').toUpperCase(), item.code) + (item.note ? '<div class="cheat-note">' + esc(item.note) + '</div>' : '') + '</details>');
    });
    html.push('</div>');
    html.push('<div class="card"><div class="card-title">官方文档</div><div class="grid cols-2">');
    (window.RESOURCES || []).forEach(function (r) {
      html.push('<a class="card tight" href="' + r.url + '" target="_blank" rel="noreferrer" style="text-decoration:none;color:inherit"><div class="row between"><b class="small">' + esc(r.title) + '</b><span class="tag">↗</span></div><div class="tiny faint mt-1">' + esc(r.note) + '</div></a>');
    });
    html.push('</div></div>');
    return html.join('');
  }

  /* ---------------- 未找到 ---------------- */
  var pendingBackup = null;
  var LAB_STORAGE_KEYS = ['java-ai-lab.labs.v1', 'java-ai-lab.token.v1', 'java-ai-lab.prompt.v1'];
  function backupData() {
    var labs = {};
    LAB_STORAGE_KEYS.forEach(function (key) { var raw = localStorage.getItem(key); if (raw) labs[key] = JSON.parse(raw); });
    return { format: 'java-ai-learning-backup', version: 1, exportedAt: new Date().toISOString(), state: state, labs: labs };
  }
  function renderBackup() {
    return '<div class="card"><h1>进度备份与恢复</h1><p>备份包含课程进度、答题、代码草稿及实验室数据。数据只保存在当前浏览器，建议定期下载备份。</p>' +
      '<button class="btn primary" type="button" data-export-backup>导出备份</button><p class="mt-2">导入会合并进度；同一练习已有代码时保留当前设备的草稿。建议先导出当前进度。</p>' +
      '<label for="backupFile">选择备份 JSON 文件</label> <input id="backupFile" type="file" accept=".json,application/json"><div id="backupPreview" class="mt-2" aria-live="polite"></div></div>';
  }
  function renderReview() {
    var html = ['<div class="card"><h1>错题复习</h1><p>答错的题会进入这里；在此重新答对后标记为已复习。旧记录中已改对的历史错题无法恢复。</p></div>'];
    var count = 0;
    CHAPTERS.forEach(function (ch) { (ch.quiz || []).forEach(function (q, i) {
      var item = state.review[ch.id + ':' + i];
      if (!item) return;
      count++;
      html.push('<div class="card mt-2"><div class="row between"><b>' + esc(ch.title) + '</b><span class="tag">' + (item.reviewed ? '已复习' : '待复习') + '</span></div><p>' + esc(q.q) + '</p>');
      q.options.forEach(function (opt, j) { html.push('<button class="btn sm" type="button" data-review-ch="' + esc(ch.id) + '" data-review-q="' + i + '" data-review-opt="' + j + '">' + esc(opt) + '</button> '); });
      html.push('<p class="tiny muted">' + (item.reviewed ? esc(q.explain) : '选择答案后查看解释。') + '</p><a href="#/chapter/' + encodeURIComponent(ch.id) + '">回到对应章节 →</a></div>');
    }); });
    if (!count) html.push('<div class="card mt-2">还没有错题。做章节测验时答错的题目会自动出现在这里。</div>');
    return html.join('');
  }
  function renderDiagnostics() {
    return '<div class="card"><h1>本机环境诊断</h1><p>只读取本机 JDK、Maven、Git、Docker 的版本和引擎状态，不安装软件或修改配置。请从本机的 localhost 地址使用。</p><button type="button" class="btn primary" data-diagnose>开始检测</button><div id="diagnosticResults" class="mt-2" aria-live="polite"></div><h2>手动检查</h2><p>直接打开文件或从手机访问时，使用电脑 PowerShell 运行：</p>' + codeBlock('powershell', '环境检查命令', 'java -version\njavac -version\nmvn -v\ngit --version\ndocker version\n$env:JAVA_HOME') + '<p class="muted">Maven 找不到时可进入示例目录使用 .\\mvnw.cmd；Docker 只有 Client 而没有 Server 时请启动 Docker Desktop 并等待引擎就绪。JAVA_HOME 与 java 可能指向不同版本，以 mvn -v 为准。</p></div>';
  }

  function renderNotFound() {
    return '<div class="card center" style="padding:50px 20px"><div class="big-number">404</div><h2 class="mt-1">这页不存在</h2><p class="muted">可能是链接拼错了，或者内容还没写到这里。</p><a class="btn primary" href="#/home">回学习总览</a></div>';
  }

  /* ---------------- 渲染入口 ---------------- */
  function footer() {
    return '<div class="tiny faint center mt-3" style="border-top:1px solid var(--border);padding-top:16px">' +
      'Java × AI 工程化 · 本地学习站 · 进度保存在浏览器 localStorage<br>' +
      '版本基线：Spring AI 1.0.x / LangChain4j 1.x / Spring Boot 3.x / JDK 21；价格与模型名以官方为准' +
      '</div>';
  }

  function render() {
    if (window.Labs) window.Labs.unmount();
    var route = parseRoute();
    applyTheme();
    renderSidebar(route);
    renderTopbar(route);

    var view = $('#view');
    var html = '';
    if (route.name === 'home') html = renderHome();
    else if (route.name === 'roadmap') html = renderRoadmap();
    else if (route.name === 'chapter') html = renderChapter(route.id);
    else if (route.name === 'labs') html = renderLabsIndex();
    else if (route.name === 'lab') html = renderLab(route.id);
    else if (route.name === 'projects') html = renderProjects();
    else if (route.name === 'project') html = renderProjectDetail(route.id);
    else if (route.name === 'interview') html = renderInterview();
    else if (route.name === 'cheatsheet') html = renderCheatsheet();
    else if (route.name === 'backup') html = renderBackup();
    else if (route.name === 'review') html = renderReview();
    else if (route.name === 'diagnostics') html = renderDiagnostics();
    else html = renderNotFound();

    view.innerHTML = '<div class="fade-up">' + html + '</div>' + footer() + '<button class="back-top btn sm" type="button" data-back-top aria-label="返回顶部">↑ 顶部</button>';
    closeSidebar();

    if (route.name === 'chapter') {
      view.setAttribute('data-chapter', route.id);
    } else {
      view.removeAttribute('data-chapter');
    }

    if (route.name === 'lab') {
      var root = $('#labRoot');
      if (root && window.Labs) {
        window.Labs.mount(route.id, root);
      }
    }

    var targetSection = route.name === 'chapter' && (route.section || state.reading[route.id]);
    var targetNode = targetSection && /^s\d+$/.test(targetSection) ? document.getElementById('section-' + targetSection) : null;
    if (targetNode) targetNode.scrollIntoView({ block: 'start' }); else window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ---------------- 侧栏 / 主题 ---------------- */
  function closeSidebar() {
    var sidebar = $('#sidebar');
    var backdrop = $('#backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('show');
  }

  function toggleSidebar() {
    var sidebar = $('#sidebar');
    var backdrop = $('#backdrop');
    if (!sidebar) return;
    sidebar.classList.toggle('open');
    if (backdrop) backdrop.classList.toggle('show', sidebar.classList.contains('open'));
  }

  /* ---------------- 事件绑定（只绑一次） ---------------- */
  function bindGlobalEvents() {
    var topbar = $('#topbar');
    var view = $('#view');
    var sidebar = $('#sidebar');
    var backdrop = $('#backdrop');

    if (topbar) {
      topbar.addEventListener('input', function (e) {
        if (e.target && e.target.id === 'searchInput') doSearch(e.target.value);
      });
      topbar.addEventListener('keydown', function (e) {
        if (e.target && e.target.id === 'searchInput') {
          if (e.key === 'Enter') {
            var first = $('#searchResults button');
            if (first) {
              location.hash = first.getAttribute('data-search-href');
              closeSearch();
            }
          }
          if (e.key === 'Escape') closeSearch();
        }
      });
      topbar.addEventListener('click', function (e) {
        var t = e.target;
        if (!t) return;


        if (t.id === 'menuBtn') { toggleSidebar(); return; }
        if (t.id === 'themeBtn') {
          state.theme = state.theme === 'light' ? 'dark' : 'light';
          save();
          applyTheme();
          renderTopbar(parseRoute());
          renderSidebar(parseRoute());
          return;
        }
        var result = t.closest ? t.closest('[data-search-href]') : null;
        if (result) {
          location.hash = result.getAttribute('data-search-href');
          closeSearch();
        }
      });
    }

    if (view) {
      view.addEventListener('click', function (e) {
        var t = e.target;
        if (!t) return;
        var mark = t.closest ? t.closest('[data-bookmark]') : null;
        if (mark) { var markId = mark.getAttribute('data-bookmark'); if (state.bookmarks[markId]) delete state.bookmarks[markId]; else state.bookmarks[markId] = true; save(); render(); return; }
        if (t.closest && t.closest('[data-back-top]')) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

        if (t.closest && t.closest('[data-export-backup]')) {
          try {
            var blob = new Blob([JSON.stringify(backupData(), null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob), a = document.createElement('a');
            a.href = url; a.download = 'java-ai-progress-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          } catch (err) { toast('导出失败：' + err.message, 'warn'); }
          return;
        }
        if (t.closest && t.closest('[data-confirm-import]')) {
          if (!pendingBackup) return;
          try {
            var incoming = window.ProgressTools.validate(pendingBackup);
            var merged = window.ProgressTools.merge(state, incoming), writes = {};
            writes[KEY] = JSON.stringify(merged);
            LAB_STORAGE_KEYS.forEach(function (key) {
              if (!pendingBackup.labs || !pendingBackup.labs[key]) return;
              var existing = localStorage.getItem(key);
              writes[key] = JSON.stringify(Object.assign({}, pendingBackup.labs[key], existing ? JSON.parse(existing) : {}));
            });
            var previous = {}; Object.keys(writes).forEach(function (key) { previous[key] = localStorage.getItem(key); });
            if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
            try { Object.keys(writes).forEach(function (key) { localStorage.setItem(key, writes[key]); }); }
            catch (error) { Object.keys(previous).forEach(function (key) { if (previous[key] === null) localStorage.removeItem(key); else localStorage.setItem(key, previous[key]); }); throw error; }
            state = merged; seedReview(); save(); pendingBackup = null; render(); toast('备份已合并', 'ok');
          } catch (err) { toast('导入失败：' + err.message, 'warn'); }
          return;
        }
        var reviewButton = t.closest ? t.closest('[data-review-ch]') : null;
        if (reviewButton) {
          var reviewChapter = chapterById(reviewButton.getAttribute('data-review-ch'));
          var reviewIndex = Number(reviewButton.getAttribute('data-review-q'));
          var question = reviewChapter && reviewChapter.quiz[reviewIndex];
          if (question) {
            var reviewKey = reviewChapter.id + ':' + reviewIndex;
            state.review[reviewKey] = { reviewed: Number(reviewButton.getAttribute('data-review-opt')) === question.answer };
            save(); render(); toast(state.review[reviewKey].reviewed ? '答对了，已标记复习' : '再试试，回章节查看讲解', state.review[reviewKey].reviewed ? 'ok' : 'warn');
          }
          return;
        }
        if (t.closest && t.closest('[data-diagnose]')) {
          var output = $('#diagnosticResults'); output.textContent = '正在检测…';
          if (location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].indexOf(location.hostname) < 0) { output.textContent = '自动检测只能在电脑本机网站运行，请使用下方手动命令。'; return; }
          fetch('/api/diagnostics', { cache: 'no-store' }).then(function (response) { if (!response.ok) throw Error('请从本机 localhost 访问，并重启学习网站服务'); return response.json(); }).then(function (data) {
            output.innerHTML = '<ul class="lesson-list">' + data.checks.map(function (item) { return '<li><strong>' + esc(item.label) + '</strong>：' + esc(item.ok ? item.output : item.message) + '</li>'; }).join('') + '</ul>';
          }).catch(function (error) { output.textContent = '自动检测不可用：' + error.message + '。请使用下方手动命令。'; });
          return;
        }


        var copy = t.closest ? t.closest('[data-copy]') : null;
        if (copy) {
          var block = copy.closest('.code-block');
          var code = block ? block.querySelector('pre code') : null;
          if (code) {
            copyText(code.textContent).then(function () { toast('代码已复制', 'ok'); }).catch(function () { toast('复制失败，请手动选择', 'warn'); });
          }
          return;
        }

        var complete = t.closest ? t.closest('[data-complete]') : null;
        if (complete) {
          var ch = chapterById(view.getAttribute('data-chapter'));
          if (ch) toggleComplete(ch);
          return;
        }

        var quiz = t.closest ? t.closest('[data-quiz]') : null;
        if (quiz && !quiz.disabled) {
          var chq = chapterById(view.getAttribute('data-chapter'));
          if (chq) answerQuiz(chq, Number(quiz.getAttribute('data-quiz')), Number(quiz.getAttribute('data-opt')));
          return;
        }

        if (t.closest && t.closest('[data-ex-check]')) {
          var chex = chapterById(view.getAttribute('data-chapter'));
          if (chex) runExerciseChecks(chex);
          return;
        }
        if (t.closest && t.closest('[data-ex-hint]')) {
          showNextHint();
          return;
        }
        if (t.closest && t.closest('[data-ex-solution]')) {
          var sol = $('#exSolution');
          var btn = t.closest('[data-ex-solution]');
          if (sol) {
            sol.hidden = !sol.hidden;
            btn.textContent = sol.hidden ? '查看参考答案' : '收起参考答案';
          }
          return;
        }

        var qa = t.closest ? t.closest('[data-qa]') : null;
        if (qa) {
          var key = qa.getAttribute('data-qa');
          state.interview[key] = !state.interview[key];
          if (!state.interview[key]) delete state.interview[key];
          save();
          qa.className = 'btn sm ' + (state.interview[key] ? 'ok' : '');
          qa.textContent = state.interview[key] ? '✓ 已掌握' : '标记已掌握';
          var total = 0, mastered = 0;
          INTERVIEW.forEach(function (g) {
            g.questions.forEach(function (q, i) {
              total++;
              if (state.interview[g.id + ':' + i]) mastered++;
            });
          });
          var tag = $('.page-title') && $('.page-title').parentNode ? $('.page-title').parentNode.querySelector('.tag.accent') : null;
          if (tag) tag.textContent = mastered + ' / ' + total + ' 已掌握';
          return;
        }

        var cheat = t.closest ? t.closest('[data-cheat]') : null;
        if (cheat) {
          state.cheatGroup = cheat.getAttribute('data-cheat');
          save();
          render();
        }
      });

      view.addEventListener('input', function (e) {
        if (!e.target) return;
        if (e.target.id === 'exEditor') {
          var ch = chapterById(view.getAttribute('data-chapter'));
          if (!ch) return;
          var rec = state.exercises[ch.id] || {};
          rec.code = e.target.value;
          state.exercises[ch.id] = rec;
          save();
        }
      });
      view.addEventListener('change', function (e) {
        if (!e.target || e.target.id !== 'backupFile') return;
        var file = e.target.files && e.target.files[0], preview = $('#backupPreview'); pendingBackup = null;
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) { preview.textContent = '备份文件过大（上限 3 MB）。'; return; }
        file.text().then(function (text) {
          var data = JSON.parse(text); var incoming = window.ProgressTools.validate(data); pendingBackup = data;
          preview.innerHTML = '<p>备份时间：' + esc(data.exportedAt || '未知') + '；章节记录：' + Object.keys(incoming.chapters).length + '；练习草稿：' + Object.keys(incoming.exercises).length + '。冲突草稿保留本机版本。</p><button type="button" class="btn primary" data-confirm-import>确认合并导入</button>';
        }).catch(function () { preview.textContent = '备份文件无效或版本不受支持，当前数据未改变。'; });
      });
    }

    if (sidebar) {
      sidebar.addEventListener('click', function (e) {
        var link = e.target && e.target.closest ? e.target.closest('a') : null;
        if (link) closeSidebar();
      });
    }
    if (backdrop) backdrop.addEventListener('click', closeSidebar);

    document.addEventListener('click', function (e) {
      var wrap = e.target && e.target.closest ? e.target.closest('.search-wrap') : null;
      if (!wrap) closeSearch();
    });

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k') {
        e.preventDefault();
        var input = $('#searchInput');
        if (input) { input.focus(); input.select(); }
      }
      if (e.key === 'Escape') closeSidebar();
    });

    window.addEventListener('hashchange', render);
    var scrollTimer = null;
    window.addEventListener('scroll', function () {
      if (scrollTimer) return;
      scrollTimer = setTimeout(function () {
        scrollTimer = null;
        var route = parseRoute(); if (route.name !== 'chapter') return;
        var current = '';
        $$('.lesson-h2[id], .lesson-h3[id]').forEach(function (node) { if (node.getBoundingClientRect().top <= 140) current = node.id.replace('section-', ''); });
        if (current && state.reading[route.id] !== current) { state.reading[route.id] = current; save(); }
      }, 400);
    }, { passive: true });
    window.addEventListener('beforeunload', function () {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    });
  }

  function closeSearch() {
    var box = $('#searchResults');
    var input = $('#searchInput');
    if (box) { box.hidden = true; box.innerHTML = ''; }
    if (input) input.value = '';
  }

  /* ---------------- 启动 ---------------- */
  buildSearchIndex();
  bindGlobalEvents();
  render();

})();
