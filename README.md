# Maracuya Labs

AI implementation consulting funnel at https://maracuyalabs.com. Plain HTML/CSS/JS, a dependency-free Node server, and a Railway persistent volume.

## Run and test

```
npm start
npm test
```

Open http://localhost:8080. `PORT` overrides the port. Local submissions go to `.data/leads.ndjson` (gitignored).

## Booking — one remaining setup step

Set `BOOKING_URL` on the Railway `maracuya` service to the actual **15-minute event link**, with Google Calendar connected and Google Meet as its location. Cal.com is recommended; Calendly and Google Calendar appointment schedules are supported too. This is deliberately not set to a fabricated/test booking page.

```
railway variables --set 'BOOKING_URL=https://cal.com/YOUR_ACCOUNT/YOUR_EVENT'
```

Until configured, submissions are saved and visitors are told Ilai will contact them. They also get an email link. The site never claims an appointment is confirmed. Once configured, the final step loads the scheduler and includes a new-tab fallback. Google short booking links open in a new tab. A booking remains subject to the provider's confirmation. Check a real booking after connecting your calendar.

Suggested setup: 15 minutes, Europe/Berlin, Google Meet, 10-minute buffer, one day's minimum notice, and only the hours you want to offer. Confirm these settings in your scheduler; they are not configured by this repository.

## Leads

Railway volume `/data` is mounted to the service, with `DATA_DIR=/data`. Keep **one replica**: the JSONL store is designed for this small single-instance service. Enquiries survive releases. `LEADS_ADMIN_TOKEN` protects `GET /api/leads` (Bearer authentication); it must never be shipped to the browser. No emails are sent automatically. Check/export enquiries regularly until a notification integration is added.

To export a CSV with your authenticated Railway CLI:

```
python3 scripts/export-leads.py
```

The file is saved to `artifacts/enquiries.csv`, excluded from Git, with owner-only permissions. Treat it as personal data. The form records campaign UTM labels, not ad click identifiers. No Meta pixel or advertising cookies are installed.

## Deployment

GitHub: `ilaiadaya/maracuya`, branch `main`. Railway project `maracuya`, production service `maracuya`. Railway builds `Dockerfile`, uses `PORT=8080`, and checks `/health`. The apex domain was already connected and serving HTTPS before this change.

Required variables: `DATA_DIR=/data`, `LEADS_ADMIN_TOKEN` (secret). Optional: `BOOKING_URL`.

## Validation performed

Automated backend checks cover required fields, consent, malformed requests, request size, origin, idempotency, restart persistence, private export and rate limiting. Browser checks cover multi-select/Other, back navigation, invalid email, save errors and retries, an actual local submission, a mocked scheduler handoff, and overflow at 320/375/390/768/1024/1440px. Live calendar booking requires the owner's real link.

Ad copy and destination URL: [AD-COPY.md](AD-COPY.md). No campaign has been published or budget spent.
