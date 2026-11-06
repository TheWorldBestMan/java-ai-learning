const assert = require('assert');
const { synchronize, validPublicKey, makeClient } = require('../src/cloud-sync');
const snapshot = code => ({ format:'java-ai-learning-backup', version:1, state:{ exercises:{ x:{code} } } });
function clientFor(initial) {
  let row = initial;
  return { get row(){return row}, from(){ return {
    select(){ return { eq(){return { async maybeSingle(){return {data:row,error:null}} }} } },
    update(value){return {eq(){return {eq(_field,revision){return {async select(){if (!row || row.revision!==revision) return {data:[],error:null}; row={...value};return {data:[{revision:value.revision}],error:null}}}}}}}},
    insert(value){return {async select(){if(row)return {error:{code:'23505'}};row=value;return {data:[{revision:value.revision}],error:null}}}}
  }} };
}
(async () => {
  assert(validPublicKey('sb_publishable_example'));
  assert(!validPublicKey('sb_secret_example'));
  assert.throws(() => makeClient('http://example.supabase.co', 'sb_publishable_example'));
  assert.throws(() => makeClient('https://example.supabase.co', 'sb_secret_example'));
  let current = snapshot('local');
  const client = clientFor({revision:1,snapshot:snapshot('remote')});
  const capture = () => JSON.parse(JSON.stringify(current));
  const apply = v => {current = v};
  let r = await synchronize(client, 'u1', snapshot('base'), capture, apply, {});
  assert.strictEqual(r.status, 'conflict');
  assert.strictEqual(client.row.snapshot.state.exercises.x.code, 'remote');
  r = await synchronize(client, 'u1', snapshot('base'), capture, apply, {x:{local:'local',remote:'remote',choice:'local'}});
  assert.strictEqual(r.status, 'synced');
  assert.strictEqual(client.row.snapshot.state.exercises.x.code, 'local');
  assert.strictEqual(client.row.revision, 2);
  const waiting = clientFor({revision:3,snapshot:snapshot('remote')});
  let calls = 0, latest = snapshot('base');
  const changingCapture = () => { calls++; if (calls === 2) latest = snapshot('edited while fetching'); return JSON.parse(JSON.stringify(latest)); };
  const race = await synchronize(waiting, 'u1', snapshot('base'), changingCapture, () => { throw new Error('must not apply conflict'); }, {});
  assert.strictEqual(race.status, 'conflict');
  assert.strictEqual(waiting.row.snapshot.state.exercises.x.code, 'remote');
  const editing = await synchronize(waiting, 'u1', snapshot('base'), () => snapshot('base'), () => { throw new Error('must not apply while editing'); }, {}, () => false);
  assert.strictEqual(editing.status, 'editing');
  assert.strictEqual(waiting.row.revision, 3);
  const remoteChoice = clientFor({revision:1,snapshot:snapshot('remote')});
  let chosen = snapshot('local'); chosen.state.exercises.x.passed = true;
  const resolved = await synchronize(remoteChoice, 'u1', snapshot('base'), () => JSON.parse(JSON.stringify(chosen)), v => {chosen = v}, {x:{local:'local',remote:'remote',choice:'remote'}});
  assert.strictEqual(resolved.status, 'synced');
  assert.strictEqual(chosen.state.exercises.x.code, 'remote');
  assert.strictEqual(chosen.state.exercises.x.passed, false);
  const shared = clientFor({revision:5,snapshot:snapshot('original')});
  const base = snapshot('original'); let deviceA = snapshot('edited on A'), deviceB = snapshot('edited on B');
  const savedA = await synchronize(shared, 'u1', base, () => JSON.parse(JSON.stringify(deviceA)), v => {deviceA = v}, {});
  assert.strictEqual(savedA.status, 'synced');
  const collidedB = await synchronize(shared, 'u1', base, () => JSON.parse(JSON.stringify(deviceB)), v => {deviceB = v}, {});
  assert.strictEqual(collidedB.status, 'conflict');
  assert.strictEqual(collidedB.conflicts[0].remote, 'edited on A');
  assert.strictEqual(deviceB.state.exercises.x.code, 'edited on B');
  assert.strictEqual(shared.row.snapshot.state.exercises.x.code, 'edited on A');
  console.log('OK: cloud CAS and conflict safety');
})().catch(e => { console.error(e); process.exitCode=1; });
