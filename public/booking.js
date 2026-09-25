(() => {
  const eventId = Number(document.body.dataset.calEvent || 7193637);
  const calLink = document.body.dataset.calLink || 'ilai-3co4kt/maracuyalabs';
  let mounted = false;
  window.MaracuyaCalendar = {
    mount({ name = '', email = '' } = {}) {
      if (mounted) return;
      mounted = true;
      // Official Cal.com namespace bootstrap, kept in a first-party script for CSP.
      (function (C, A, L) { const p = (a, ar) => a.q.push(ar); const d = C.document; C.Cal = C.Cal || function () { const cal = C.Cal, ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = []; d.head.appendChild(d.createElement('script')).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
      window.Cal('init', 'maracuyalabs', { origin: 'https://app.cal.com' });
      window.Cal.config = window.Cal.config || {};
      window.Cal.config.forwardQueryParams = false;
      const cal = window.Cal.ns.maracuyalabs;
      cal('on', { action: 'bookingSuccessfulV2', callback: event => {
        const data = event.detail?.data;
        if (data?.eventTypeId !== eventId || !data.uid) return;
        const accepted = data.status?.toUpperCase() === 'ACCEPTED' && !data.paymentRequired;
        document.querySelector('#booking-title').textContent = accepted ? 'Your introductory call is booked.' : 'Your booking request is in.';
        document.querySelector('#booking-message').textContent = accepted ? 'Your introductory call is booked. Look out for your calendar invitation and Google Meet link.' : 'Please check your email for confirmation from Cal.com.';
        document.querySelector('#booking-footnote').textContent = accepted ? 'We look forward to meeting you.' : 'Your appointment is awaiting confirmation.';
        window.MaracuyaAnalytics?.capture(accepted ? 'booking_completed' : 'booking_requested', { event_type_id: data.eventTypeId });
        if (accepted) window.MaracuyaTracking?.booked(data);
      }});
      cal('on', { action: 'linkFailed', callback: () => {
        document.querySelector('#booking-footnote').textContent = 'The calendar could not load here. Use “Open booking in a new tab” below.';
      }});
      window.MaracuyaAnalytics?.capture('booking_calendar_opened');
      cal('inline', { elementOrSelector: '#scheduler', calLink, config: { layout: 'month_view', useSlotsViewOnSmallScreen: 'true', theme: 'light', name, email } });
      cal('ui', { hideEventTypeDetails: false, layout: 'month_view', cssVarsPerTheme: { light: { 'cal-brand': '#ee5633' } } });
    }
  };
})();
