const form = document.querySelector('#lead-form');
const panels = [...document.querySelectorAll('.form-step')];
const steps = [...document.querySelectorAll('.stepper li')];
const back = document.querySelector('#back');
const next = document.querySelector('#next');
const error = document.querySelector('#form-error');
const otherCheck = document.querySelector('#other-check');
const other = document.querySelector('#other');
const card = document.querySelector('#funnel');
let step = 0, busy = false;
let submissionId = crypto.randomUUID();
const params = new URLSearchParams(location.search);
const attribution = Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].filter(key => params.has(key)).map(key => [key, params.get(key).slice(0, 200)]));
let bookingUrl = '';
const configReady = fetch('/api/config').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(config => { bookingUrl = config.bookingUrl; }).catch(() => {});
function showError(message, focus) {
  error.textContent = message;
  error.hidden = false;
  if (focus) focus.focus();
}
function showStep(value, focus = true) {
  step = value;
  panels.forEach((panel, i) => { panel.hidden = i !== step; });
  steps.forEach((item, i) => {
    item.classList.toggle('active', i === step);
    item.classList.toggle('done', i < step);
    if (i === step) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
  });
  back.hidden = step === 0;
  next.querySelector('span').textContent = step === 3 ? (bookingUrl ? 'Continue to booking' : 'Request an introductory call') : 'Continue';
  error.hidden = true;
  card.setAttribute('aria-labelledby', 'question-title');
  panels.forEach(panel => panel.querySelector('h2').removeAttribute('id'));
  panels[step].querySelector('h2').id = 'question-title';
  if (focus) {
    panels[step].querySelector('h2').focus({ preventScroll: true });
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
otherCheck.addEventListener('change', () => {
  document.querySelector('#other-field').hidden = !otherCheck.checked;
  other.required = otherCheck.checked;
  if (otherCheck.checked) other.focus();
});
form.addEventListener('input', () => { error.hidden = true; });
back.addEventListener('click', () => { if (!busy) showStep(Math.max(0, step - 1)); });
document.querySelector('#custom-cta').addEventListener('click', () => {
  if (form.hidden || busy) { card.scrollIntoView({ behavior: 'smooth' }); return; }
  form.querySelector('input[value="Custom tools & software"]').checked = true;
  showStep(0);
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const data = new FormData(form);
  if (step === 0) {
    if (!data.getAll('services').length) return showError('Choose at least one area you’d like help with.', form.querySelector('[name=services]'));
    if (otherCheck.checked && !other.value.trim()) return showError('Tell us a little about what you have in mind.', other);
  }
  if (step === 1 && !data.get('size')) return showError('Choose your company size to continue.', form.querySelector('[name=size]'));
  if (step === 2 && !data.get('budget')) return showError('Choose a budget, or select “Help me scope it.”', form.querySelector('[name=budget]'));
  if (step < 3) return showStep(step + 1);
  for (const input of panels[3].querySelectorAll('[required]')) {
    if (!input.checkValidity() || (input.type !== 'checkbox' && !input.value.trim())) {
      const message = input.id === 'consent' ? 'Please confirm we can contact you about your enquiry.' : input.id === 'email' ? 'Enter a valid email address.' : `Please enter your ${input.id === 'name' ? 'name' : 'company name'}.`;
      return showError(message, input);
    }
  }
  busy = true;
  next.disabled = back.disabled = true;
  next.querySelector('span').textContent = 'Saving your enquiry…';
  try {
    const response = await fetch('/api/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissionId, services: data.getAll('services'), other: data.get('other'), size: data.get('size'), budget: data.get('budget'), name: data.get('name'), email: data.get('email'), company: data.get('company'), notes: data.get('notes'), website: data.get('website'), consent: data.get('consent') === 'on', attribution }),
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'We couldn’t save your enquiry. Please try again.');
    await configReady;
    form.hidden = true;
    document.querySelector('#booking').hidden = false;
    card.setAttribute('aria-labelledby', 'booking-title');
    steps.forEach(item => { item.classList.add('done'); item.classList.remove('active'); item.removeAttribute('aria-current'); });
    const message = document.querySelector('#booking-message');
    const title = document.querySelector('#booking-title');
    if (bookingUrl) {
      title.textContent = 'Let’s find a time to talk.';
      message.textContent = 'Your enquiry is saved. Choose a time below to confirm your free introductory call with Ilai.';
      const url = new URL(bookingUrl);
      const link = document.querySelector('#booking-link');
      link.href = url.href;
      link.hidden = false;
      if (url.hostname !== 'calendar.app.google') {
        const frame = document.createElement('iframe');
        frame.className = 'scheduler-frame';
        frame.title = 'Book your 15-minute introductory call';
        frame.src = url.href;
        frame.referrerPolicy = 'no-referrer';
        document.querySelector('#scheduler').append(frame);
        link.firstChild.textContent = 'Open booking in a new tab ';
      }
      document.querySelector('#booking-footnote').textContent = 'Your call is confirmed only after you complete the calendar booking.';
    } else {
      title.textContent = 'Thanks. Let’s make a start.';
      message.textContent = 'Your enquiry is saved. Ilai will review what you have in mind.';
      document.querySelector('#booking-fallback').hidden = false;
      document.querySelector('#booking-footnote').textContent = 'This is an enquiry, not a confirmed appointment.';
    }
    title.focus({ preventScroll: true });
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    showError(err.name === 'TimeoutError' ? 'The connection took too long. Please try again; your enquiry won’t be duplicated.' : err.message || 'We couldn’t save your enquiry. Please try again.');
  } finally {
    busy = false;
    next.disabled = back.disabled = false;
    next.querySelector('span').textContent = bookingUrl ? 'Continue to booking' : 'Request an introductory call';
  }
});
showStep(0, false);
