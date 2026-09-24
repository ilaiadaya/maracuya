import http from 'node:http';
import { readFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, timingSafeEqual } from 'node:crypto';

const root = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || join(root, '.data');
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const leadsFile = join(dataDir, 'leads.ndjson');
const services = ['Customer support', 'Internal process optimization', 'Custom tools & software', 'AI training for my team', 'Other'];
const paymentServices = ['Stripe checkout setup', 'Subscriptions & billing', 'Fix or migrate payments', 'Account restriction review', 'Other'];
const paymentModels = ['Upfront project fee', 'Revenue share', 'Help me choose'];
const sizes = ['Just me', '2–10', '11–50', '51–200', '201–1,000', '1,000+'];
const budgets = ['€1,000–€5,000', '€5,000–€10,000', '€10,000–€25,000', '€25,000+', 'Help me scope it'];
const rates = new Map();
const bookingUrl = (() => {
  try {
    const u = new URL(process.env.BOOKING_URL);
    if (u.protocol === 'https:' && ['cal.com', 'calendly.com', 'calendar.google.com', 'calendar.app.google'].includes(u.hostname)) return u.href;
  } catch {}
  return '';
})();
const assets = new Map([
  ['/payments', ['payments.html', 'text/html; charset=utf-8']],
  ['/payments/review', ['payments-review.html', 'text/html; charset=utf-8']],
  ['/payments.css', ['payments.css', 'text/css; charset=utf-8']],
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/lilac', ['lilac.html', 'text/html; charset=utf-8']],
  ['/midnight', ['midnight.html', 'text/html; charset=utf-8']],
  ['/mint', ['mint.html', 'text/html; charset=utf-8']],
  ['/fruit.js', ['fruit.js', 'text/javascript; charset=utf-8']],
  ['/vendor/three.module.min.js', ['vendor/three.module.min.js', 'text/javascript; charset=utf-8']],
  ['/vendor/three.core.min.js', ['vendor/three.core.min.js', 'text/javascript; charset=utf-8']],
  ['/vendor/THREE-LICENSE.txt', ['vendor/THREE-LICENSE.txt', 'text/plain; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/booking.js', ['booking.js', 'text/javascript; charset=utf-8']],
  ['/tracking.js', ['tracking.js', 'text/javascript; charset=utf-8']],
  ['/work', ['work.html', 'text/html; charset=utf-8']],
  ['/favicon.svg', ['favicon.svg', 'image/svg+xml']],
  ['/privacy', ['privacy.html', 'text/html; charset=utf-8']],
]);
const commonHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://app.cal.com https://connect.facebook.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://www.facebook.com; connect-src 'self' https://www.facebook.com https://connect.facebook.net https://app.cal.com; frame-src https://app.cal.com https://cal.com https://calendly.com https://calendar.google.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
};
function reply(res, status, data) {
  res.writeHead(status, { ...commonHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function text(value, max) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function authorized(req) {
  const expected = process.env.LEADS_ADMIN_TOKEN;
  const received = req.headers.authorization?.replace(/^Bearer /, '');
  return expected && received && Buffer.byteLength(expected) === Buffer.byteLength(received) && timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/health') return reply(res, 200, { ok: true });
    if (req.method === 'GET' && url.pathname === '/api/config') return reply(res, 200, { bookingUrl, metaPixelId: /^\d+$/.test(process.env.META_PIXEL_ID || '') ? process.env.META_PIXEL_ID : '' });
    if (req.method === 'GET' && url.pathname === '/api/leads') {
      if (!authorized(req)) return reply(res, 401, { error: 'Unauthorized' });
      res.writeHead(200, { ...commonHeaders, 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-store', 'Content-Disposition': 'attachment; filename="maracuya-enquiries.ndjson"' });
      return res.end(existsSync(leadsFile) ? readFileSync(leadsFile) : '');
    }
    if (req.method === 'POST' && url.pathname === '/api/leads') {
      const origin = req.headers.origin;
      if (origin) {
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        if (new URL(origin).host !== host) return reply(res, 403, { error: 'Invalid origin' });
      }
      if (!req.headers['content-type']?.startsWith('application/json')) return reply(res, 415, { error: 'JSON required' });
      const ip = req.headers['x-real-ip'] || req.socket.remoteAddress;
      const now = Date.now();
      for (const [key, entry] of rates) if (entry.expires < now) rates.delete(key);
      const entry = rates.get(ip) || { count: 0, expires: now + 600_000 };
      if (++entry.count > 15) return reply(res, 429, { error: 'Please wait a few minutes before trying again.' });
      rates.set(ip, entry);
      req.setEncoding('utf8');
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 16_384) return reply(res, 413, { error: 'Submission too large' });
      }
      let body;
      try { body = JSON.parse(raw); } catch { return reply(res, 400, { error: 'Invalid submission' }); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(res, 400, { error: 'Invalid submission' });
      if (body.website) return reply(res, 400, { error: 'Unable to submit this form.' });
      if (body.funnel && !['ai', 'payments'].includes(body.funnel)) return reply(res, 400, { error: 'Invalid enquiry type' });
      const funnel = body.funnel === 'payments' ? 'payments' : 'ai';
      const validServices = funnel === 'payments' ? paymentServices : services;
      const validBudgets = funnel === 'payments' ? paymentModels : budgets;
      const selected = Array.isArray(body.services) ? [...new Set(body.services)] : [];
      const name = text(body.name, 120), email = text(body.email, 254), company = text(body.company, 160), other = text(body.other, 1500);
      if (!selected.length || selected.some(s => !validServices.includes(s)) || !sizes.includes(body.size) || !validBudgets.includes(body.budget) || !name || !company || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.consent !== true || (selected.includes('Other') && !other)) {
        return reply(res, 400, { error: 'Please complete your needs, company size, budget and contact details.' });
      }
      const submissionId = text(body.submissionId, 80);
      if (!/^[a-zA-Z0-9-]{16,80}$/.test(submissionId)) return reply(res, 400, { error: 'Invalid submission ID' });
      // One Railway replica. Acknowledge only after a durable write; retries are idempotent.
      const previous = existsSync(leadsFile) ? readFileSync(leadsFile, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)).find(lead => lead.submissionId === submissionId) : null;
      if (previous) return reply(res, 200, { ok: true, id: previous.id });
      const attribution = {};
      for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
        if (body.attribution?.[key]) attribution[key] = text(body.attribution[key], 200);
      }
      const lead = { id: randomUUID(), submissionId, createdAt: new Date().toISOString(), funnel, landingPath: ['/payments', '/payments/review', '/', '/lilac', '/midnight', '/mint'].includes(body.landingPath) ? body.landingPath : '/', services: selected, other: selected.includes('Other') ? other : '', size: body.size, budget: body.budget, name, email, company, notes: text(body.notes, 2000), consent: true, attribution };
      appendFileSync(leadsFile, JSON.stringify(lead) + '\n', { mode: 0o600, flush: true });
      return reply(res, 201, { ok: true, id: lead.id });
    }
    if (['GET', 'HEAD'].includes(req.method) && /^\/work-images\/[a-z0-9-]+\.webp$/.test(url.pathname) && existsSync(join(root, 'public', url.pathname))) {
      res.writeHead(200, { ...commonHeaders, 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=86400' });
      return res.end(req.method === 'HEAD' ? undefined : readFileSync(join(root, 'public', url.pathname)));
    }
    if (['GET', 'HEAD'].includes(req.method) && assets.has(url.pathname)) {
      const [file, type] = assets.get(url.pathname);
      res.writeHead(200, { ...commonHeaders, 'Content-Type': type, 'Cache-Control': 'no-cache' });
      return res.end(req.method === 'HEAD' ? undefined : readFileSync(join(root, 'public', file)));
    }
    if (req.method === 'GET' && url.pathname === '/robots.txt') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('User-agent: *\nAllow: /\nDisallow: /api/\n');
    }
    reply(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('Request failed:', error.code || error.name);
    if (!res.headersSent) reply(res, 500, { error: 'We could not save your enquiry. Please try again.' });
    else res.end();
  }
});
server.listen(Number(process.env.PORT || 8080), '0.0.0.0', () => console.log('Maracuya Labs listening'));
