/* 三方合并：练习草稿冲突必须由用户选择。 */
function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function obj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
function mergeSnapshots(base, local, remote) {
  const conflicts = [];
  function walk(b, l, r, path) {
    if (equal(l, r)) return l;
    if (b !== undefined && equal(l, b)) return r;
    if (b !== undefined && equal(r, b)) return l;
    if (obj(l) && obj(r)) {
      const out = {};
      for (const k of new Set([...Object.keys(l), ...Object.keys(r)])) {
        if (['__proto__', 'constructor', 'prototype'].includes(k)) continue;
        const v = walk(obj(b) ? b[k] : undefined, l[k], r[k], path.concat(k));
        if (v !== undefined) out[k] = v;
      }
      return out;
    }
    if (l === undefined) return r;
    if (r === undefined) return l;
    if (path.length === 4 && path[0] === 'state' && path[1] === 'exercises' && path[3] === 'code' && l !== r) {
      conflicts.push({ chapter: path[2], local: l, remote: r }); return l;
    }
    if (path[0] === 'state' && ((path[1] === 'chapters' && path[3] === 'done') || path[1] === 'bookmarks' || path[1] === 'interview')) return !!l || !!r;
    return l;
  }
  return { value: walk(base, local, remote, []), conflicts };
}
if (typeof module !== 'undefined') module.exports = { mergeSnapshots };
