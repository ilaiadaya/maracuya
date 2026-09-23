import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

test('measurement requires consent and an accepted booking, and deduplicates callbacks', async () => {
  const nodes = [], scripts = [], calls = [];
  const storage = () => { const values = new Map(); return { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v) }; };
  const document = {
    cookie: '',
    createElement(tag) { const node = {tag, handlers: {}, append() {}, setAttribute() {}, addEventListener(k, fn) { this.handlers[k] = fn; }}; nodes.push(node); return node; },
    head: { append: node => scripts.push(node) }, body: { append() {} }, querySelectorAll: () => []
  };
  const window = {};
  vm.runInNewContext(readFileSync(new URL('../public/tracking.js', import.meta.url), 'utf8'), {
    window, document, localStorage: storage(), sessionStorage: storage(), location: { hostname: 'maracuyalabs.com' },
    fetch: async () => ({ json: async () => ({ metaPixelId: '1705221900551937' }) })
  });
  const booking = { uid: 'booking-1', eventTypeId: 7193637, status: 'ACCEPTED', paymentRequired: false };
  assert.equal(await window.MaracuyaTracking.booked(booking), false);
  assert.equal(scripts.length, 0);
  nodes.find(n => n.textContent === 'Allow measurement').handlers.click();
  window.fbq.callMethod = (...args) => calls.push(args);
  assert.equal(scripts.length, 1);
  for (const invalid of [{status:'PENDING'}, {eventTypeId:1}, {uid:''}, {paymentRequired:true}]) {
    assert.equal(await window.MaracuyaTracking.booked({...booking, ...invalid}), false);
  }
  assert.equal(await window.MaracuyaTracking.booked(booking), true);
  assert.equal(await window.MaracuyaTracking.booked(booking), false);
  assert.equal(calls.filter(c => c[2] === 'Schedule').length, 1);
  nodes.find(n => n.textContent === 'Decline').handlers.click();
  assert.equal(await window.MaracuyaTracking.booked({...booking,uid:'booking-2'}), false);
  assert.ok(calls.some(c => c[0] === 'consent' && c[1] === 'revoke'));
});
