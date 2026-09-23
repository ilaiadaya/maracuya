import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';

test('lead capture validates, deduplicates, persists across restart, and protects exports', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'maracuya-test-'));
  const port = 19000 + Math.floor(Math.random() * 10000);
  const base = `http://localhost:${port}`;
  const token = randomUUID();
  let child;
  async function start() {
    child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, LEADS_ADMIN_TOKEN: token, BOOKING_URL: 'https://cal.com/test/15min' }, stdio: ['ignore', 'pipe', 'pipe'] });
    await once(child.stdout, 'data');
  }
  async function stop() { child.kill(); await once(child, 'exit'); }
  const lead = { submissionId: randomUUID(), services: ['Customer support', 'Custom tools & software'], size: '11–50', budget: '€5,000–€10,000', name: 'QA Test', company: 'Test Company', email: 'qa@example.com', consent: true, attribution: { utm_source: 'meta', secret: 'not stored' } };
  const post = (body, headers = {}) => fetch(`${base}/api/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  try {
    await start();
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal((await (await fetch(`${base}/api/config`)).json()).bookingUrl, 'https://cal.com/test/15min');
    assert.equal((await post({ ...lead, services: [] })).status, 400);
    assert.equal((await post({ ...lead, services: ['Other'] })).status, 400);
    assert.equal((await post({ ...lead, consent: false })).status, 400);
    assert.equal((await post({ ...lead, email: 'bad' })).status, 400);
    assert.equal((await post(null)).status, 400);
    assert.equal((await post(lead, { Origin: 'https://evil.example' })).status, 403);
    assert.equal((await post({ ...lead, notes: 'a'.repeat(17000) })).status, 413);
    const first = await post(lead);
    assert.equal(first.status, 201);
    const { id } = await first.json();
    assert.equal((await (await post(lead)).json()).id, id);
    const saved = (await readFile(join(dataDir, 'leads.ndjson'), 'utf8')).trim().split('\n');
    assert.equal(saved.length, 1);
    assert.deepEqual(JSON.parse(saved[0]).attribution, { utm_source: 'meta' });
    assert.equal((await fetch(`${base}/api/leads`)).status, 401);
    assert.equal((await fetch(`${base}/api/leads`, { headers: { Authorization: 'Bearer wrong' } })).status, 401);
    assert.equal((await fetch(`${base}/server.js`)).status, 404);
    await stop();
    await start();
    const exported = await fetch(`${base}/api/leads`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(exported.status, 200);
    assert.equal(JSON.parse((await exported.text()).trim()).id, id);
    assert.equal((await (await post(lead)).json()).id, id);
    for (let i = 0; i < 15; i++) await post({});
    assert.equal((await post(lead)).status, 429);
  } finally { if (child && child.exitCode === null) await stop(); await rm(dataDir, { recursive: true, force: true }); }
});
