/* 数据完整性检查：不依赖浏览器 */
global.window = {};
require('../content/site.js');
require('../content/stage0.js');
require('../content/stage1.js');
require('../content/stage2.js');
require('../content/stage3.js');
require('../content/stage4.js');
require('../content/stage5.js');
require('../content/stage6.js');
require('../content/guides.js');
require('../content/spring-practice.js');
require('../content/rag-deep-dive.js');
require('../content/cheatsheet.js');
require('../content/projects.js');
require('../content/interview.js');

const chapters = window.CHAPTERS;
const stages = window.STAGES;
const errors = [];
const ids = new Set();
const fs = require('fs');
const path = require('path');
['environment-check', 'spring-greeting', 'database-notes', 'api-validation', 'spring-ai-mock', 'vector-search-mock', 'rag-mock', 'java-core-practice'].forEach(name => {
  if (!fs.existsSync(path.join(__dirname, '..', 'examples', 'downloads', name + '.zip'))) errors.push('missing example download ' + name);
});

if (!Array.isArray(chapters) || chapters.length !== 24) errors.push('expected 24 chapters, got ' + (chapters || []).length);
chapters.forEach((ch, i) => {
  if (!ch.id) errors.push('chapter ' + i + ' missing id');
  if (ids.has(ch.id)) errors.push('duplicate id ' + ch.id);
  ids.add(ch.id);
  if (!ch.title || !ch.summary || !ch.stage) errors.push(ch.id + ' missing title/summary/stage');
  if (!stages.find(s => s.id === ch.stage)) errors.push(ch.id + ' unknown stage ' + ch.stage);
  if (!Array.isArray(ch.objectives) || ch.objectives.length < 2) errors.push(ch.id + ' objectives < 2');
  if (!Array.isArray(ch.sections) || ch.sections.length < 4) errors.push(ch.id + ' sections < 4');
  if (!ch.learningGuide || !ch.learningGuide.prerequisite || !ch.learningGuide.steps || !ch.learningGuide.expected || !ch.learningGuide.troubleshoot || !ch.learningGuide.next) errors.push(ch.id + ' incomplete learning guide');
  if (!Array.isArray(ch.quiz) || ch.quiz.length < 2) errors.push(ch.id + ' quiz < 2');
  (ch.quiz || []).forEach((q, qi) => {
    if (!q.q) errors.push(ch.id + ' quiz ' + qi + ' missing q');
    if (!Array.isArray(q.options) || q.options.length < 2) errors.push(ch.id + ' quiz ' + qi + ' options');
    if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length) errors.push(ch.id + ' quiz ' + qi + ' answer out of range');
    if (!q.explain) errors.push(ch.id + ' quiz ' + qi + ' missing explain');
  });
  (ch.sections || []).forEach((s, si) => {
    if (!s.type) errors.push(ch.id + ' section ' + si + ' missing type');
    if (s.type === 'code' && typeof s.code !== 'string') errors.push(ch.id + ' section ' + si + ' code not string');
    if (s.type === 'table' && (!Array.isArray(s.rows) || !s.rows.length)) errors.push(ch.id + ' section ' + si + ' table rows');
    if (s.type === 'flow' && (!Array.isArray(s.items) || s.items.length < 2)) errors.push(ch.id + ' section ' + si + ' flow items');
  });
  if (ch.exercise) {
    if (!ch.exercise.title || !ch.exercise.prompt) errors.push(ch.id + ' exercise missing title/prompt');
    if (!Array.isArray(ch.exercise.checks) || !ch.exercise.checks.length) errors.push(ch.id + ' exercise checks');
    (ch.exercise.checks || []).forEach((c, ci) => {
      if (!c.label || (!c.includes && !c.re && !c.test)) errors.push(ch.id + ' check ' + ci + ' invalid');
    });
    if (typeof ch.exercise.solution !== 'string') errors.push(ch.id + ' exercise solution');
  }
});

if (!window.PROJECTS || window.PROJECTS.length !== 2) errors.push('expected 2 projects');
if (!window.INTERVIEW || window.INTERVIEW.length !== 6) errors.push('expected 6 interview groups');
if (!window.CHEATSHEET || !window.CHEATSHEET.groups || window.CHEATSHEET.groups.length < 8) errors.push('cheatsheet groups');
if (!window.SITE || !window.SITE.capabilities || window.SITE.capabilities.length !== 6) errors.push('capabilities');

if (errors.length) {
  console.error('FAILED with ' + errors.length + ' issues:');
  errors.forEach(e => console.error(' - ' + e));
  process.exit(1);
}
console.log('OK: ' + chapters.length + ' chapters, ' +
  chapters.reduce((n, c) => n + c.quiz.length, 0) + ' quiz questions, ' +
  chapters.filter(c => c.exercise).length + ' exercises, ' +
  window.PROJECTS.length + ' projects, ' +
  window.INTERVIEW.reduce((n, g) => n + g.questions.length, 0) + ' interview questions.');
