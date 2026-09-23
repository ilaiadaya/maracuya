# Maracuya Labs

AI implementation consulting funnel at https://maracuyalabs.com. Plain HTML/CSS/JS, a dependency-free Node server, and a Railway persistent volume.

## Run and test

```
npm start
npm test
```

Open http://localhost:8080. `PORT` overrides the port. Local submissions go to `.data/leads.ndjson` (gitignored).

## Booking and measurement

The final funnel step embeds https://cal.com/ilai-3co4kt/maracuyalabs using the official Cal.com SDK. The event is 15 minutes with Google Meet. Name/email are prefilled after the enquiry is saved; a new-tab fallback remains available. Availability is managed in Cal.com.

Set `BOOKING_URL` to that event and `META_PIXEL_ID=1705221900551937`. The pixel loads only with the visitor's measurement consent. A standard `Schedule` event is sent only for a new accepted `bookingSuccessfulV2` event from Cal event type 7193637, with booking-UID deduplication. Pending, paid-but-incomplete, rescheduled and dry-run bookings do not count. Form submissions are enquiries, not booking conversions. Bookings completed outside the embedded calendar cannot be measured by this browser callback.

Visitors can revoke measurement in Cookie settings. No form responses or contact details are included in pixel event parameters.

## Leads

Railway volume `/data` is mounted to the service, with `DATA_DIR=/data`. Keep **one replica**: the JSONL store is designed for this small single-instance service. Enquiries survive releases. `LEADS_ADMIN_TOKEN` protects `GET /api/leads` (Bearer authentication); it must never be shipped to the browser. No emails are sent automatically. Check/export enquiries regularly until a notification integration is added.

To export a CSV with your authenticated Railway CLI:

```
python3 scripts/export-leads.py
```

The file is saved to `artifacts/enquiries.csv`, excluded from Git, with owner-only permissions. Treat it as personal data. The form records campaign UTM labels, not ad click identifiers. Meta advertising measurement is optional and controlled through Cookie settings.

## Deployment

GitHub: `ilaiadaya/maracuya`, branch `main`. Railway project `maracuya`, production service `maracuya`. Railway builds `Dockerfile`, uses `PORT=8080`, and checks `/health`. The apex domain was already connected and serving HTTPS before this change.

Required variables: `DATA_DIR=/data`, `LEADS_ADMIN_TOKEN` (secret). Booking: `BOOKING_URL`. Advertising measurement: `META_PIXEL_ID`.

## Validation performed

Automated backend checks cover required fields, consent, malformed requests, request size, origin, idempotency, restart persistence, private export and rate limiting. Browser checks cover multi-select/Other, back navigation, invalid email, save errors and retries, an actual local submission, the real 15-minute Cal.com embed, and overflow at 320/375/390/768/1024/1440px. Consent gating, revocation, accepted-booking filtering, deduplication, product images and mobile overflow are also verified. No real appointment was created during testing.

Ad copy and destination URL: [AD-COPY.md](AD-COPY.md). Campaign launch state is recorded in AD-COPY.md.
