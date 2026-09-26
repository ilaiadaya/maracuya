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
  const lead = { submissionId: randomUUID(), services: ['Customer support', 'Custom tools & software'], size: '11–50', budget: '€5,000–€10,000', name: 'QA Test', company: 'Test Company', email: 'qa@example.com', attribution: { utm_source: 'meta', secret: 'not stored' } };
  const post = (body, headers = {}) => fetch(`${base}/api/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  try {
    await start();
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal((await (await fetch(`${base}/api/config`)).json()).bookingUrl, 'https://cal.com/test/15min');
    assert.equal((await post({ ...lead, services: [] })).status, 400);
    assert.equal((await post({ ...lead, services: ['Other'] })).status, 400);
    assert.equal((await post({ ...lead, services: ['Managed support'] })).status, 400);
    assert.equal((await post({ ...lead, website: 'bot-filled-field' })).status, 400);
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
    assert.equal(JSON.parse(saved[0]).companyWebsite, '');
    assert.equal('consent' in JSON.parse(saved[0]), false);
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

test('payments intake keeps its service and commercial model separate from AI enquiries', async () => {
  const dir=await mkdtemp(join(tmpdir(),'maracuya-payments-')); const port=30000+Math.floor(Math.random()*10000);
  const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port),DATA_DIR:dir},stdio:['ignore','pipe','pipe']});
  await once(child.stdout,'data');
  const lead={submissionId:randomUUID(),funnel:'payments',landingPath:'/payments/review',services:['Account restriction review'],size:'2–10',budget:'Revenue share',name:'Test',company:'Test business',email:'test@example.com',companyWebsite:'example.com/product'};
  const post=body=>fetch(`http://localhost:${port}/api/leads`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  try {
    assert.equal((await post({...lead,budget:'€1,000–€5,000'})).status,400);
    assert.equal((await post({...lead,funnel:'ai'})).status,400);
    for (const companyWebsite of ['javascript:alert(1)', 'not a website', 'https://user:secret@example.com', 'ftp://example.com', 42]) assert.equal((await post({...lead,companyWebsite})).status,400);
    assert.equal((await post(lead)).status,201);
    const saved=JSON.parse((await readFile(join(dir,'leads.ndjson'),'utf8')).trim());
    assert.equal(saved.companyWebsite,'https://example.com/product'); assert.equal('consent' in saved,false);
    assert.equal(saved.funnel,'payments'); assert.equal(saved.landingPath,'/payments/review');assert.equal(saved.budget,'Revenue share');
    assert.equal((await post(lead)).status,200);
  } finally {child.kill();await once(child,'exit');await rm(dir,{recursive:true,force:true});}
});
