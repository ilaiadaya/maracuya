(() => {
  const storageKey = 'maracuya-marketing-consent';
  let consent = null, pixelId = '', initialized = false;
  try { consent = localStorage.getItem(storageKey); } catch {}
  // PostHog funnel analytics: first-party, anonymous id, no names/emails. Sent directly to the ingestion endpoint (no third-party script).
  const idKey = 'maracuya-analytics-id';
  let distinctId = '';
  try { distinctId = localStorage.getItem(idKey) || ''; } catch {}
  if (!distinctId) {
    distinctId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'anon-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
    try { localStorage.setItem(idKey, distinctId); } catch {}
  }
  let posthog = null;
  const search = new URLSearchParams(location.search || '');
  const utm = Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].filter(k => search.has(k)).map(k => [k, search.get(k).slice(0, 200)]));
  function capture(event, properties = {}) {
    if (!posthog) return;
    const body = JSON.stringify({ api_key: posthog.key, event, distinct_id: distinctId, timestamp: new Date().toISOString(), properties: { $current_url: location.href, $pathname: location.pathname || '/', $referrer: (typeof document !== 'undefined' && document.referrer) || '', $lib: 'maracuya-web', funnel: (document.body && document.body.dataset && document.body.dataset.funnel) || 'ai', ...utm, ...properties } });
    try { fetch(posthog.host + '/i/v0/e/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {}); } catch {}
  }
  const queue = [];
  window.MaracuyaAnalytics = { capture: (event, properties) => posthog ? capture(event, properties) : queue.push([event, properties]), distinctId };
  const config = fetch('/api/config').then(r => r.json()).then(c => {
    pixelId = c.metaPixelId || '';
    if (c.posthogKey && c.posthogHost) {
      posthog = { key: c.posthogKey, host: c.posthogHost };
      capture('$pageview');
      while (queue.length) capture(...queue.shift());
    }
    if (consent === 'granted') initialize();
  });
  function initialize() {
    if (initialized || consent !== 'granted' || !/^\d+$/.test(pixelId)) return;
    const fbq = window.fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments); };
    window._fbq = fbq; fbq.push = fbq; fbq.loaded = true; fbq.version = '2.0'; fbq.queue = [];
    fbq('consent', 'grant');
    fbq('set', 'autoConfig', false, pixelId);
    fbq('init', pixelId);
    fbq('track', 'PageView');
    const script = document.createElement('script'); script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js'; document.head.append(script);
    initialized = true;
  }
  const panel = document.createElement('section');
  panel.className = 'cookie-panel'; panel.setAttribute('aria-label', 'Privacy preferences'); panel.hidden = consent !== null;
  const description = document.createElement('p');
  description.textContent = 'May we measure our ads? With your permission, we use the Meta Pixel to understand visits and completed bookings. You can book without accepting.';
  const actions = document.createElement('div');
  function choose(value) {
    consent = value;
    try { localStorage.setItem(storageKey, value); } catch {}
    panel.hidden = true;
    if (value === 'granted') { if (initialized) window.fbq('consent', 'grant'); else initialize(); }
    else {
      if (initialized) window.fbq('consent', 'revoke');
      for (const name of ['_fbp', '_fbc']) for (const domain of ['', location.hostname, '.' + location.hostname]) document.cookie = `${name}=; Max-Age=0; path=/;${domain ? ` domain=${domain};` : ''} SameSite=Lax`;
    }
  }
  for (const [label, value] of [['Decline', 'denied'], ['Allow measurement', 'granted']]) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.addEventListener('click', () => choose(value)); actions.append(button);
  }
  const privacy = document.createElement('a'); privacy.href = '/privacy'; privacy.textContent = 'Privacy notice'; actions.append(privacy);
  panel.append(description, actions); document.body.append(panel);
  document.querySelectorAll('[data-privacy-settings]').forEach(button => button.addEventListener('click', () => { panel.hidden = false; panel.querySelector('button').focus(); }));
  const seen = new Set();
  window.MaracuyaTracking = {
    async booked(data) {
      await config;
      // Only a new, accepted booking for this event counts. Never a lead form, test or reschedule.
      if (consent !== 'granted' || !initialized || data?.status?.toUpperCase() !== 'ACCEPTED' || ![7193637, 7217569].includes(data.eventTypeId) || !data.uid || data.paymentRequired) return false;
      const key = 'maracuya-booked-' + data.uid;
      if (seen.has(key)) return false;
      try { if (sessionStorage.getItem(key)) return false; } catch {}
      window.fbq('trackSingle', pixelId, 'Schedule', { content_name: 'Maracuya Labs introductory call' }, { eventID: 'cal_' + data.uid });
      seen.add(key); try { sessionStorage.setItem(key, '1'); } catch {}
      return true;
    }
  };
})();
