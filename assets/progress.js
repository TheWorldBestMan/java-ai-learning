/* 备份校验与合并，不修改传入对象。 */
(function (root) {
  function object(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function safeMap(x) { return object(x) && Object.keys(x).every(function (k) { return k !== '__proto__' && k !== 'constructor' && k !== 'prototype'; }); }
  function validate(data) {
    if (!object(data) || data.format !== 'java-ai-learning-backup' || data.version !== 1 || !object(data.state)) throw Error('备份格式或版本不受支持');
    var s = data.state;
    if (s.version !== 1) throw Error('进度版本不受支持');
    ['chapters','exercises','quiz','labs','interview'].forEach(function (key) { if (!safeMap(s[key])) throw Error('备份中 ' + key + ' 格式无效'); });
    if (s.review !== undefined && !safeMap(s.review)) throw Error('错题数据格式无效');
    if (s.bookmarks !== undefined && !safeMap(s.bookmarks)) throw Error('收藏数据格式无效');
    if (s.reading !== undefined && !safeMap(s.reading)) throw Error('阅读位置格式无效');
    Object.keys(s.chapters).forEach(function (k) { if (!object(s.chapters[k]) || (s.chapters[k].done !== undefined && typeof s.chapters[k].done !== 'boolean')) throw Error('章节记录无效'); });
    Object.keys(s.exercises).forEach(function (k) { var e = s.exercises[k]; if (!object(e) || (e.code !== undefined && typeof e.code !== 'string') || (e.passed !== undefined && typeof e.passed !== 'boolean') || (e.checks !== undefined && (!Array.isArray(e.checks) || e.checks.some(function (c) { return !object(c) || typeof c.label !== 'string' || typeof c.pass !== 'boolean'; })))) throw Error('练习记录无效'); });
    Object.keys(s.quiz).forEach(function (k) { if (!object(s.quiz[k]) || !safeMap(s.quiz[k].answers)) throw Error('测验记录无效'); Object.keys(s.quiz[k].answers).forEach(function (n) { if (!/^\d+$/.test(n) || !Number.isInteger(s.quiz[k].answers[n]) || s.quiz[k].answers[n] < 0) throw Error('测验答案无效'); }); });
    Object.keys(s.review || {}).forEach(function (k) { if (!object(s.review[k]) || typeof s.review[k].reviewed !== 'boolean') throw Error('错题记录无效'); });
    if (data.labs !== undefined && !safeMap(data.labs)) throw Error('实验室备份无效');
    if (data.labs) Object.keys(data.labs).forEach(function (k) { if (['java-ai-lab.labs.v1','java-ai-lab.token.v1','java-ai-lab.prompt.v1'].indexOf(k) < 0 || !safeMap(data.labs[k])) throw Error('实验室备份无效'); });
    if (!Number.isFinite(s.xp) || s.xp < 0) throw Error('经验值无效');
    return s;
  }
  function merge(current, incoming) {
    var result = JSON.parse(JSON.stringify(current));
    ['exercises','labs','interview','review','bookmarks','reading'].forEach(function (key) { result[key] = Object.assign({}, incoming[key] || {}, current[key] || {}); });
    Object.keys(incoming.interview).forEach(function (k) { if (incoming.interview[k]) result.interview[k] = incoming.interview[k]; });
    result.chapters = Object.assign({}, incoming.chapters, current.chapters);
    Object.keys(incoming.chapters).forEach(function (k) { if (incoming.chapters[k].done && !(current.chapters[k] && current.chapters[k].done)) result.chapters[k] = incoming.chapters[k]; });
    result.quiz = Object.assign({}, incoming.quiz, current.quiz);
    Object.keys(incoming.quiz).forEach(function (k) { if (current.quiz[k]) result.quiz[k] = Object.assign({}, incoming.quiz[k], current.quiz[k], { answers: Object.assign({}, incoming.quiz[k].answers, current.quiz[k].answers) }); });
    result.xp = Math.max(current.xp || 0, incoming.xp || 0);
    return result;
  }
  root.ProgressTools = { validate: validate, merge: merge };
  if (typeof module !== 'undefined') module.exports = root.ProgressTools;
})(typeof window !== 'undefined' ? window : globalThis);
