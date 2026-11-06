/* Supabase 客户端：仅使用公开密钥；学习数据始终由 RLS 保护。 */
const { createClient } = require('@supabase/supabase-js');
const { mergeSnapshots } = require('./sync-merge');

function validPublicKey(key) {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  if (!key.startsWith('eyJ')) return false;
  try {
    const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role === 'anon';
  } catch (_) { return false; }
}

function makeClient(url, key) {
  const u = new URL(url);
  if (u.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(u.hostname) || u.pathname !== '/' || u.search || u.hash || !validPublicKey(key)) {
    throw new Error('请填写 Supabase 项目 HTTPS 地址与 publishable/anon 公开密钥，不要填写 secret 或 service_role 密钥。');
  }
  return createClient(u.origin, key, { auth: { detectSessionInUrl: false } });
}

/* snapshot 必须是已经过备份校验的数据；冲突未解决时绝不上传。 */
async function synchronize(client, userId, base, capture, apply, choices, canApply) {
  for (let tries = 0; tries < 3; tries++) {
    const local = capture();
    const query = await client.from('learning_progress').select('revision,snapshot').eq('user_id', userId).maybeSingle();
    if (query.error) throw query.error;
    const row = query.data;
    if (row && typeof window !== 'undefined' && window.ProgressTools) window.ProgressTools.validate(row.snapshot);
    const merged = row ? mergeSnapshots(base, local, row.snapshot) : { value: local, conflicts: [] };
    const unresolved = [];
    for (const conflict of merged.conflicts) {
      const selected = choices && choices[conflict.chapter];
      if (!selected || selected.local !== conflict.local || selected.remote !== conflict.remote) { unresolved.push(conflict); continue; }
      const exercise = merged.value.state.exercises[conflict.chapter];
      exercise.code = selected.choice === 'remote' ? conflict.remote : conflict.local;
      if (selected.choice === 'remote') { exercise.passed = false; delete exercise.checks; }
    }
    if (unresolved.length) return { status: 'conflict', conflicts: unresolved };
    if (canApply && JSON.stringify(merged.value) !== JSON.stringify(local) && !canApply()) return { status: 'editing' };
    // 网络请求期间若本地有编辑，重新读取；不能用旧快照覆盖新的草稿。
    if (JSON.stringify(capture()) !== JSON.stringify(local)) continue;
    if (row && JSON.stringify(row.snapshot) === JSON.stringify(merged.value)) {
      if (JSON.stringify(merged.value) !== JSON.stringify(local)) apply(merged.value);
      return { status: 'synced', base: merged.value, revision: row.revision };
    }
    let write;
    if (!row) write = await client.from('learning_progress').insert({ user_id: userId, revision: 0, snapshot: merged.value }).select('revision');
    else write = await client.from('learning_progress').update({ revision: row.revision + 1, snapshot: merged.value, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('revision', row.revision).select('revision');
    if (write.error) { if (write.error.code === '23505') continue; throw write.error; }
    if (!write.data || !write.data.length) continue; // CAS 冲突或 RLS 拒绝；禁止假报成功。
    if (JSON.stringify(capture()) !== JSON.stringify(local)) return { status: 'retry' };
    if (JSON.stringify(merged.value) !== JSON.stringify(local)) apply(merged.value);
    return { status: 'synced', base: merged.value, revision: write.data[0].revision };
  }
  return { status: 'retry' };
}
module.exports = { makeClient, synchronize, validPublicKey };
